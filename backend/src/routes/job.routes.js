const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { success: false, code: "JOB_APPLY_RATE_LIMIT", message: "Слишком много откликов. Повторите позже." } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/", async (req, res) => {
  const jobs = await prisma.jobPosting.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return res.json({ success: true, jobs, data: jobs });
});

router.post("/:id/applications", applyLimiter, optionalAuthMiddleware, async (req, res) => {
  const jobId = Number(req.params.id);
  const name = String(req.body?.name || "").trim().slice(0, 100);
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 160);
  if (!Number.isInteger(jobId) || jobId <= 0 || name.length < 2 || !EMAIL_RE.test(email)) return res.status(400).json({ success: false, code: "JOB_APPLICATION_INVALID", message: "Укажите имя и корректный email." });
  const job = await prisma.jobPosting.findFirst({ where: { id: jobId, isPublished: true } });
  if (!job) return res.status(404).json({ success: false, code: "JOB_NOT_FOUND", message: "Вакансия не найдена." });
  const application = await prisma.jobApplication.create({ data: { jobId, userId: req.user?.id || null, name, email, phone: String(req.body?.phone || "").trim().slice(0, 40) || null, message: String(req.body?.message || "").trim().slice(0, 3000) || null } });
  return res.status(201).json({ success: true, application: { id: application.id, status: application.status, createdAt: application.createdAt }, message: "Отклик отправлен." });
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const company = String(req.body?.company || "").trim().slice(0, 160);
  const description = String(req.body?.description || "").trim().slice(0, 6000);
  if (title.length < 3 || company.length < 2 || description.length < 20) return res.status(400).json({ success: false, code: "JOB_INVALID", message: "Проверьте название, компанию и описание." });
  const job = await prisma.jobPosting.create({ data: { title, company, description, location: String(req.body?.location || "Удалённо").trim().slice(0, 120), employmentType: String(req.body?.employmentType || "Полная занятость").trim().slice(0, 80), salary: String(req.body?.salary || "").trim().slice(0, 120) || null, isPublished: Boolean(req.body?.isPublished) } });
  return res.status(201).json({ success: true, job });
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, code: "JOB_ID_INVALID", message: "Некорректный ID вакансии." });
  const allowed = ["title", "company", "description", "location", "employmentType", "salary", "isPublished"];
  const data = Object.fromEntries(allowed.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]));
  const job = await prisma.jobPosting.update({ where: { id }, data });
  return res.json({ success: true, job });
});

module.exports = router;
