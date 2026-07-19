const bcrypt = require("bcryptjs");
const multer = require("multer");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesFromUser, highestRole } = require("../utils/access");
const { getPremiumAccess } = require("../services/premium.service");
const { writeAudit } = require("../utils/audit");
const {
  AVATAR_PRESETS,
  avatarData,
  normalizeUploadedAvatar,
  presetById,
  renderAvatarSvg,
} = require("../services/avatar.service");

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      return callback(Object.assign(new Error("Поддерживаются только изображения JPG, PNG и WEBP."), { code: "AVATAR_TYPE_INVALID" }));
    }
    return callback(null, true);
  },
});

function avatarUpload(req, res, next) {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      code: tooLarge ? "AVATAR_TOO_LARGE" : error.code || "AVATAR_UPLOAD_INVALID",
      message: tooLarge ? "Файл должен быть не больше 5 МБ." : error.message || "Не удалось прочитать файл изображения.",
    });
  });
}

const profileSelect = {
  id: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  badges: true,
  accountStatus: true,
  isPhoneVerified: true,
  premiumPlan: true,
  premiumStarted: true,
  premiumUntil: true,
  createdAt: true,
  updatedAt: true,
  lessonProgress: true,
  roles: { select: { role: true, grantedAt: true } },
  oauthIdentities: { select: { provider: true, createdAt: true } },
  avatar: { select: { kind: true, presetId: true, updatedAt: true } },
};

function serializeProfile(user, premium) {
  const roles = rolesFromUser(user);
  return {
    ...user,
    password: undefined,
    roles,
    primaryRole: highestRole(roles),
    badges: roles,
    isPremium: Boolean(premium?.active),
    premiumStatus: premium?.status || "free",
    premiumUntil: premium?.paidUntil || null,
    graceUntil: premium?.graceUntil || null,
    ...avatarData(user),
  };
}

router.get("/public", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        bansReceived: { none: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        username: true,
        createdAt: true,
        avatar: { select: { kind: true, presetId: true, updatedAt: true } },
        roles: { select: { role: true } },
        certificates: { where: { status: "ACTIVE" }, select: { id: true } },
        assignmentSubmissions: { where: { isPublic: true }, select: { id: true } },
      },
    });
    return res.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        roles: rolesFromUser(user),
        certificateCount: user.certificates.length,
        publicWorkCount: user.assignmentSubmissions.length,
        createdAt: user.createdAt,
        ...avatarData(user),
      })),
    });
  } catch (error) {
    console.error("[Users] Public list failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "USERS_LOAD_FAILED", message: "Не удалось загрузить участников." });
  }
});

router.get("/avatar-presets", (_req, res) => {
  return res.json({
    success: true,
    data: AVATAR_PRESETS.map(({ id, label }) => ({ id, label, avatarUrl: `/api/users/avatar-presets/${id}` })),
  });
});

router.get("/avatar-presets/:presetId", (req, res) => {
  const presetId = String(req.params.presetId || "");
  const svg = renderAvatarSvg({ username: "Frame School", presetId });
  if (!svg) return res.status(404).json({ success: false, code: "AVATAR_PRESET_NOT_FOUND", message: "Стандартный аватар не найден." });
  res.set({ "Cache-Control": "public, max-age=31536000, immutable", "Content-Type": "image/svg+xml; charset=utf-8" });
  return res.send(svg);
});

router.get("/:id/avatar", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "Некорректный ID пользователя." });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, accountStatus: true, avatar: true },
    });
    if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
    if (user.accountStatus === "DEACTIVATED") user.avatar = null;

    if (user.avatar?.kind === "UPLOAD" && user.avatar.imageData && user.avatar.mimeType === "image/webp") {
      res.set({ "Cache-Control": "public, max-age=86400", "Content-Type": "image/webp" });
      return res.send(Buffer.from(user.avatar.imageData));
    }

    const svg = renderAvatarSvg({ username: user.accountStatus === "DEACTIVATED" ? "Frame User" : user.username, avatar: user.avatar });
    res.set({ "Cache-Control": "public, max-age=86400", "Content-Type": "image/svg+xml; charset=utf-8" });
    return res.send(svg);
  } catch (error) {
    console.error("[Users] Avatar load failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "AVATAR_LOAD_FAILED", message: "Не удалось загрузить аватар." });
  }
});

router.post("/me/avatar", authMiddleware, avatarUpload, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, code: "AVATAR_FILE_REQUIRED", message: "Выберите файл изображения." });
    }
    const normalized = await normalizeUploadedAvatar(req.file.buffer);
    const avatar = await prisma.$transaction(async (tx) => {
      const previous = await tx.userAvatar.findUnique({ where: { userId: req.user.id }, select: { kind: true, presetId: true } });
      const saved = await tx.userAvatar.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, kind: "UPLOAD", presetId: null, ...normalized },
        update: { kind: "UPLOAD", presetId: null, ...normalized },
        select: { kind: true, presetId: true, updatedAt: true },
      });
      await writeAudit(tx, {
        req,
        action: "account.avatar_uploaded",
        entityType: "UserAvatar",
        entityId: req.user.id,
        targetUserId: req.user.id,
        before: previous || undefined,
        after: { kind: saved.kind, mimeType: normalized.mimeType, bytes: normalized.imageData.length },
      });
      return saved;
    });
    return res.json({ success: true, data: avatarData({ id: req.user.id, avatar }), message: "Фотография профиля сохранена." });
  } catch (error) {
    const expected = ["AVATAR_FILE_REQUIRED", "AVATAR_TYPE_INVALID", "AVATAR_OPTIMIZE_FAILED"].includes(error?.code);
    console.error("[Users] Avatar upload failed", expected ? error.message : error?.stack || error);
    return res.status(expected ? 400 : 500).json({
      success: false,
      code: expected ? error.code : "AVATAR_SAVE_FAILED",
      message: expected ? error.message : "Не удалось сохранить фотографию профиля.",
    });
  }
});

router.post("/me/avatar/preset", authMiddleware, async (req, res) => {
  const presetId = String(req.body?.presetId || "").trim();
  if (!presetById.has(presetId)) {
    return res.status(400).json({ success: false, code: "AVATAR_PRESET_INVALID", message: "Выберите стандартный аватар из списка." });
  }
  try {
    const avatar = await prisma.$transaction(async (tx) => {
      const previous = await tx.userAvatar.findUnique({ where: { userId: req.user.id }, select: { kind: true, presetId: true } });
      const saved = await tx.userAvatar.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, kind: "PRESET", presetId },
        update: { kind: "PRESET", presetId, imageData: null, mimeType: null },
        select: { kind: true, presetId: true, updatedAt: true },
      });
      await writeAudit(tx, {
        req,
        action: "account.avatar_preset_changed",
        entityType: "UserAvatar",
        entityId: req.user.id,
        targetUserId: req.user.id,
        before: previous || undefined,
        after: { kind: saved.kind, presetId },
      });
      return saved;
    });
    return res.json({ success: true, data: avatarData({ id: req.user.id, avatar }), message: "Стандартный аватар сохранён." });
  } catch (error) {
    console.error("[Users] Avatar preset save failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "AVATAR_SAVE_FAILED", message: "Не удалось сохранить стандартный аватар." });
  }
});

router.delete("/me/avatar", authMiddleware, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const previous = await tx.userAvatar.findUnique({ where: { userId: req.user.id }, select: { kind: true, presetId: true } });
      if (previous) await tx.userAvatar.delete({ where: { userId: req.user.id } });
      await writeAudit(tx, {
        req,
        action: "account.avatar_reset",
        entityType: "UserAvatar",
        entityId: req.user.id,
        targetUserId: req.user.id,
        before: previous || undefined,
        after: { kind: "INITIALS" },
      });
    });
    return res.json({ success: true, data: avatarData({ id: req.user.id, avatar: null }), message: "Аватар сброшен до инициалов." });
  } catch (error) {
    console.error("[Users] Avatar reset failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "AVATAR_RESET_FAILED", message: "Не удалось сбросить аватар." });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  const [user, premium] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: profileSelect }),
    getPremiumAccess(req.user.id),
  ]);
  if (!user) {
    return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  }
  const data = serializeProfile(user, premium);
  return res.json({ success: true, data, user: data });
});

router.post("/me/password", authMiddleware, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ success: false, code: "PASSWORD_WEAK", message: "Новый пароль должен содержать от 8 до 128 символов." });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, password: true, oauthIdentities: { select: { id: true } } },
  });
  if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  if (user.password && !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(403).json({ success: false, code: "PASSWORD_INCORRECT", message: "Текущий пароль указан неверно." });
  }
  const password = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { password, sessionVersion: { increment: 1 } } });
    await writeAudit(tx, { req, action: "account.password_changed", entityType: "User", entityId: user.id, targetUserId: user.id });
  });
  return res.json({ success: true, message: "Пароль обновлён. Войдите снова." });
});

router.post("/me/deactivate", authMiddleware, async (req, res) => {
  const password = String(req.body?.password || "");
  const confirmation = String(req.body?.confirmation || "").toUpperCase();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, password: true, accountStatus: true, roles: { select: { role: true } } },
  });
  if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  if (rolesFromUser(user).includes("OWNER")) {
    return res.status(409).json({ success: false, code: "OWNER_DEACTIVATION_FORBIDDEN", message: "Сначала передайте роль Owner другому аккаунту через защищённый сценарий." });
  }
  if (user.password) {
    if (!password || !(await bcrypt.compare(password, user.password))) {
      return res.status(403).json({ success: false, code: "PASSWORD_INCORRECT", message: "Подтвердите действие текущим паролем." });
    }
  } else if (confirmation !== "DEACTIVATE") {
    return res.status(400).json({ success: false, code: "CONFIRMATION_REQUIRED", message: "Для OAuth-аккаунта введите DEACTIVATE в поле подтверждения." });
  }

  const deactivatedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { accountStatus: "DEACTIVATED", deactivatedAt, sessionVersion: { increment: 1 } },
    });
    await writeAudit(tx, { req, action: "account.deactivated", entityType: "User", entityId: user.id, targetUserId: user.id });
  });
  return res.json({
    success: true,
    code: "ACCOUNT_DEACTIVATED",
    message: "Аккаунт деактивирован. Прогресс и сертификаты сохранены.",
    deactivatedAt,
  });
});

module.exports = router;
