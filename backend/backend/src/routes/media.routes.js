const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const articles = await prisma.mediaArticle.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, articles });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const article = await prisma.mediaArticle.create({ data: req.body });
    res.status(201).json({ success: true, article });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
