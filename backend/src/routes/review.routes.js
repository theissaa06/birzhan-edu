const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { rolesFromUser, highestRole } = require("../utils/access");
const { writeAudit } = require("../utils/audit");

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "REVIEW_RATE_LIMIT", message: "Слишком много действий. Повторите позже." },
});

const authorSelect = {
  id: true,
  username: true,
  role: true,
  badges: true,
  roles: { select: { role: true } },
};

const reviewInclude = {
  user: { select: authorSelect },
  comments: {
    where: { isHidden: false },
    orderBy: { createdAt: "asc" },
    include: { author: { select: authorSelect } },
  },
  officialReply: { include: { author: { select: authorSelect } } },
};

function staffLabel(user) {
  const role = highestRole(rolesFromUser(user));
  if (role === "OWNER") return "Команда Frame School · Owner";
  if (role === "DEVELOPER") return "Команда Frame School · Developer";
  return "Официальный ответ Frame School";
}

function publicAuthor(user) {
  return user ? { id: user.id, username: user.username, roles: rolesFromUser(user) } : null;
}

function serialize(review) {
  return {
    id: review.id,
    name: review.user?.username || review.name,
    text: review.text,
    rating: review.rating,
    direction: review.direction,
    userId: review.userId,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    author: publicAuthor(review.user),
    comments: (review.comments || []).map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: publicAuthor(comment.author),
    })),
    officialReply: review.officialReply
      ? {
          id: review.officialReply.id,
          text: review.officialReply.text,
          createdAt: review.officialReply.createdAt,
          updatedAt: review.officialReply.updatedAt,
          label: staffLabel(review.officialReply.author),
          author: publicAuthor(review.officialReply.author),
        }
      : null,
  };
}

router.get("/", optionalAuthMiddleware, async (req, res) => {
  try {
    const direction = String(req.query.direction || "").trim();
    const sort = req.query.sort === "rating" ? { rating: "desc" } : { createdAt: "desc" };
    const includeHidden = req.query.includeHidden === "true" && rolesFromUser(req.user).length > 0;
    const reviews = await prisma.review.findMany({
      where: { ...(includeHidden ? {} : { isHidden: false }), ...(direction ? { direction } : {}) },
      orderBy: sort,
      take: 100,
      include: reviewInclude,
    });
    return res.json({ success: true, reviews: reviews.map(serialize), data: reviews.map(serialize) });
  } catch (error) {
    console.error("[Reviews] Load failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "REVIEWS_LOAD_FAILED", message: "Не удалось загрузить отзывы." });
  }
});

router.post("/", authMiddleware, writeLimiter, async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const rating = Number(req.body?.rating);
  const direction = String(req.body?.direction || "").trim().slice(0, 120) || null;
  if (text.length < 20 || text.length > 1500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, code: "REVIEW_INVALID", message: "Напишите от 20 до 1500 символов и поставьте оценку от 1 до 5." });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, username: true } });
  if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  const previous = await prisma.review.findUnique({ where: { userId: user.id } });
  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.review.upsert({
      where: { userId: user.id },
      create: { userId: user.id, name: user.username, text, rating, direction },
      update: { name: user.username, text, rating, direction, isHidden: false },
      include: reviewInclude,
    });
    await writeAudit(tx, { req, action: previous ? "review.updated" : "review.created", entityType: "Review", entityId: saved.id, targetUserId: user.id, before: previous || undefined, after: { text, rating, direction } });
    return saved;
  });
  return res.status(previous ? 200 : 201).json({ success: true, message: previous ? "Отзыв обновлён." : "Отзыв опубликован.", review: serialize(review) });
});

router.post("/:id/comments", authMiddleware, writeLimiter, async (req, res) => {
  const reviewId = Number(req.params.id);
  const text = String(req.body?.text || "").trim();
  if (!Number.isInteger(reviewId) || reviewId <= 0 || text.length < 2 || text.length > 1000) {
    return res.status(400).json({ success: false, code: "REVIEW_COMMENT_INVALID", message: "Комментарий должен содержать от 2 до 1000 символов." });
  }
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, userId: true, isHidden: true } });
  if (!review || review.isHidden) return res.status(404).json({ success: false, code: "REVIEW_NOT_FOUND", message: "Отзыв не найден." });
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.reviewComment.create({ data: { reviewId, authorId: req.user.id, text }, include: { author: { select: authorSelect } } });
    if (review.userId && review.userId !== req.user.id) {
      await tx.notification.create({ data: { userId: review.userId, type: "review", title: "Новый комментарий к отзыву", message: text.slice(0, 160), link: "/reviews" } });
    }
    await writeAudit(tx, { req, action: "review.comment_created", entityType: "ReviewComment", entityId: created.id, targetUserId: review.userId || undefined, after: { reviewId, text } });
    return created;
  });
  return res.status(201).json({ success: true, comment: { id: comment.id, text: comment.text, createdAt: comment.createdAt, author: publicAuthor(comment.author) } });
});

router.put("/:id/official-reply", authMiddleware, adminMiddleware, async (req, res) => {
  const reviewId = Number(req.params.id);
  const text = String(req.body?.text || "").trim();
  if (!Number.isInteger(reviewId) || reviewId <= 0 || text.length < 5 || text.length > 1500) {
    return res.status(400).json({ success: false, code: "OFFICIAL_REPLY_INVALID", message: "Ответ должен содержать от 5 до 1500 символов." });
  }
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, userId: true } });
  if (!review) return res.status(404).json({ success: false, code: "REVIEW_NOT_FOUND", message: "Отзыв не найден." });
  const reply = await prisma.$transaction(async (tx) => {
    const saved = await tx.reviewOfficialReply.upsert({
      where: { reviewId },
      update: { text, authorId: req.user.id },
      create: { reviewId, authorId: req.user.id, text },
      include: { author: { select: authorSelect } },
    });
    if (review.userId) await tx.notification.create({ data: { userId: review.userId, type: "review", title: "Frame School ответила на ваш отзыв", message: text.slice(0, 180), link: "/reviews" } });
    await writeAudit(tx, { req, action: "review.official_reply", entityType: "ReviewOfficialReply", entityId: saved.id, targetUserId: review.userId || undefined, after: { reviewId, text } });
    return saved;
  });
  return res.json({ success: true, officialReply: { id: reply.id, text: reply.text, label: staffLabel(reply.author), author: publicAuthor(reply.author) } });
});

router.patch("/:id/moderation", authMiddleware, adminMiddleware, async (req, res) => {
  const reviewId = Number(req.params.id);
  const isHidden = Boolean(req.body?.isHidden);
  if (!Number.isInteger(reviewId) || reviewId <= 0) return res.status(400).json({ success: false, code: "REVIEW_ID_INVALID", message: "Некорректный ID отзыва." });
  const previous = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!previous) return res.status(404).json({ success: false, code: "REVIEW_NOT_FOUND", message: "Отзыв не найден." });
  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: reviewId }, data: { isHidden } });
    await writeAudit(tx, { req, action: "review.moderated", entityType: "Review", entityId: reviewId, targetUserId: previous.userId || undefined, before: { isHidden: previous.isHidden }, after: { isHidden } });
  });
  return res.json({ success: true, message: isHidden ? "Отзыв скрыт." : "Отзыв опубликован." });
});

module.exports = router;
