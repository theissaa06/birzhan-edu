const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

const PREMIUM_PLAN = "Premium PRO";
const DEFAULT_AMOUNT = 4990;
const DEFAULT_CURRENCY = "KZT";
const PREMIUM_DAYS = 30;
const PREMIUM_GRACE_DAYS = 1;
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "cloudpayments";

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPremiumWindow(user, now = new Date()) {
  if (!user?.premiumUntil) {
    return {
      paidUntil: null,
      graceUntil: null,
      isPaidActive: false,
      isGracePeriod: false,
      isAccessActive: false,
      status: "free",
    };
  }

  const paidUntil = new Date(user.premiumUntil);
  const graceUntil = addDays(paidUntil, PREMIUM_GRACE_DAYS);
  const isPaidActive = paidUntil > now;
  const isGracePeriod = !isPaidActive && graceUntil > now;

  return {
    paidUntil,
    graceUntil,
    isPaidActive,
    isGracePeriod,
    isAccessActive: isPaidActive || isGracePeriod,
    status: isPaidActive ? "active" : isGracePeriod ? "grace" : "expired",
  };
}

function hasPremiumAccess(user) {
  if (user.role === "ADMIN") return true;
  return getPremiumWindow(user).isAccessActive;
}

function isPaidPremiumActive(user) {
  if (!user.premiumUntil) return false;
  return getPremiumWindow(user).isAccessActive;
}

function toPremiumStatus(user) {
  const window = getPremiumWindow(user);
  const adminAccess = user.role === "ADMIN" && !user.premiumUntil;
  const active = adminAccess ? false : window.isAccessActive;

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isPremium: active,
    adminAccess,
    premiumStatus: adminAccess ? "admin" : window.status,
    isGracePeriod: window.isGracePeriod,
    premiumPlan: active ? user.premiumPlan || PREMIUM_PLAN : null,
    premiumStarted: user.premiumStarted,
    premiumUntil: user.premiumUntil,
    graceUntil: window.graceUntil,
    needsPayment: window.isGracePeriod,
  };
}

function isOwnerOrAdmin(user, reqUser) {
  if (reqUser?.role === "ADMIN" || user?.role === "ADMIN") return true;
  const ownerId = Number(process.env.OWNER_ID || 0);
  const ownerEmail = String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
  return (
    (ownerId > 0 && user?.id === ownerId) ||
    (ownerEmail && String(user?.email || "").toLowerCase() === ownerEmail)
  );
}

function getCloudPaymentsUserId(body = {}) {
  const rawData = body.Data || body.data || {};
  const parsedData =
    typeof rawData === "string"
      ? (() => {
          try {
            return JSON.parse(rawData);
          } catch {
            return {};
          }
        })()
      : rawData;

  return Number(parsedData.userId || body.AccountId?.replace?.(/\D/g, "") || body.userId);
}

function verifyCloudPaymentsRequest(req) {
  const secret = process.env.CLOUDPAYMENTS_API_SECRET;
  if (!secret) return false;

  const frameSecret = req.headers["x-frame-payment-secret"];
  if (frameSecret && frameSecret === secret) return true;

  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const [, password] = decoded.split(":");
    return password === secret;
  } catch {
    return false;
  }
}

function requiresWebhookActivation(provider) {
  const normalizedProvider = String(provider || "").toLowerCase();
  return ["cloudpayments", "tiptoppay"].some((name) =>
    normalizedProvider.includes(name),
  );
}

async function activatePremiumTransaction(tx, {
  userId,
  provider,
  transactionId,
  amount,
  currency,
  plan,
  metadata,
}) {
  const existingTransaction = await tx.paymentTransaction.findUnique({
    where: {
      provider_transactionId: {
        provider,
        transactionId,
      },
    },
  });

  if (existingTransaction) {
    const currentUser = await tx.user.findUnique({ where: { id: userId } });
    return { user: currentUser, reused: true };
  }

  const now = new Date();
  const currentUser = await tx.user.findUnique({
    where: { id: userId },
    select: { premiumUntil: true },
  });
  const currentUntil = currentUser?.premiumUntil
    ? new Date(currentUser.premiumUntil)
    : null;
  const periodStart = currentUntil && currentUntil > now ? currentUntil : now;
  const premiumUntil = addDays(periodStart, PREMIUM_DAYS);

  await tx.paymentTransaction.create({
    data: {
      userId,
      provider,
      transactionId,
      plan,
      amount,
      currency,
      status: "paid",
      metadata,
    },
  });

  const user = await tx.user.update({
    where: { id: userId },
    data: {
      premiumPlan: plan,
      premiumStarted: now,
      premiumUntil,
    },
  });

  return { user, reused: false };
}

async function expireOverduePremiumAccess(client = prisma) {
  const cutoff = addDays(new Date(), -PREMIUM_GRACE_DAYS);

  const result = await client.user.updateMany({
    where: {
      premiumUntil: { lte: cutoff },
      OR: [
        { premiumPlan: { not: null } },
        { premiumStarted: { not: null } },
      ],
    },
    data: {
      premiumPlan: null,
      premiumStarted: null,
      premiumUntil: null,
    },
  });

  if (result.count > 0) {
    console.log("[Premium] Expired overdue subscriptions", {
      count: result.count,
      cutoff: cutoff.toISOString(),
    });
  }

  return result;
}

async function getUserOr404(userId, res) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      premiumPlan: true,
      premiumStarted: true,
      premiumUntil: true,
    },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "Пользователь не найден.",
    });
    return null;
  }

  return user;
}

function requirePremiumAccess(req, res, next) {
  if (req.user?.role === "ADMIN") return next();

  return prisma.user
    .findUnique({
      where: { id: req.user.id },
      select: { role: true, premiumUntil: true },
    })
    .then((user) => {
      if (!user || !isPaidPremiumActive(user)) {
        return res.status(402).json({
          success: false,
          message: "Для доступа нужен активный Premium PRO.",
        });
      }

      return next();
    })
    .catch((error) => {
      console.error("[Premium] Ошибка проверки доступа", {
        error: error?.message || error,
        userId: req.user?.id,
      });

      return res.status(500).json({
        success: false,
        message: "Ошибка проверки Premium-доступа.",
      });
    });
}

router.get("/status", authMiddleware, async (req, res) => {
  try {
    await expireOverduePremiumAccess();

    const user = await getUserOr404(req.user.id, res);
    if (!user) return;

    return res.json({
      success: true,
      data: toPremiumStatus(user),
    });
  } catch (error) {
    console.error("[Premium] Ошибка статуса", {
      error: error?.message || error,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка при проверке Premium-статуса.",
    });
  }
});

router.get("/status/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await expireOverduePremiumAccess();

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя.",
      });
    }

    const user = await getUserOr404(userId, res);
    if (!user) return;

    return res.json({
      success: true,
      data: toPremiumStatus(user),
    });
  } catch (error) {
    console.error("[Premium] Ошибка статуса пользователя", {
      error: error?.message || error,
      requesterId: req.user?.id,
      targetId: req.params.userId,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка при проверке Premium-статуса.",
    });
  }
});

router.post("/activate", authMiddleware, async (req, res) => {
  try {
    const {
      transactionId,
      provider = "demo",
      amount = DEFAULT_AMOUNT,
      currency = DEFAULT_CURRENCY,
      plan = PREMIUM_PLAN,
    } = req.body || {};

    const safeProvider = String(provider || "demo").trim().slice(0, 64);
    const safePlan = String(plan || PREMIUM_PLAN).trim().slice(0, 80);
    const safeCurrency = String(currency || DEFAULT_CURRENCY).trim().slice(0, 8);
    const safeAmount = Number.isInteger(Number(amount))
      ? Number(amount)
      : DEFAULT_AMOUNT;
    const safeTransactionId = String(
      transactionId || `${safeProvider}-${req.user.id}-${Date.now()}`,
    )
      .trim()
      .slice(0, 120);

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true },
    });

    const devOverrideAllowed =
      process.env.ALLOW_PREMIUM_DEV_OVERRIDE === "true" &&
      isOwnerOrAdmin(currentUser, req.user);

    if (
      PAYMENT_PROVIDER === "cloudpayments" &&
      requiresWebhookActivation(safeProvider) &&
      !devOverrideAllowed
    ) {
      return res.status(202).json({
        success: false,
        message:
          "Оплата должна подтверждаться серверным webhook CloudPayments. Если деньги списались, Premium активируется после подтверждения платежа.",
      });
    }

    if (safeProvider === "demo" && !devOverrideAllowed) {
      return res.status(403).json({
        success: false,
        message: "Demo-активация Premium доступна только владельцу или администратору.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      return activatePremiumTransaction(tx, {
        userId: req.user.id,
        provider: safeProvider,
        transactionId: safeTransactionId,
        plan: safePlan,
        amount: safeAmount,
        currency: safeCurrency,
        metadata: { source: "manual-activate" },
      });
    });

    return res.json({
      success: true,
      message: result.reused
        ? "Premium уже был активирован по этой транзакции."
        : "Premium PRO успешно активирован.",
      data: toPremiumStatus(result.user),
    });
  } catch (error) {
    console.error("[Premium] Ошибка активации", {
      error: error?.message || error,
      userId: req.user?.id,
      provider: req.body?.provider,
      transactionId: req.body?.transactionId,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка при активации Premium.",
    });
  }
});

router.post("/cloudpayments/pay", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    if (!verifyCloudPaymentsRequest(req)) {
      return res.status(401).json({ code: 13, message: "Unauthorized webhook" });
    }

    const userId = getCloudPaymentsUserId(req.body || {});
    const transactionId = String(
      req.body.TransactionId ||
        req.body.transactionId ||
        req.body.InvoiceId ||
        `cloudpayments-${Date.now()}`,
    ).slice(0, 120);
    const amount = Number(req.body.Amount || req.body.amount || DEFAULT_AMOUNT);
    const currency = String(req.body.Currency || req.body.currency || DEFAULT_CURRENCY).slice(0, 8);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.json({ code: 10, message: "Invalid userId" });
    }

    const result = await prisma.$transaction((tx) =>
      activatePremiumTransaction(tx, {
        userId,
        provider: "cloudpayments",
        transactionId,
        amount: Number.isFinite(amount) ? Math.round(amount) : DEFAULT_AMOUNT,
        currency,
        plan: PREMIUM_PLAN,
        metadata: req.body || {},
      }),
    );

    if (!result.user) {
      return res.json({ code: 10, message: "User not found" });
    }

    return res.json({ code: 0 });
  } catch (error) {
    console.error("[Premium] CloudPayments webhook error", {
      error: error?.message || error,
      body: req.body,
    });

    return res.json({ code: 13, message: "Webhook processing error" });
  }
});

router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          userId: req.user.id,
          provider: "internal",
          transactionId: `cancel-${req.user.id}-${Date.now()}`,
          plan: PREMIUM_PLAN,
          amount: 0,
          currency: DEFAULT_CURRENCY,
          status: "cancelled",
        },
      });

      return tx.user.update({
        where: { id: req.user.id },
        data: {
          premiumPlan: null,
          premiumStarted: null,
          premiumUntil: null,
        },
      });
    });

    return res.json({
      success: true,
      message: "Premium PRO отключён.",
      data: toPremiumStatus(user),
    });
  } catch (error) {
    console.error("[Premium] Ошибка отключения", {
      error: error?.message || error,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка при отключении Premium.",
    });
  }
});

router.get("/features", authMiddleware, requirePremiumAccess, async (req, res) => {
  res.json({
    success: true,
    data: {
      webinars: true,
      mentorReview: true,
      portfolioPack: true,
      verifiedCertificate: true,
    },
  });
});

router.post("/maintenance/expire", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await expireOverduePremiumAccess();
    return res.json({
      success: true,
      expiredCount: result.count,
    });
  } catch (error) {
    console.error("[Premium] Ошибка maintenance expire", {
      error: error?.message || error,
      adminId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка проверки истёкших Premium-подписок.",
    });
  }
});

router.expireOverduePremiumAccess = expireOverduePremiumAccess;

module.exports = router;
