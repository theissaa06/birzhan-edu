const bcrypt = require("bcryptjs");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesFromUser, highestRole } = require("../utils/access");
const { getPremiumAccess } = require("../services/premium.service");
const { writeAudit } = require("../utils/audit");

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
      })),
    });
  } catch (error) {
    console.error("[Users] Public list failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "USERS_LOAD_FAILED", message: "Не удалось загрузить участников." });
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
