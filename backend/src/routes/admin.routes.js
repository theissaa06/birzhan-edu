const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.use(authMiddleware, adminMiddleware);

router.get("/stats", async (req, res) => {
  try {
    const [users, courses, reviews, applications, messages] = await Promise.all(
      [
        prisma.user.count(),
        prisma.course.count(),
        prisma.review.count(),
        prisma.application.count(),
        prisma.supportMessage.count(),
      ],
    );
    res.json({
      success: true,
      stats: { users, courses, reviews, applications, messages },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "Пользователь удалён" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
