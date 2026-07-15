const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const articles = await prisma.mediaArticle.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, articles });
  } catch (e) {
    console.error("[Media] Failed to load articles", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 160);
    const description = String(req.body?.description || "").trim().slice(0, 1200);
    const category = String(req.body?.category || "").trim().slice(0, 80);
    const type = String(req.body?.type || "article").trim().slice(0, 40);
    const imageUrl = req.body?.imageUrl
      ? String(req.body.imageUrl).trim().slice(0, 2000)
      : null;
    const content = req.body?.content
      ? String(req.body.content).trim().slice(0, 30000)
      : null;

    if (title.length < 3 || description.length < 10 || !category) {
      return res.status(400).json({
        success: false,
        message: "Укажите название, описание и категорию материала.",
      });
    }

    const article = await prisma.mediaArticle.create({
      data: { title, description, category, type, imageUrl, content },
    });
    res.status(201).json({ success: true, article });
  } catch (e) {
    console.error("[Media] Failed to create article", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
