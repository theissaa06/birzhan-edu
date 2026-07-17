const crypto = require("crypto");
const QRCode = require("qrcode");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { writeAudit } = require("../utils/audit");

function publicCertificate(certificate) {
  return {
    code: certificate.code,
    recipientName: certificate.recipientName,
    courseTitle: certificate.courseTitle,
    issuedAt: certificate.issuedAt,
    status: certificate.status,
    verificationUrl: `/certificate/${certificate.code}`,
  };
}

function absoluteCertificateUrl(req, code) {
  const base = String(process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`).split(",")[0].trim().replace(/\/$/, "");
  return `${base}/certificate/${encodeURIComponent(code)}`;
}

router.get("/me", authMiddleware, async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    orderBy: { issuedAt: "desc" },
  });
  return res.json({ success: true, certificates: certificates.map(publicCertificate) });
});

router.post("/issue", authMiddleware, async (req, res) => {
  const courseId = Number(req.body?.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ success: false, code: "COURSE_ID_INVALID", message: "Некорректный ID курса." });
  }
  const [user, course, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, username: true } }),
    prisma.course.findUnique({ where: { id: courseId }, include: { lessons: { where: { isPublished: true }, select: { id: true } } } }),
    prisma.certificate.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId } } }),
  ]);
  if (existing) return res.json({ success: true, reused: true, certificate: publicCertificate(existing) });
  if (!user || !course || !course.isPublished) return res.status(404).json({ success: false, code: "COURSE_NOT_FOUND", message: "Курс не найден." });
  if (!course.lessons.length) return res.status(409).json({ success: false, code: "COURSE_HAS_NO_LESSONS", message: "В курсе пока нет опубликованных уроков." });
  const completed = await prisma.lessonProgress.count({
    where: { userId: user.id, completed: true, lessonId: { in: course.lessons.map((lesson) => lesson.id) } },
  });
  if (completed !== course.lessons.length) {
    return res.status(409).json({ success: false, code: "COURSE_NOT_COMPLETED", message: "Сертификат станет доступен после завершения всех уроков.", progress: { completed, total: course.lessons.length } });
  }
  const certificate = await prisma.$transaction(async (tx) => {
    const created = await tx.certificate.create({
      data: {
        code: crypto.randomBytes(18).toString("base64url"),
        userId: user.id,
        courseId: course.id,
        recipientName: user.username,
        courseTitle: course.title,
      },
    });
    await tx.notification.create({ data: { userId: user.id, type: "certificate", title: "Сертификат готов", message: `Вы завершили курс «${course.title}».`, link: `/certificate/${created.code}` } });
    await writeAudit(tx, { req, action: "certificate.issued", entityType: "Certificate", entityId: created.id, targetUserId: user.id, after: { code: created.code, courseId } });
    return created;
  });
  return res.status(201).json({ success: true, reused: false, certificate: publicCertificate(certificate) });
});

router.get("/:code/public", async (req, res) => {
  const code = String(req.params.code || "").trim();
  const certificate = await prisma.certificate.findUnique({ where: { code } });
  if (!certificate) return res.status(404).json({ success: false, code: "CERTIFICATE_NOT_FOUND", message: "Сертификат не найден." });
  return res.json({ success: true, certificate: publicCertificate(certificate), valid: certificate.status === "ACTIVE" });
});

router.get("/:code/qr.svg", async (req, res) => {
  const code = String(req.params.code || "").trim();
  const certificate = await prisma.certificate.findUnique({ where: { code }, select: { code: true } });
  if (!certificate) return res.status(404).type("text/plain").send("Certificate not found");
  const svg = await QRCode.toString(absoluteCertificateUrl(req, code), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0B0D12", light: "#F4F7FB" },
  });
  res.set("Cache-Control", "public, max-age=3600");
  return res.type("image/svg+xml").send(svg);
});

router.post("/:code/revoke", authMiddleware, adminMiddleware, async (req, res) => {
  const code = String(req.params.code || "").trim();
  const certificate = await prisma.certificate.findUnique({ where: { code } });
  if (!certificate) return res.status(404).json({ success: false, code: "CERTIFICATE_NOT_FOUND", message: "Сертификат не найден." });
  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({ where: { code }, data: { status: "REVOKED", revokedAt: new Date() } });
    await writeAudit(tx, { req, action: "certificate.revoked", entityType: "Certificate", entityId: certificate.id, targetUserId: certificate.userId });
  });
  return res.json({ success: true, message: "Сертификат отозван." });
});

module.exports = router;
