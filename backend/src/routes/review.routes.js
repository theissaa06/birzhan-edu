const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

const reviewWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Слишком много изменений отзыва. Попробуйте снова через 15 минут.",
  },
});

const reviewUserSelect = {
  id: true,
  username: true,
  role: true,
  badges: true,
  premiumUntil: true,
};

function isPremiumActive(premiumUntil) {
  return Boolean(premiumUntil && new Date(premiumUntil) > new Date());
}

function serializeReview(review) {
  const user = review.user || null;
  const badges = new Set(
    Array.isArray(user?.badges)
      ? user.badges.map((badge) => String(badge).toUpperCase())
      : [],
  );

  if (user?.role === "ADMIN") badges.add("ADMIN");
  if (isPremiumActive(user?.premiumUntil)) badges.add("PREMIUM");

  return {
    id: review.id,
    name: user?.username || review.name,
    text: review.text,
    rating: review.rating,
    direction: review.direction,
    badges: Array.from(badges),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt || review.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: reviewUserSelect } },
    });

    return res.json({
      success: true,
      reviews: reviews.map(serializeReview),
    });
  } catch (error) {
    console.error("[Reviews] Failed to load reviews", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      message: "Не удалось загрузить отзывы.",
    });
  }
});

router.post("/", authMiddleware, reviewWriteLimiter, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const rating = Number(req.body?.rating);
    const direction = req.body?.direction
      ? String(req.body.direction).trim().slice(0, 120)
      : null;

    if (
      text.length < 20 ||
      text.length > 1500 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Напишите от 20 до 1500 символов и поставьте оценку от 1 до 5.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: reviewUserSelect,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден.",
      });
    }

    const review = await prisma.review.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: user.username,
        text,
        rating,
        direction,
      },
      update: {
        name: user.username,
        text,
        rating,
        direction,
      },
      include: { user: { select: reviewUserSelect } },
    });

    return res.status(200).json({
      success: true,
      message: "Отзыв опубликован. Повторная отправка обновит его.",
      review: serializeReview(review),
    });
  } catch (error) {
    console.error("[Reviews] Failed to save review", {
      error: error?.message || error,
      userId: req.user?.id || null,
    });
    return res.status(500).json({
      success: false,
      message: "Не удалось сохранить отзыв.",
    });
  }
});

module.exports = router;
