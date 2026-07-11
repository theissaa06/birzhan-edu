const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

const DEFAULT_BONUSES = [
  {
    title: "AI-пак для монтажа 2026",
    description:
      "Готовые промпты для идей, сценариев, хуков, описаний и структуры коротких видео.",
    requirement: "NEW 2026",
  },
  {
    title: "CapCut Presets Pack",
    description:
      "Набор пресетов для динамичных TikTok, Reels и Shorts: переходы, зум, speed ramp и титры.",
    requirement: "Для новичков",
  },
  {
    title: "LUT-пак для цветокоррекции",
    description:
      "Кинематографичные цветовые настройки для видео, эдитов, travel-роликов и блогов.",
    requirement: "PRO стиль",
  },
  {
    title: "Shake / Zoom / Flash эффекты",
    description:
      "Гайд по самым популярным эффектам: shake, blur, flash, zoom, glitch и монтаж под бит.",
    requirement: "Эдиты",
  },
  {
    title: "Чек-лист TikTok-эдита",
    description:
      "Пошаговый список: хук, музыка, нарезка, переходы, текст, цвет, экспорт и публикация.",
    requirement: "Практика",
  },
  {
    title: "Шаблон портфолио",
    description:
      "Структура портфолио для начинающего видеомонтажёра: что показать клиенту и как оформить.",
    requirement: "Карьера",
  },
  {
    title: "Сертификат после прохождения",
    description:
      "После завершения курса студент получает сертификат Frame School.",
    requirement: "Награда",
  },
  {
    title: "Мини-гайд: первые заказы",
    description:
      "Как найти первых клиентов, что писать заказчику и как оценивать свою работу.",
    requirement: "Доход",
  },
];

function normalizeBonusPayload(body = {}) {
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || body.text || "").trim().slice(0, 1200);
  const status = String(body.status || "available").trim().slice(0, 40);
  const requirement = body.requirement
    ? String(body.requirement).trim().slice(0, 120)
    : null;

  return { title, description, status, requirement };
}

async function ensureDefaultBonuses() {
  const count = await prisma.bonus.count();
  if (count > 0) return;

  await prisma.bonus.createMany({ data: DEFAULT_BONUSES });
}

router.get("/", async (req, res) => {
  try {
    await ensureDefaultBonuses();

    const bonuses = await prisma.bonus.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: bonuses, bonuses });
  } catch (e) {
    console.error("[Bonus] Ошибка загрузки бонусов", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка загрузки бонусов." });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Создавать бонусы может только администратор.",
      });
    }

    const payload = normalizeBonusPayload(req.body);

    if (!payload.title || !payload.description) {
      return res.status(400).json({
        success: false,
        message: "Укажите название и описание бонуса.",
      });
    }

    const bonus = await prisma.bonus.create({ data: payload });
    res.status(201).json({ success: true, bonus });
  } catch (e) {
    console.error("[Bonus] Ошибка создания бонуса", e?.message || e);
    res.status(500).json({ success: false, message: "Ошибка создания бонуса." });
  }
});

router.post("/:id/claim", authMiddleware, async (req, res) => {
  try {
    const bonusId = Number(req.params.id);

    if (!Number.isInteger(bonusId) || bonusId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID бонуса.",
      });
    }

    const bonus = await prisma.bonus.findUnique({ where: { id: bonusId } });

    if (!bonus) {
      return res.status(404).json({
        success: false,
        message: "Бонус не найден.",
      });
    }

    const userBonus = await prisma.userBonus.upsert({
      where: {
        userId_bonusId: { userId: req.user.id, bonusId },
      },
      update: { claimed: true },
      create: {
        userId: req.user.id,
        bonusId,
        claimed: true,
      },
      include: { bonus: true },
    });
    res.json({ success: true, userBonus });
  } catch (e) {
    console.error("[Bonus] Ошибка получения бонуса", {
      error: e?.message || e,
      userId: req.user?.id,
      bonusId: req.params.id,
    });
    res.status(500).json({ success: false, message: "Ошибка получения бонуса." });
  }
});

module.exports = router;
