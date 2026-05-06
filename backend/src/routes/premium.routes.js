const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

function getUserIdFromRequest(req) {
  const userId =
    req.user?.id ||
    req.userId ||
    req.body.userId ||
    req.query.userId ||
    req.headers["x-user-id"];

  return Number(userId);
}

router.get("/status", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Пользователь не найден. Передай userId или авторизуйся.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPremium: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден.",
      });
    }

    const isActive =
      user.isPremium &&
      user.premiumUntil &&
      new Date(user.premiumUntil).getTime() > Date.now();

    return res.json({
      success: true,
      data: {
        isPremium: Boolean(isActive),
        plan: user.premiumPlan,
        startedAt: user.premiumStarted,
        expiresAt: user.premiumUntil,
      },
    });
  } catch (error) {
    console.error("Premium status error:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения Premium-статуса.",
    });
  }
});

router.post("/activate-test", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Пользователь не найден. Передай userId или авторизуйся.",
      });
    }

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumPlan: "Premium Monthly",
        premiumStarted: startedAt,
        premiumUntil: expiresAt,
        subscriptions: {
          create: {
            plan: "Premium Monthly",
            price: 4990,
            currency: "KZT",
            status: "ACTIVE",
            startedAt,
            expiresAt,
            provider: "manual",
            payments: {
              create: {
                amount: 4990,
                currency: "KZT",
                status: "PAID",
                provider: "manual",
                description: "Premium Monthly manual activation",
                paidAt: startedAt,
                userId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        isPremium: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
      },
    });

    return res.json({
      success: true,
      message: "Premium активирован.",
      data: {
        isPremium: user.isPremium,
        plan: user.premiumPlan,
        startedAt: user.premiumStarted,
        expiresAt: user.premiumUntil,
      },
    });
  } catch (error) {
    console.error("Premium activate error:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка активации Premium.",
    });
  }
});

router.post("/cancel", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Пользователь не найден. Передай userId или авторизуйся.",
      });
    }

    const now = new Date();

    await prisma.subscription.updateMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      data: {
        status: "CANCELED",
        canceledAt: now,
      },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        premiumPlan: null,
        premiumStarted: null,
        premiumUntil: null,
      },
      select: {
        id: true,
        isPremium: true,
        premiumPlan: true,
        premiumStarted: true,
        premiumUntil: true,
      },
    });

    return res.json({
      success: true,
      message: "Premium отключён.",
      data: {
        isPremium: user.isPremium,
        plan: user.premiumPlan,
        startedAt: user.premiumStarted,
        expiresAt: user.premiumUntil,
      },
    });
  } catch (error) {
    console.error("Premium cancel error:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка отключения Premium.",
    });
  }
});

module.exports = router;
