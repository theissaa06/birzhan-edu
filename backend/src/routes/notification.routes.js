const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
  ]);
  return res.json({ success: true, notifications, unread });
});

router.patch("/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "NOTIFICATION_ID_INVALID", message: "Некорректный ID уведомления." });
  const result = await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!result.count) return res.status(404).json({ success: false, code: "NOTIFICATION_NOT_FOUND", message: "Уведомление не найдено." });
  return res.json({ success: true });
});

router.post("/read-all", async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  return res.json({ success: true, updated: result.count });
});

module.exports = router;
