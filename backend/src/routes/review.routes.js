const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { rolesFromUser, highestRole } = require("../utils/access");
const { writeAudit } = require("../utils/audit");
const { avatarData } = require("../services/avatar.service");

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn("[Reviews] Write rate limited", {
      endpoint: `${req.method} ${req.originalUrl || req.url}`,
      userId: req.user?.id || null,
      timestamp: new Date().toISOString(),
      reason: "rate_limit",
    });
    return res.status(429).json({ success: false, code: "REVIEW_RATE_LIMIT", message: "Слишком много действий. Повторите позже." });
  },
});

const authorSelect = {
  id: true,
  username: true,
  role: true,
  badges: true,
  avatar: { select: { kind: true, presetId: true, updatedAt: true } },
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
  if (role === "OWNER" || role === "DEVELOPER") return "Ответ разработчика";
  return "Ответ администрации";
}

function publicAuthor(user) {
  return user ? { id: user.id, username: user.username, roles: rolesFromUser(user), ...avatarData(user) } : null;
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
    res.set("Cache-Control", "no-store, max-age=0");
    res.set("Surrogate-Control", "no-store");
    res.vary("Authorization");
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
  const timestamp = new Date().toISOString();
  try {
    const text = String(req.body?.text || "").trim();
    const rating = Number(req.body?.rating);
    const direction = String(req.body?.direction || "").trim().slice(0, 120) || null;
    if (text.length < 20 || text.length > 1500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      console.warn("[Reviews] Write rejected", { endpoint: "POST /api/reviews", userId: req.user.id, timestamp, reason: "validation_failed" });
      return res.status(400).json({ success: false, code: "REVIEW_INVALID", message: "Напишите от 20 до 1500 символов и поставьте оценку от 1 до 5." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, username: true } });
    if (!user) {
      console.warn("[Reviews] Write rejected", { endpoint: "POST /api/reviews", userId: req.user.id, timestamp, reason: "user_not_found" });
      return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.review.findUnique({ where: { userId: user.id } });
      const review = await tx.review.upsert({
        where: { userId: user.id },
        create: { userId: user.id, name: user.username, text, rating, direction },
        update: { name: user.username, text, rating, direction, isHidden: false },
        include: reviewInclude,
      });
      const operation = previous ? "updated" : "created";
      await writeAudit(tx, { req, action: `review.${operation}`, entityType: "Review", entityId: review.id, targetUserId: user.id, before: previous || undefined, after: { text, rating, direction } });
      return { review, operation };
    });

    console.info("[Reviews] Write succeeded", {
      endpoint: "POST /api/reviews",
      userId: user.id,
      reviewId: result.review.id,
      operation: result.operation,
      timestamp,
    });
    return res.status(result.operation === "updated" ? 200 : 201).json({
      success: true,
      operation: result.operation,
      message: result.operation === "updated" ? "Отзыв обновлён." : "Отзыв опубликован.",
      review: serialize(result.review),
    });
  } catch (error) {
    console.error("[Reviews] Write failed", {
      endpoint: "POST /api/reviews",
      userId: req.user?.id || null,
      timestamp,
      reason: error?.message || String(error),
      stack: error?.stack,
    });
    return res.status(500).json({ success: false, code: "REVIEW_SAVE_FAILED", message: "Не удалось сохранить отзыв. Повторите попытку позже." });
  }
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

router.put("/:id/official-reply", authMiddleware, adminMiddleware, writeLimiter, async (req, res) => {
  const timestamp = new Date().toISOString();
  const reviewId = Number(req.params.id);
  const text = String(req.body?.text || "").trim();

  try {
    if (!Number.isInteger(reviewId) || reviewId <= 0 || text.length < 5 || text.length > 1500) {
      return res.status(400).json({ success: false, code: "OFFICIAL_REPLY_INVALID", message: "Ответ должен содержать от 5 до 1500 символов." });
    }

    const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, userId: true } });
    if (!review) return res.status(404).json({ success: false, code: "REVIEW_NOT_FOUND", message: "Отзыв не найден." });

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.reviewOfficialReply.findUnique({
        where: { reviewId },
        include: { author: { select: authorSelect } },
      });

      if (previous && previous.text === text && previous.authorId === req.user.id) {
        return { reply: previous, operation: "unchanged" };
      }

      const reply = await tx.reviewOfficialReply.upsert({
        where: { reviewId },
        update: { text, authorId: req.user.id },
        create: { reviewId, authorId: req.user.id, text },
        include: { author: { select: authorSelect } },
      });
      const operation = previous ? "updated" : "created";

      if (review.userId) {
        await tx.notification.create({
          data: {
            userId: review.userId,
            type: "review",
            title: operation === "created" ? "Frame School ответила на ваш отзыв" : "Frame School обновила ответ на ваш отзыв",
            message: text.slice(0, 180),
            link: "/reviews",
          },
        });
      }
      await writeAudit(tx, {
        req,
        action: `review.official_reply_${operation}`,
        entityType: "ReviewOfficialReply",
        entityId: reply.id,
        targetUserId: review.userId || undefined,
        before: previous ? { text: previous.text, authorId: previous.authorId } : undefined,
        after: { reviewId, text, authorId: req.user.id, label: staffLabel(reply.author) },
      });
      return { reply, operation };
    });

    console.info("[Reviews] Official reply saved", {
      endpoint: `PUT /api/reviews/${reviewId}/official-reply`,
      reviewId,
      actorId: req.user.id,
      operation: result.operation,
      timestamp,
    });
    return res.json({
      success: true,
      operation: result.operation,
      message: result.operation === "created" ? "Официальный ответ опубликован." : result.operation === "updated" ? "Официальный ответ обновлён." : "Официальный ответ уже актуален.",
      officialReply: {
        id: result.reply.id,
        text: result.reply.text,
        createdAt: result.reply.createdAt,
        updatedAt: result.reply.updatedAt,
        label: staffLabel(result.reply.author),
        author: publicAuthor(result.reply.author),
      },
    });
  } catch (error) {
    console.error("[Reviews] Official reply failed", {
      endpoint: `PUT /api/reviews/${reviewId || req.params.id}/official-reply`,
      reviewId: Number.isInteger(reviewId) ? reviewId : null,
      actorId: req.user?.id || null,
      timestamp,
      reason: error?.message || String(error),
      stack: error?.stack,
    });
    return res.status(500).json({ success: false, code: "OFFICIAL_REPLY_SAVE_FAILED", message: "Не удалось сохранить официальный ответ. Повторите попытку позже." });
  }
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

router.delete("/:id", authMiddleware, adminMiddleware, writeLimiter, async (req, res) => {
  const reviewId = Number(req.params.id);
  const timestamp = new Date().toISOString();
  try {
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ success: false, code: "REVIEW_ID_INVALID", message: "Некорректный ID отзыва." });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true, userId: true, name: true, text: true, rating: true, direction: true, isHidden: true,
        _count: { select: { comments: true } },
        officialReply: { select: { id: true } },
      },
    });
    if (!review) return res.status(404).json({ success: false, code: "REVIEW_NOT_FOUND", message: "Отзыв уже удалён или не существует." });

    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, {
        req,
        action: "review.deleted",
        entityType: "Review",
        entityId: review.id,
        targetUserId: review.userId || undefined,
        before: {
          name: review.name, text: review.text, rating: review.rating, direction: review.direction,
          isHidden: review.isHidden, comments: review._count.comments, hadOfficialReply: Boolean(review.officialReply),
        },
        after: { deleted: true },
      });
      if (review.userId && review.userId !== req.user.id) {
        await tx.notification.create({
          data: {
            userId: review.userId,
            type: "review",
            title: "Отзыв удалён модератором",
            message: "Отзыв удалён вместе с комментариями и официальным ответом.",
            link: "/reviews",
          },
        });
      }
      await tx.review.delete({ where: { id: review.id } });
    });

    console.info("[Reviews] Review permanently deleted", { endpoint: `DELETE /api/reviews/${reviewId}`, reviewId, actorId: req.user.id, timestamp });
    return res.json({ success: true, deletedId: reviewId, message: "Отзыв удалён навсегда." });
  } catch (error) {
    console.error("[Reviews] Permanent delete failed", { endpoint: `DELETE /api/reviews/${reviewId || req.params.id}`, reviewId: Number.isInteger(reviewId) ? reviewId : null, actorId: req.user?.id || null, timestamp, reason: error?.message || String(error), stack: error?.stack });
    return res.status(500).json({ success: false, code: "REVIEW_DELETE_FAILED", message: "Не удалось удалить отзыв. Повторите попытку позже." });
  }
});

module.exports = router;
