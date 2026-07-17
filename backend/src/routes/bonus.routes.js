const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { writeAudit } = require("../utils/audit");

function payload(body = {}) {
  return {
    title: String(body.title || "").trim().slice(0, 120),
    description: String(body.description || body.text || "").trim().slice(0, 1200),
    status: String(body.status || "available").trim().slice(0, 40),
    requirement: String(body.requirement || "").trim().slice(0, 120) || null,
  };
}

router.get("/", optionalAuthMiddleware, async (req, res) => {
  try {
    const bonuses = await prisma.bonus.findMany({
      orderBy: { createdAt: "asc" },
      include: req.user ? { userBonuses: { where: { userId: req.user.id }, select: { claimed: true, createdAt: true } } } : undefined,
    });
    const data = bonuses.map((bonus) => ({ ...bonus, claimed: Boolean(bonus.userBonuses?.[0]?.claimed), claimedAt: bonus.userBonuses?.[0]?.createdAt || null, userBonuses: undefined }));
    return res.json({ success: true, data, bonuses: data });
  } catch (error) {
    console.error("[Bonus] Load failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "BONUSES_LOAD_FAILED", message: "Не удалось загрузить бонусы." });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const data = payload(req.body);
  if (data.title.length < 3 || data.description.length < 10) return res.status(400).json({ success: false, code: "BONUS_INVALID", message: "Укажите название и описание бонуса." });
  const bonus = await prisma.$transaction(async (tx) => {
    const created = await tx.bonus.create({ data });
    await writeAudit(tx, { req, action: "bonus.created", entityType: "Bonus", entityId: created.id, after: data });
    return created;
  });
  return res.status(201).json({ success: true, bonus });
});

router.post("/:id/claim", authMiddleware, async (req, res) => {
  const bonusId = Number(req.params.id);
  if (!Number.isInteger(bonusId) || bonusId <= 0) return res.status(400).json({ success: false, code: "BONUS_ID_INVALID", message: "Некорректный ID бонуса." });
  const bonus = await prisma.bonus.findFirst({ where: { id: bonusId, status: "available" } });
  if (!bonus) return res.status(404).json({ success: false, code: "BONUS_NOT_FOUND", message: "Бонус не найден." });
  const userBonus = await prisma.userBonus.upsert({ where: { userId_bonusId: { userId: req.user.id, bonusId } }, update: { claimed: true }, create: { userId: req.user.id, bonusId, claimed: true }, include: { bonus: true } });
  return res.json({ success: true, userBonus, message: "Бонус сохранён в аккаунте." });
});

module.exports = router;
