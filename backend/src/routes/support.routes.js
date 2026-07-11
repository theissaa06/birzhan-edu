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
    const { text, from, name, email, topic, userId } = req.body || {};
    const cleanText = String(text || "").trim();
    const cleanName = String(name || "").trim().slice(0, 80);
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 120);
    const cleanTopic = String(topic || "other").trim().slice(0, 40);

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message: "Текст обращения обязателен",
      });
    }

    const isAdminMessage = from === "admin" && req.user?.isAdmin;
    const fullText = isAdminMessage
      ? cleanText.slice(0, 4000)
      : [
          cleanName ? `Имя: ${cleanName}` : null,
          cleanEmail ? `Email: ${cleanEmail}` : null,
          cleanTopic ? `Тема: ${cleanTopic}` : null,
          "",
          cleanText,
        ]
          .filter((line) => line !== null)
          .join("\n")
          .slice(0, 4000);

    const message = await prisma.supportMessage.create({
      data: {
        text: fullText,
        from: isAdminMessage ? "admin" : "user",
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
    console.error("[Support] Ошибка отправки сообщения", {
      error: e?.message || e,
    });

    res.status(500).json({
      success: false,
      message: "Ошибка отправки сообщения",
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
