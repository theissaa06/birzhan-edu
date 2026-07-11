const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwt");
const { authMiddleware } = require("../middleware/auth.middleware");
const { verifyTurnstile } = require("../utils/verifyTurnstile");
const { sendPasswordResetEmail } = require("../utils/mailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_CODE_RE = /^\d{6}$/;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_GENERIC_MESSAGE =
  "Если этот email зарегистрирован, мы отправили код восстановления.";

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Слишком много попыток регистрации. Подожди 15 минут и попробуй снова.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Слишком много попыток входа. Подожди 10 минут и попробуй снова.",
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Слишком много запросов восстановления. Подожди 15 минут.",
  },
});

function getClientIp(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip
  );
}

function generateResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashResetCode(userId, code) {
  return crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

async function findActiveResetToken(userId) {
  return prisma.passwordResetToken.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function registerFailedResetAttempt(resetToken) {
  const attempts = resetToken.attempts + 1;
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: {
      attempts,
      usedAt: attempts >= RESET_CODE_MAX_ATTEMPTS ? new Date() : undefined,
    },
  });
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    badges: Array.isArray(user.badges) ? user.badges : [],
    blockedAt: user.blockedAt || null,
    blockedUntil: user.blockedUntil || null,
    blockedReason: user.blockedReason || null,
    isPremium: Boolean(user.premiumUntil && new Date(user.premiumUntil) > new Date()),
    premiumPlan: user.premiumPlan || null,
    premiumUntil: user.premiumUntil || null,
  };
}

function isUserBlocked(user, now = new Date()) {
  if (!user?.blockedAt) return false;
  if (!user.blockedUntil) return true;
  return new Date(user.blockedUntil) > now;
}

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { username, name, email, password, phone, turnstileToken } =
      req.body || {};

    const finalUsername = String(username || name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    const cleanPhone = phone ? String(phone).trim() : null;

    if (!finalUsername || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Заполните имя, email и пароль.",
      });
    }

    if (finalUsername.length < 2 || finalUsername.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Имя пользователя должно быть от 2 до 50 символов.",
      });
    }

    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Введите корректный email.",
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Пароль должен быть минимум 6 символов.",
      });
    }

    const turnstileResult = await verifyTurnstile(
      turnstileToken,
      getClientIp(req),
    );

    if (!turnstileResult.success) {
      return res.status(403).json({
        success: false,
        message:
          "Проверка безопасности не пройдена. Обновите страницу и попробуйте ещё раз.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Этот email уже используется.",
      });
    }

    const hashed = await bcrypt.hash(cleanPassword, 10);

    const user = await prisma.user.create({
      data: {
        username: finalUsername,
        email: cleanEmail,
        password: hashed,
        phone: cleanPhone,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    });

    return res.status(201).json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (e) {
    console.error("[Auth] Ошибка регистрации", {
      error: e?.message || e,
      email: req.body?.email,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при регистрации.",
    });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Введите email и пароль.",
      });
    }

    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Введите корректный email.",
      });
    }

    const turnstileResult = await verifyTurnstile(
      turnstileToken,
      getClientIp(req),
    );

    if (!turnstileResult.success) {
      return res.status(403).json({
        success: false,
        message:
          "Проверка безопасности не пройдена. Обновите страницу и попробуйте ещё раз.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Неверный email или пароль.",
      });
    }

    const valid = await bcrypt.compare(cleanPassword, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Неверный email или пароль.",
      });
    }

    if (isUserBlocked(user)) {
      return res.status(403).json({
        success: false,
        message: user.blockedUntil
          ? `Аккаунт заблокирован до ${new Date(user.blockedUntil).toLocaleString("ru-RU")}.`
          : "Аккаунт заблокирован.",
        blocked: true,
        blockedUntil: user.blockedUntil,
        reason: user.blockedReason || null,
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    });

    return res.json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (e) {
    console.error("[Auth] Ошибка входа", {
      error: e?.message || e,
      email: req.body?.email,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при входе.",
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        badges: true,
        blockedAt: true,
        blockedUntil: true,
        blockedReason: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
        createdAt: true,
        lessonProgress: {
          select: {
            id: true,
            lessonId: true,
            courseId: true,
            started: true,
            completed: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден.",
      });
    }

    return res.json({
      success: true,
      user: publicUser(user),
      data: user,
    });
  } catch (e) {
    console.error("[Auth] Ошибка /me", {
      error: e?.message || e,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при загрузке профиля.",
    });
  }
});

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Введите корректный email.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.json({ success: true, message: RESET_GENERIC_MESSAGE });
    }

    const resetCode = generateResetCode();
    const tokenHash = hashResetCode(user.id, resetCode);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    const resetToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    try {
      await sendPasswordResetEmail({ to: user.email, code: resetCode });
    } catch (emailError) {
      console.error("[Auth] Ошибка отправки password reset email", {
        error: emailError?.message || emailError,
        code: emailError?.code,
        userId: user.id,
      });

      if (process.env.NODE_ENV === "production") {
        await prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        });

        return res.status(503).json({
          success: false,
          message: "Почтовый сервис временно недоступен. Попробуйте позже.",
        });
      }

      return res.json({
        success: true,
        message:
          "Письмо не отправлено, но dev-код создан. Настройте SMTP для production.",
        resetCode,
      });
    }

    return res.json({ success: true, message: RESET_GENERIC_MESSAGE });
  } catch (error) {
    console.error("[Auth] Ошибка forgot-password", {
      error: error?.message || error,
      email: req.body?.email,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка восстановления пароля.",
    });
  }
});

router.post("/verify-reset-code", passwordResetLimiter, async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || !RESET_CODE_RE.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Введите email и 6-значный код.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    const resetToken = await findActiveResetToken(user.id);
    if (!resetToken || resetToken.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    if (resetToken.tokenHash !== hashResetCode(user.id, code)) {
      await registerFailedResetAttempt(resetToken);
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    return res.json({
      success: true,
      message: "Код подтверждён. Задайте новый пароль.",
    });
  } catch (error) {
    console.error("[Auth] Ошибка verify-reset-code", {
      error: error?.message || error,
      email: req.body?.email,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка проверки кода восстановления.",
    });
  }
});

router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || req.body?.newPassword || "");

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || !RESET_CODE_RE.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Введите email и 6-значный код.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Новый пароль должен быть минимум 8 символов.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    const resetToken = await findActiveResetToken(user.id);
    if (!resetToken || resetToken.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    if (resetToken.tokenHash !== hashResetCode(user.id, code)) {
      await registerFailedResetAttempt(resetToken);
      return res.status(400).json({
        success: false,
        message: "Код недействителен или истёк.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
    });

    return res.json({
      success: true,
      message: "Пароль обновлён. Войдите заново.",
    });
  } catch (error) {
    console.error("[Auth] Ошибка reset-password", {
      error: error?.message || error,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка сброса пароля.",
    });
  }
});

module.exports = router;
