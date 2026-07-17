const router = require("express").Router();
const prisma = require("../config/prisma");

let cached = null;
let cachedAt = 0;

router.get("/stats", async (req, res) => {
  if (cached && Date.now() - cachedAt < 60_000) return res.json({ success: true, data: cached, cached: true });
  const [students, courses, reviews, certificates, lessonsCompleted] = await Promise.all([
    prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.review.count({ where: { isHidden: false } }),
    prisma.certificate.count({ where: { status: "ACTIVE" } }),
    prisma.lessonProgress.count({ where: { completed: true } }),
  ]);
  cached = { students, courses, reviews, certificates, lessonsCompleted };
  cachedAt = Date.now();
  return res.json({ success: true, data: cached, cached: false });
});

module.exports = router;
