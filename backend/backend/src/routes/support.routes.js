const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

function requireAdminForAdminMessage(req, res, next) {
  if (req.body?.from !== "admin") return next();
  return authMiddleware(req, res, () => adminMiddleware(req, res, next));
}

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки сообщений",
      error: e.message,
    });
  }
});

router.post("/", requireAdminForAdminMessage, async (req, res) => {
  try {
    const { text, from, userId } = req.body;

    if (!text || !from) {
      return res.status(400).json({
        success: false,
        message: "Текст и отправитель обязательны",
      });
    }

    if (!["user", "admin"].includes(from)) {
      return res.status(400).json({
        success: false,
        message: "Некорректный отправитель сообщения",
      });
    }

    const message = await prisma.supportMessage.create({
      data: {
        text: text.trim(),
        from,
        userId: userId ? Number(userId) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка отправки сообщения",
      error: e.message,
    });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID сообщения",
      });
    }

    await prisma.supportMessage.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Сообщение удалено",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления сообщения",
      error: e.message,
    });
  }
});

module.exports = router;
