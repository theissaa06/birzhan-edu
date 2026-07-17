const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { hasAnyRole } = require("../utils/access");
const { getPremiumAccess } = require("../services/premium.service");
const { writeAudit } = require("../utils/audit");

router.get("/", optionalAuthMiddleware, async (req, res) => {
  const audiences = ["ALL"];
  if (req.user) {
    audiences.push("USERS");
    if (hasAnyRole(req.user.roles)) audiences.push("STAFF");
    const premium = await getPremiumAccess(req.user.id);
    if (premium?.active) audiences.push("PREMIUM");
  }
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: { audience: { in: audiences }, activeFrom: { lte: now }, OR: [{ activeUntil: null }, { activeUntil: { gt: now } }] },
    orderBy: { activeFrom: "desc" },
    take: 20,
    include: req.user ? { reads: { where: { userId: req.user.id }, select: { readAt: true } } } : undefined,
  });
  return res.json({ success: true, announcements: announcements.map((item) => ({ ...item, isRead: Boolean(item.reads?.length), reads: undefined })) });
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const message = String(req.body?.message || "").trim().slice(0, 3000);
  const audience = String(req.body?.audience || "ALL").toUpperCase();
  const activeFrom = req.body?.activeFrom ? new Date(req.body.activeFrom) : new Date();
  const activeUntil = req.body?.activeUntil ? new Date(req.body.activeUntil) : null;
  if (title.length < 3 || message.length < 5 || !["ALL", "USERS", "PREMIUM", "STAFF"].includes(audience) || Number.isNaN(activeFrom.getTime()) || (activeUntil && Number.isNaN(activeUntil.getTime()))) {
    return res.status(400).json({ success: false, code: "ANNOUNCEMENT_INVALID", message: "Проверьте заголовок, текст, аудиторию и даты." });
  }
  const announcement = await prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({ data: { title, message, audience, activeFrom, activeUntil, createdById: req.user.id } });
    await writeAudit(tx, { req, action: "announcement.created", entityType: "Announcement", entityId: created.id, after: { title, audience, activeFrom, activeUntil } });
    return created;
  });
  return res.status(201).json({ success: true, announcement });
});

router.post("/:id/read", authMiddleware, async (req, res) => {
  const announcementId = Number(req.params.id);
  if (!Number.isInteger(announcementId) || announcementId <= 0) return res.status(400).json({ success: false, code: "ANNOUNCEMENT_ID_INVALID", message: "Некорректный ID объявления." });
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: req.user.id } },
    update: { readAt: new Date() },
    create: { announcementId, userId: req.user.id },
  });
  return res.json({ success: true });
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "ANNOUNCEMENT_ID_INVALID", message: "Некорректный ID объявления." });
  await prisma.$transaction(async (tx) => {
    await tx.announcement.delete({ where: { id } });
    await writeAudit(tx, { req, action: "announcement.deleted", entityType: "Announcement", entityId: id });
  });
  return res.json({ success: true });
});

module.exports = router;
