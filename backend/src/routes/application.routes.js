const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: applications, applications });
  } catch (error) {
    console.error("[Applications] Ошибка загрузки заявок", {
      error: error?.message || error,
      adminId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки заявок.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = normalizeText(req.body?.name, 80);
    const email = normalizeText(req.body?.email, 120).toLowerCase();
    const phone = normalizeText(req.body?.phone, 40) || null;
    const type = normalizeText(req.body?.type, 80);
    const message = normalizeText(req.body?.message, 2000) || null;

    if (!name || !email || !type) {
      return res.status(400).json({
        success: false,
        message: "Укажите имя, email и тип заявки.",
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Введите корректный email.",
      });
    }

    const application = await prisma.application.create({
      data: { name, email, phone, type, message },
    });

    return res.status(201).json({ success: true, data: application, application });
  } catch (error) {
    console.error("[Applications] Ошибка создания заявки", {
      error: error?.message || error,
      type: req.body?.type,
      email: req.body?.email,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при создании заявки.",
    });
  }
});

module.exports = router;
