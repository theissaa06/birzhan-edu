const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { writeAudit } = require("../utils/audit");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "SUPPORT_RATE_LIMIT", message: "Слишком много обращений. Повторите позже." },
});

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { id: true, username: true, email: true } } },
  });
  return res.json({ success: true, data: messages });
});

router.post("/", supportLimiter, optionalAuthMiddleware, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const topic = String(req.body?.topic || "other").trim().slice(0, 60);
    const name = String(req.body?.name || "").trim().slice(0, 80);
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 160);
    if (text.length < 5 || text.length > 4000) {
      return res.status(400).json({ success: false, code: "SUPPORT_TEXT_INVALID", message: "Сообщение должно содержать от 5 до 4000 символов." });
    }
    if (!req.user && (!name || !EMAIL_RE.test(email))) {
      return res.status(400).json({ success: false, code: "SUPPORT_CONTACT_INVALID", message: "Для обращения без входа укажите имя и корректный email." });
    }
    const message = await prisma.supportMessage.create({
      data: {
        text,
        topic,
        name: req.user ? null : name,
        email: req.user ? null : email,
        from: "user",
        userId: req.user?.id || null,
      },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
    return res.status(201).json({ success: true, data: message, message: "Обращение отправлено." });
  } catch (error) {
    console.error("[Support] Create failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "SUPPORT_CREATE_FAILED", message: "Не удалось отправить обращение." });
  }
});

router.post("/:id/reply", authMiddleware, adminMiddleware, async (req, res) => {
  const sourceId = Number(req.params.id);
  const text = String(req.body?.text || "").trim();
  if (!Number.isInteger(sourceId) || sourceId <= 0 || text.length < 2 || text.length > 4000) {
    return res.status(400).json({ success: false, code: "SUPPORT_REPLY_INVALID", message: "Введите корректный ответ." });
  }
  const source = await prisma.supportMessage.findUnique({ where: { id: sourceId } });
  if (!source) return res.status(404).json({ success: false, code: "SUPPORT_NOT_FOUND", message: "Обращение не найдено." });
  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: { text, from: "admin", userId: source.userId, topic: `reply:${source.id}`, status: "answered" },
    });
    await tx.supportMessage.update({ where: { id: source.id }, data: { status: "answered" } });
    if (source.userId) await tx.notification.create({ data: { userId: source.userId, type: "support", title: "Ответ службы поддержки", message: text.slice(0, 180), link: "/support" } });
    await writeAudit(tx, { req, action: "support.replied", entityType: "SupportMessage", entityId: source.id, targetUserId: source.userId || undefined, after: { replyId: created.id } });
    return created;
  });
  return res.status(201).json({ success: true, data: reply });
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "SUPPORT_ID_INVALID", message: "Некорректный ID обращения." });
  const source = await prisma.supportMessage.findUnique({ where: { id } });
  if (!source) return res.status(404).json({ success: false, code: "SUPPORT_NOT_FOUND", message: "Обращение не найдено." });
  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.delete({ where: { id } });
    await writeAudit(tx, { req, action: "support.deleted", entityType: "SupportMessage", entityId: id, targetUserId: source.userId || undefined });
  });
  return res.json({ success: true, message: "Обращение удалено." });
});

module.exports = router;
