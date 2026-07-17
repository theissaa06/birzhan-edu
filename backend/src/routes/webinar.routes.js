const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  const webinars = await prisma.webinar.findMany({ where: { isPublished: true }, orderBy: { startsAt: "asc" }, take: 100 });
  return res.json({ success: true, webinars, data: webinars });
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const description = String(req.body?.description || "").trim().slice(0, 4000);
  const startsAt = new Date(req.body?.startsAt);
  const durationMinutes = Number(req.body?.durationMinutes || 60);
  if (title.length < 3 || description.length < 10 || Number.isNaN(startsAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
    return res.status(400).json({ success: false, code: "WEBINAR_INVALID", message: "Проверьте название, описание, дату и длительность." });
  }
  const webinar = await prisma.webinar.create({
    data: { title, description, startsAt, durationMinutes, registrationUrl: String(req.body?.registrationUrl || "").trim() || null, imageUrl: String(req.body?.imageUrl || "").trim() || null, isPublished: Boolean(req.body?.isPublished) },
  });
  return res.status(201).json({ success: true, webinar });
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "WEBINAR_ID_INVALID", message: "Некорректный ID вебинара." });
  const data = Object.fromEntries(["title", "description", "registrationUrl", "imageUrl", "isPublished"].filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]));
  if (req.body?.startsAt) data.startsAt = new Date(req.body.startsAt);
  if (req.body?.durationMinutes) data.durationMinutes = Number(req.body.durationMinutes);
  const webinar = await prisma.webinar.update({ where: { id }, data });
  return res.json({ success: true, webinar });
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "WEBINAR_ID_INVALID", message: "Некорректный ID вебинара." });
  await prisma.webinar.delete({ where: { id } });
  return res.json({ success: true });
});

module.exports = router;
