const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const bonuses = await prisma.bonus.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, bonuses });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const bonus = await prisma.bonus.create({ data: req.body });
    res.status(201).json({ success: true, bonus });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/:id/claim", authMiddleware, async (req, res) => {
  try {
    const userBonus = await prisma.userBonus.upsert({
      where: {
        userId_bonusId: { userId: req.user.id, bonusId: Number(req.params.id) },
      },
      update: { claimed: true },
      create: {
        userId: req.user.id,
        bonusId: Number(req.params.id),
        claimed: true,
      },
    });
    res.json({ success: true, userBonus });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
