const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

const ALLOWED_BADGES = new Set(["PREMIUM", "ADMIN", "OWNER", "DEVELOPER"]);
const PROTECTED_BADGES = new Set(["OWNER", "DEVELOPER"]);

function normalizeBadges(input) {
  const list = Array.isArray(input) ? input : [];
  return [...new Set(
    list
      .map((badge) => String(badge).trim().toUpperCase())
      .filter((badge) => ALLOWED_BADGES.has(badge)),
  )];
}

function hasProtectedBadge(user) {
  const badges = Array.isArray(user?.badges) ? user.badges : [];
  return badges.some((badge) => PROTECTED_BADGES.has(String(badge).toUpperCase()));
}

function roleFromBadges(badges, fallbackRole = "USER") {
  return badges.some((badge) => ["ADMIN", "OWNER", "DEVELOPER"].includes(badge))
    ? "ADMIN"
    : fallbackRole === "ADMIN"
      ? "ADMIN"
      : "USER";
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBlockUntil(body = {}) {
  const duration = String(body.duration || "").trim().toLowerCase();
  const amount = Number(body.amount || body.days || 0);

  if (duration === "forever" || body.forever === true) return null;

  const daysByDuration = {
    day: 1,
    days: Number.isFinite(amount) && amount > 0 ? amount : 1,
    week: 7,
    weeks: Number.isFinite(amount) && amount > 0 ? amount * 7 : 7,
    month: 30,
    months: Number.isFinite(amount) && amount > 0 ? amount * 30 : 30,
  };

  const days =
    Number.isFinite(amount) && amount > 0 && !duration
      ? amount
      : daysByDuration[duration];

  if (!days || days <= 0) return new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const userSelect = {
  id: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  badges: true,
  blockedAt: true,
  blockedUntil: true,
  blockedReason: true,
  blockedById: true,
  premiumPlan: true,
  premiumStarted: true,
  premiumUntil: true,
  isPhoneVerified: true,
  createdAt: true,
  updatedAt: true,
  lessonProgress: true,
  userBonuses: true,
  supportMessages: true,
};

const publicUserSelect = {
  id: true,
  username: true,
  role: true,
  badges: true,
  premiumUntil: true,
  createdAt: true,
};

router.get("/public", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { blockedAt: null },
      orderBy: { createdAt: "asc" },
      select: publicUserSelect,
    });

    return res.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        isPremium: Boolean(
          user.premiumUntil && new Date(user.premiumUntil) > new Date(),
        ),
      })),
    });
  } catch (error) {
    console.error("[Users] Ошибка публичного списка", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      message: "Не удалось загрузить список пользователей.",
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
        isPhoneVerified: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
        createdAt: true,
        updatedAt: true,
        lessonProgress: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    return res.json({
      success: true,
      data: user,
      user,
    });
  } catch (e) {
    console.error("[Users] Ошибка /me", {
      error: e?.message || e,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки профиля",
    });
  }
});

router.use(authMiddleware, adminMiddleware);

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
      select: userSelect,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки пользователей",
      error: e.message,
    });
  }
});

router.patch("/:id/role", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const { role } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Роль должна быть USER или ADMIN",
      });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, badges: true },
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (hasProtectedBadge(target) && req.user.id !== target.id) {
      return res.status(403).json({
        success: false,
        message: "Роль владельца или разработчика нельзя изменить чужим админом.",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });

    res.json({
      success: true,
      message: "Роль пользователя обновлена",
      data: user,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка изменения роли",
      error: e.message,
    });
  }
});

router.patch("/:id/badges", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, badges: true },
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (hasProtectedBadge(target) && req.user.id !== target.id) {
      return res.status(403).json({
        success: false,
        message: "Значки владельца или разработчика нельзя менять чужим админом.",
      });
    }

    const badges = normalizeBadges(req.body?.badges);
    const role = roleFromBadges(badges, target.role);

    const user = await prisma.user.update({
      where: { id },
      data: { badges, role },
      select: userSelect,
    });

    return res.json({
      success: true,
      message: "Значки пользователя обновлены",
      data: user,
    });
  } catch (e) {
    console.error("[Users] Ошибка изменения значков", {
      error: e?.message || e,
      targetUserId: req.params.id,
      adminUserId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка изменения значков",
    });
  }
});

router.patch("/:id/block", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Нельзя заблокировать собственный аккаунт.",
      });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, badges: true },
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (hasProtectedBadge(target)) {
      return res.status(403).json({
        success: false,
        message: "Владельца или разработчика нельзя заблокировать.",
      });
    }

    const reason = String(req.body?.reason || "Нарушение правил платформы").trim().slice(0, 500);
    const blockedUntil = parseBlockUntil(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        blockedAt: new Date(),
        blockedUntil,
        blockedReason: reason,
        blockedById: req.user.id,
        sessionVersion: { increment: 1 },
      },
      select: userSelect,
    });

    return res.json({
      success: true,
      message: blockedUntil ? "Пользователь временно заблокирован" : "Пользователь заблокирован навсегда",
      data: user,
    });
  } catch (e) {
    console.error("[Users] Ошибка блокировки пользователя", {
      error: e?.message || e,
      targetUserId: req.params.id,
      adminUserId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка блокировки пользователя",
    });
  }
});

router.patch("/:id/unblock", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        blockedAt: null,
        blockedUntil: null,
        blockedReason: null,
        blockedById: null,
        sessionVersion: { increment: 1 },
      },
      select: userSelect,
    });

    return res.json({
      success: true,
      message: "Пользователь разблокирован",
      data: user,
    });
  } catch (e) {
    console.error("[Users] Ошибка разблокировки пользователя", {
      error: e?.message || e,
      targetUserId: req.params.id,
      adminUserId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка разблокировки пользователя",
    });
  }
});

router.patch("/:id/reset-password", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const newPassword = req.body.newPassword || "12345678";

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, badges: true },
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (hasProtectedBadge(target)) {
      return res.status(403).json({
        success: false,
        message: "Пароль владельца или разработчика нельзя менять через админку.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        badges: true,
      },
    });

    res.json({
      success: true,
      message: "Пароль пользователя сброшен",
      data: user,
      newPassword,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка сброса пароля",
      error: e.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (hasProtectedBadge(user)) {
      return res.status(403).json({
        success: false,
        message: "Владельца или разработчика нельзя удалить через админку.",
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Пользователь удалён",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления пользователя",
      error: e.message,
    });
  }
});

module.exports = router;
