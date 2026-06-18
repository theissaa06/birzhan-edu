const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

/**
 * GET /api/premium/status
 * Проверка Premium-статуса текущего пользователя (требует авторизации)
 */
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Пользователь не найден" });
    }

    const isPremium = user.role === "ADMIN";

    return res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium,
        premiumPlan: isPremium ? "admin-demo" : null,
        premiumStarted: null,
        premiumUntil: null,
      },
    });
  } catch (error) {
    console.error("Premium status error:", error);
    return res.status(500).json({ success: false, message: "Ошибка при проверке Premium-статуса" });
  }
});

/**
 * GET /api/premium/status/:userId — обратная совместимость
 */
router.get("/status/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Некорректный ID пользователя" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Пользователь не найден" });
    }

    const isPremium = user.role === "ADMIN";

    return res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium,
        premiumPlan: isPremium ? "admin-demo" : null,
        premiumStarted: null,
        premiumUntil: null,
      },
    });
  } catch (error) {
    console.error("Premium status error:", error);
    return res.status(500).json({ success: false, message: "Ошибка при проверке Premium-статуса" });
  }
});

/**
 * POST /api/premium/activate — демо-активация
 */
router.post("/activate", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Пользователь не найден" });
    }

    return res.json({
      success: true,
      message: "Premium активирован для демонстрации",
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: true,
        premiumPlan: "demo",
        premiumStarted: new Date().toISOString(),
        premiumUntil: null,
      },
    });
  } catch (error) {
    console.error("Premium activate error:", error);
    return res.status(500).json({ success: false, message: "Ошибка при активации Premium" });
  }
});

module.exports = router;
