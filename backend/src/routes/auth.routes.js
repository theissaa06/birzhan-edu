const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwt");
const { authMiddleware } = require("../middleware/auth.middleware");
const { verifyTurnstile } = require("../utils/verifyTurnstile");
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require("../utils/mailer");
const { rolesFromUser, highestRole } = require("../utils/access");
const { getPremiumAccess } = require("../services/premium.service");
const { writeAudit, clientIp } = require("../utils/audit");
const { avatarData } = require("../services/avatar.service");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_CODE_RE = /^\d{6}$/;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;
const ALLOW_DEV_RESET_CODE = process.env.NODE_ENV !== "production" && process.env.AUTH_ALLOW_DEV_RESET_CODE === "true";

function limiter(windowMs, max, code, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code, message },
  });
}

const registerLimiter = limiter(15 * 60 * 1000, 5, "REGISTER_RATE_LIMIT", "Слишком много попыток регистрации. Повторите через 15 минут.");
const loginLimiter = limiter(10 * 60 * 1000, 8, "LOGIN_RATE_LIMIT", "Слишком много попыток входа. Повторите через 10 минут.");
const resetLimiter = limiter(15 * 60 * 1000, 5, "RESET_RATE_LIMIT", "Слишком много запросов восстановления. Повторите через 15 минут.");

function apiError(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra });
}

async function verifyChallenge(req, res) {
  const result = await verifyTurnstile(req.body?.turnstileToken, clientIp(req));
  if (result.success) return true;
  apiError(
    res,
    result.reason === "missing-secret" ? 503 : 403,
    result.reason === "missing-secret" ? "TURNSTILE_NOT_CONFIGURED" : "TURNSTILE_FAILED",
    result.reason === "missing-secret"
      ? "Проверка безопасности временно не настроена."
      : "Проверка безопасности не пройдена. Обновите страницу и попробуйте снова.",
  );
  return false;
}

function generateResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashResetCode(userId, code) {
  return crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

async function activeResetToken(userId) {
  return prisma.passwordResetToken.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

async function failResetAttempt(token) {
  const attempts = token.attempts + 1;
  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: { attempts, usedAt: attempts >= RESET_CODE_MAX_ATTEMPTS ? new Date() : undefined },
  });
}

function activeBan(user) {
  const ban = user.bansReceived?.[0];
  return ban && ban.status === "ACTIVE" && (!ban.endsAt || new Date(ban.endsAt) > new Date()) ? ban : null;
}

async function publicUser(user) {
  const roles = rolesFromUser(user);
  const premium = await getPremiumAccess(user.id);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
    role: roles.length ? "ADMIN" : "USER",
    roles,
    badges: roles,
    primaryRole: highestRole(roles),
    accountStatus: user.accountStatus,
    isPremium: Boolean(premium?.active),
    premiumStatus: premium?.status || "free",
    premiumPlan: premium?.plan || null,
    premiumUntil: premium?.paidUntil || null,
    graceUntil: premium?.graceUntil || null,
    ...avatarData(user),
  };
}

const authUserInclude = {
  roles: { select: { role: true } },
  bansReceived: { where: { status: "ACTIVE" }, orderBy: { startsAt: "desc" }, take: 1 },
  oauthIdentities: { select: { provider: true } },
  avatar: { select: { kind: true, presetId: true, updatedAt: true } },
};

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const phone = String(req.body?.phone || "").trim().slice(0, 40) || null;
    if (username.length < 2 || username.length > 50) return apiError(res, 400, "USERNAME_INVALID", "Имя должно содержать от 2 до 50 символов.");
    if (!EMAIL_RE.test(email)) return apiError(res, 400, "EMAIL_INVALID", "Введите корректный email.");
    if (password.length < 8 || password.length > 128) return apiError(res, 400, "PASSWORD_WEAK", "Пароль должен содержать от 8 до 128 символов.");
    if (!(await verifyChallenge(req, res))) return;
    if (await prisma.user.findUnique({ where: { email } })) return apiError(res, 409, "EMAIL_ALREADY_USED", "Этот email уже используется.");

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: await bcrypt.hash(password, 12),
        phone,
        notifications: {
          create: { type: "welcome", title: "Добро пожаловать в Frame School", message: "Ваш профиль готов. Выберите курс и начните первую дорожку.", link: "/courses" },
        },
      },
      include: authUserInclude,
    });
    const token = generateToken({ id: user.id, email: user.email, sessionVersion: user.sessionVersion });
    return res.status(201).json({ success: true, token, user: await publicUser(user) });
  } catch (error) {
    console.error("[Auth] Registration failed", error?.stack || error);
    return apiError(res, 500, "REGISTER_FAILED", "Не удалось создать аккаунт.");
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!EMAIL_RE.test(email) || !password) return apiError(res, 400, "LOGIN_INPUT_INVALID", "Введите email и пароль.");
    if (!(await verifyChallenge(req, res))) return;
    const user = await prisma.user.findUnique({ where: { email }, include: authUserInclude });
    if (!user) return apiError(res, 401, "LOGIN_INVALID", "Неверный email или пароль.");
    if (user.accountStatus === "DEACTIVATED") {
      return apiError(res, 403, "ACCOUNT_DEACTIVATED", "Аккаунт деактивирован. Вы можете восстановить его без потери данных.", { canReactivate: Boolean(user.password), oauthProviders: user.oauthIdentities.map((entry) => entry.provider) });
    }
    if (!user.password) {
      return apiError(res, 409, "PASSWORD_LOGIN_UNAVAILABLE", "Для этого аккаунта используйте подключённый способ входа.", { oauthProviders: user.oauthIdentities.map((entry) => entry.provider) });
    }
    if (!(await bcrypt.compare(password, user.password))) return apiError(res, 401, "LOGIN_INVALID", "Неверный email или пароль.");
    const ban = activeBan(user);
    if (ban) return apiError(res, 403, "ACCOUNT_BANNED", "Аккаунт заблокирован.", { reason: ban.reason, bannedUntil: ban.endsAt });
    const token = generateToken({ id: user.id, email: user.email, sessionVersion: user.sessionVersion });
    return res.json({ success: true, token, user: await publicUser(user) });
  } catch (error) {
    console.error("[Auth] Login failed", error?.stack || error);
    return apiError(res, 500, "LOGIN_FAILED", "Сервис входа временно недоступен.");
  }
});

router.post("/reactivate", loginLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!EMAIL_RE.test(email) || !password) return apiError(res, 400, "REACTIVATION_INPUT_INVALID", "Введите email и пароль.");
  if (!(await verifyChallenge(req, res))) return;
  const user = await prisma.user.findUnique({ where: { email }, include: authUserInclude });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) return apiError(res, 401, "REACTIVATION_INVALID", "Не удалось подтвердить аккаунт.");
  if (user.accountStatus !== "DEACTIVATED") return apiError(res, 409, "ACCOUNT_ALREADY_ACTIVE", "Аккаунт уже активен.");
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({ where: { id: user.id }, data: { accountStatus: "ACTIVE", deactivatedAt: null, sessionVersion: { increment: 1 } }, include: authUserInclude });
    await tx.notification.create({ data: { userId: user.id, type: "account", title: "С возвращением", message: "Аккаунт восстановлен вместе с прогрессом и сертификатами.", link: "/profile" } });
    await writeAudit(tx, { req, actorId: user.id, targetUserId: user.id, action: "account.reactivated", entityType: "User", entityId: user.id });
    return next;
  });
  const token = generateToken({ id: updated.id, email: updated.email, sessionVersion: updated.sessionVersion });
  return res.json({ success: true, token, user: await publicUser(updated), message: "Аккаунт восстановлен." });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      ...authUserInclude,
      lessonProgress: { select: { id: true, lessonId: true, courseId: true, started: true, completed: true, startedAt: true, completedAt: true } },
    },
  });
  if (!user) return apiError(res, 404, "USER_NOT_FOUND", "Пользователь не найден.");
  const serialized = await publicUser(user);
  return res.json({ success: true, user: { ...serialized, lessonProgress: user.lessonProgress }, data: { ...serialized, lessonProgress: user.lessonProgress } });
});

router.post("/forgot-password", resetLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return apiError(res, 400, "EMAIL_INVALID", "Введите корректный email.");
  if (!(await verifyChallenge(req, res))) return;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, password: true, oauthIdentities: { select: { provider: true } } } });
  if (!user) return apiError(res, 404, "EMAIL_NOT_REGISTERED", "Аккаунт с таким email не найден.");
  if (!user.password) return apiError(res, 409, "PASSWORD_RESET_OAUTH_ONLY", "Для этого аккаунта пароль не задан. Войдите через подключённый сервис.", { oauthProviders: user.oauthIdentities.map((entry) => entry.provider) });
  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
  const resetToken = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    return tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashResetCode(user.id, code), expiresAt } });
  });
  try {
    await sendPasswordResetEmail({ to: user.email, code });
  } catch (error) {
    console.error("[Auth] Reset email failed", { code: error?.code, message: error?.message, userId: user.id });
    if (!ALLOW_DEV_RESET_CODE) {
      await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
      return apiError(res, 503, "RESET_EMAIL_UNAVAILABLE", "Почтовый сервис временно недоступен. Повторите позже.");
    }
    return res.json({ success: true, message: "Dev-код создан; SMTP не настроен.", resetCode: code, expiresAt });
  }
  return res.json({ success: true, message: "Код восстановления отправлен на email.", expiresAt });
});

async function verifyResetInput(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();
  if (!EMAIL_RE.test(email) || !RESET_CODE_RE.test(code)) {
    apiError(res, 400, "RESET_INPUT_INVALID", "Введите email и шестизначный код.");
    return null;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) { apiError(res, 400, "RESET_CODE_INVALID", "Код недействителен или истёк."); return null; }
  const token = await activeResetToken(user.id);
  if (!token || token.attempts >= RESET_CODE_MAX_ATTEMPTS) { apiError(res, 400, "RESET_CODE_EXPIRED", "Код недействителен или истёк."); return null; }
  if (token.tokenHash !== hashResetCode(user.id, code)) {
    await failResetAttempt(token);
    apiError(res, 400, "RESET_CODE_INVALID", "Код недействителен или истёк.");
    return null;
  }
  return { user, token };
}

router.post("/verify-reset-code", resetLimiter, async (req, res) => {
  const verified = await verifyResetInput(req, res);
  if (!verified) return;
  return res.json({ success: true, message: "Код подтверждён." });
});

router.post("/reset-password", resetLimiter, async (req, res) => {
  const password = String(req.body?.password || req.body?.newPassword || "");
  if (password.length < 8 || password.length > 128) return apiError(res, 400, "PASSWORD_WEAK", "Пароль должен содержать от 8 до 128 символов.");
  const verified = await verifyResetInput(req, res);
  if (!verified) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: verified.user.id }, data: { password: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.updateMany({ where: { userId: verified.user.id, usedAt: null }, data: { usedAt: new Date() } });
    await writeAudit(tx, { req, actorId: verified.user.id, targetUserId: verified.user.id, action: "account.password_reset", entityType: "User", entityId: verified.user.id });
  });
  let emailNotified = true;
  try { await sendPasswordChangedEmail({ to: verified.user.email }); } catch (error) { emailNotified = false; console.error("[Auth] Password change email failed", error?.message || error); }
  return res.json({ success: true, emailNotified, message: "Пароль обновлён. Все прежние сессии завершены." });
});

module.exports = router;
