const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, reviews });
  } catch (e) {
    console.error("[Reviews] Failed to load reviews", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 80);
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    const rating = Number(req.body?.rating);
    const direction = req.body?.direction
      ? String(req.body.direction).trim().slice(0, 120)
      : null;

    if (name.length < 2 || text.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Укажите имя, текст отзыва и оценку от 1 до 5.",
      });
    }

    const review = await prisma.review.create({
      data: { name, text, rating, direction },
    });
    res.status(201).json({ success: true, review });
  } catch (e) {
    console.error("[Reviews] Failed to create review", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
