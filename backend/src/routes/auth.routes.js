const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwt");
const { authMiddleware } = require("../middleware/auth.middleware");
const { verifyTurnstile } = require("../utils/verifyTurnstile");

// ── Anti-spam лимиты ──────────────────────────────
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

function getClientIp(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip
  );
}

// ── REGISTER ──────────────────────────────────────
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { username, name, email, password, phone, turnstileToken } = req.body;

    const finalUsername = username || name;
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!finalUsername || !cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Заполните все поля",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Пароль должен быть минимум 6 символов",
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
          "Проверка безопасности не пройдена. Обнови страницу и попробуй ещё раз.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email уже используется",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: finalUsername.trim(),
        email: cleanEmail,
        password: hashed,
        phone,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("Ошибка регистрации:", e);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
      error: e.message,
    });
  }
});

// ── LOGIN ─────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Введите email и пароль",
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
          "Проверка безопасности не пройдена. Обнови страницу и попробуй ещё раз.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("Ошибка входа:", e);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

// ── ME ────────────────────────────────────────────
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
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      user,
    });
  } catch (e) {
    console.error("Ошибка /me:", e);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

module.exports = router;
