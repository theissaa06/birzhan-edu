const router = require("express").Router();
const prisma = require("../config/prisma");

router.get("/", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, reviews });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/", async (req, res) => {
  try {
    const review = await prisma.review.create({ data: req.body });
    res.status(201).json({ success: true, review });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
