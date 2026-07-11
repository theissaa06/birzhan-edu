const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.use(authMiddleware, adminMiddleware);

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function hasProtectedBadge(user) {
  const badges = Array.isArray(user?.badges) ? user.badges : [];
  return badges.some((badge) =>
    ["OWNER", "DEVELOPER"].includes(String(badge).toUpperCase()),
  );
}

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      users,
      courses,
      reviews,
      applications,
      messages,
      activeUsers,
      newUsersMonth,
      completedSubmissionsMonth,
      premiumUsers,
      premiumRevenueMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.review.count(),
      prisma.application.count(),
      prisma.supportMessage.count(),
      prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.lessonProgress.count({
        where: { completedAt: { gte: monthAgo } },
      }),
      prisma.user.count({ where: { premiumUntil: { gt: now } } }),
      prisma.paymentTransaction.aggregate({
        where: {
          createdAt: { gte: monthAgo },
          status: "paid",
        },
        _sum: { amount: true },
      }),
    ]);

    const funnelData = await prisma.lessonProgress.groupBy({
      by: ["courseId"],
      _count: { userId: true },
      where: {
        courseId: { not: null },
        completedAt: { not: null },
      },
    });

    const usersWithProgress = await prisma.lessonProgress.groupBy({
      by: ["userId"],
      _count: { lessonId: true },
    });
    const conversionRate = users > 0 ? (usersWithProgress.length / users) * 100 : 0;

    res.json({
      success: true,
      stats: {
        users,
        courses,
        reviews,
        applications,
        messages,
        activeUsers,
        newUsersMonth,
        completedSubmissionsMonth,
        premiumUsers,
        premiumRevenueMonth: premiumRevenueMonth._sum.amount || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        funnel: funnelData.map((item) => ({
          courseId: item.courseId,
          completedUsers: item._count.userId,
        })),
      },
    });
  } catch (error) {
    console.error("[Admin stats error]", error);
    res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        badges: true,
        blockedAt: true,
        blockedUntil: true,
        blockedReason: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error("[Admin users error]", error);
    res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ success: false, message: "Некорректный ID пользователя." });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "Нельзя удалить собственный аккаунт." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, badges: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Пользователь не найден." });
    }

    if (hasProtectedBadge(user)) {
      return res.status(403).json({
        success: false,
        message: "Владельца или разработчика нельзя удалить.",
      });
    }

    await prisma.user.delete({ where: { id: userId } });
    return res.json({ success: true, message: "Пользователь удалён." });
  } catch (error) {
    console.error("[Admin user delete error]", error);
    return res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});

router.post("/premium/grant", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.body?.userId);
    const durationDays = parsePositiveInt(req.body?.durationDays);

    if (!userId || !durationDays) {
      return res.status(400).json({ success: false, message: "Некорректные данные." });
    }

    const premiumStarted = new Date();
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumUntil: true },
    });
    const currentUntil = currentUser?.premiumUntil
      ? new Date(currentUser.premiumUntil)
      : null;
    const periodStart =
      currentUntil && currentUntil > premiumStarted ? currentUntil : premiumStarted;
    const premiumUntil = new Date(periodStart);
    premiumUntil.setDate(premiumUntil.getDate() + durationDays);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        premiumPlan: "PREMIUM",
        premiumStarted,
        premiumUntil,
      },
      select: {
        id: true,
        username: true,
        email: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
      },
    });

    return res.json({
      success: true,
      message: "Premium выдан.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[Admin premium grant error]", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка сервера.",
    });
  }
});

router.post("/premium/revoke", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.body?.userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "Некорректные данные." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        premiumPlan: null,
        premiumStarted: null,
        premiumUntil: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
      },
    });

    return res.json({
      success: true,
      message: "Premium отозван.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[Admin premium revoke error]", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка сервера.",
    });
  }
});

module.exports = router;
