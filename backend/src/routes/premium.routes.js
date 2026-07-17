const crypto = require("crypto");
const express = require("express");
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const {
  getPremiumAccess,
  reconcilePremiumForUser,
  recordPaidSubscription,
  runPremiumMaintenance,
  randomIdempotencyKey,
} = require("../services/premium.service");
const { writeAudit } = require("../utils/audit");

const router = express.Router();

const PROVIDERS = Object.freeze({
  cloudpayments: {
    secretEnv: "CLOUDPAYMENTS_API_SECRET",
    currency: "RUB",
    amountEnv: "PREMIUM_AMOUNT_RUB",
    defaultAmount: 990,
  },
  tiptoppay: {
    secretEnv: "TIPTOPPAY_API_SECRET",
    currency: "KZT",
    amountEnv: "PREMIUM_AMOUNT_KZT",
    defaultAmount: 4990,
  },
});

function publicStatus(result) {
  return {
    userId: result.user.id,
    username: result.user.username,
    email: result.user.email,
    isPremium: result.active,
    premiumStatus: result.status,
    source: result.source,
    premiumPlan: result.plan,
    premiumStarted: result.user.premiumStarted,
    premiumUntil: result.paidUntil,
    graceUntil: result.graceUntil,
    needsPayment: result.status === "grace",
    override: result.override
      ? {
          mode: result.override.mode,
          validUntil: result.override.validUntil,
          reason: result.override.reason,
        }
      : null,
  };
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyProviderSignature(req, providerName) {
  const provider = PROVIDERS[providerName];
  const secret = String(process.env[provider.secretEnv] || "");
  if (!secret) return { valid: false, reason: "missing-secret" };

  const supplied = String(
    req.headers["content-hmac"] ||
      req.headers["x-content-hmac"] ||
      req.headers["x-frame-signature"] ||
      "",
  ).trim();
  if (!supplied) return { valid: false, reason: "missing-signature" };

  const payload = req.rawBody || Buffer.from(
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
  );
  const expectedBase64 = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  const expectedHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return {
    valid: secureEqual(supplied, expectedBase64) || secureEqual(supplied, expectedHex),
    reason: "signature-mismatch",
  };
}

function parseProviderPayload(body = {}) {
  let data = body.Data || body.data || {};
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }

  return {
    userId: Number(data.userId || body.userId || String(body.AccountId || "").replace(/\D/g, "")),
    transactionId: String(body.TransactionId || body.transactionId || body.InvoiceId || "").slice(0, 120),
    amount: Number(body.Amount ?? body.amount),
    currency: String(body.Currency || body.currency || "").toUpperCase(),
    status: String(body.Status || body.status || "Completed").toLowerCase(),
  };
}

async function handleProviderWebhook(req, res, providerName) {
  const config = PROVIDERS[providerName];
  const signature = verifyProviderSignature(req, providerName);
  if (!signature.valid) {
    console.warn("[Premium] Webhook rejected", { providerName, reason: signature.reason });
    return res.status(signature.reason === "missing-secret" ? 503 : 401).json({
      success: false,
      code: "PAYMENT_SIGNATURE_INVALID",
      message: "Webhook signature is invalid.",
    });
  }

  const payload = parseProviderPayload(req.body || {});
  const expectedAmount = Number(process.env[config.amountEnv] || config.defaultAmount);
  if (!Number.isInteger(payload.userId) || payload.userId <= 0 || !payload.transactionId) {
    return res.status(400).json({ success: false, code: "PAYMENT_PAYLOAD_INVALID", message: "Missing payment identifiers." });
  }
  if (payload.currency !== config.currency || payload.amount !== expectedAmount) {
    return res.status(400).json({
      success: false,
      code: "PAYMENT_AMOUNT_MISMATCH",
      message: "Payment amount or currency does not match the selected plan.",
    });
  }
  if (!["completed", "completed_successfully", "paid", "authorized"].includes(payload.status)) {
    return res.status(202).json({ success: true, accepted: false, message: "Payment is not completed yet." });
  }

  const result = await recordPaidSubscription({
    userId: payload.userId,
    provider: providerName,
    transactionId: payload.transactionId,
    amount: Math.round(payload.amount),
    currency: payload.currency,
    metadata: { event: req.body },
  });
  return res.json({ success: true, code: 0, reused: result.reused });
}

router.get("/configuration", (req, res) => {
  res.json({
    success: true,
    data: {
      kz: {
        provider: "tiptoppay",
        currency: "KZT",
        amount: Number(process.env.PREMIUM_AMOUNT_KZT || 4990),
        configured: Boolean(process.env.TIPTOPPAY_API_SECRET),
      },
      ru: {
        provider: "cloudpayments",
        currency: "RUB",
        amount: Number(process.env.PREMIUM_AMOUNT_RUB || 990),
        configured: Boolean(process.env.CLOUDPAYMENTS_API_SECRET),
      },
    },
  });
});

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const result = await reconcilePremiumForUser(req.user.id);
    if (!result) {
      return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
    }
    return res.json({ success: true, data: publicStatus(result) });
  } catch (error) {
    console.error("[Premium] Status failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "PREMIUM_STATUS_FAILED", message: "Не удалось проверить Premium." });
  }
});

router.get("/status/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "Некорректный ID пользователя." });
  }
  const result = await reconcilePremiumForUser(userId);
  return result
    ? res.json({ success: true, data: publicStatus(result) })
    : res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
});

router.post("/cloudpayments/pay", express.urlencoded({ extended: true }), (req, res) =>
  handleProviderWebhook(req, res, "cloudpayments").catch((error) => {
    console.error("[Premium] CloudPayments webhook failed", error?.stack || error);
    res.status(500).json({ success: false, code: "PAYMENT_WEBHOOK_FAILED", message: "Webhook processing failed." });
  }),
);

router.post("/tiptoppay/pay", express.urlencoded({ extended: true }), (req, res) =>
  handleProviderWebhook(req, res, "tiptoppay").catch((error) => {
    console.error("[Premium] TipTopPay webhook failed", error?.stack || error);
    res.status(500).json({ success: false, code: "PAYMENT_WEBHOOK_FAILED", message: "Webhook processing failed." });
  }),
);

router.post("/cancel", authMiddleware, async (req, res) => {
  const reason = String(req.body?.reason || "Отмена продления пользователем").trim().slice(0, 300);
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: req.user.id, status: { in: ["ACTIVE", "GRACE"] } },
  });
  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: req.user.id, status: { in: ["ACTIVE", "GRACE"] } },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
    await tx.subscriptionEvent.create({
      data: {
        userId: req.user.id,
        type: "RENEWAL_CANCELLATION_REQUESTED",
        idempotencyKey: randomIdempotencyKey(`cancel:${req.user.id}`),
        payload: { reason, retainedUntil: subscriptions[0]?.expiresAt || null },
      },
    });
    await writeAudit(tx, {
      req,
      action: "premium.cancel_requested",
      entityType: "Subscription",
      targetUserId: req.user.id,
      metadata: { reason },
    });
  });
  const result = await getPremiumAccess(req.user.id);
  return res.json({
    success: true,
    message: "Автопродление помечено как отменённое. Оплаченный доступ сохранён до конца периода.",
    data: publicStatus(result),
  });
});

async function requirePremiumAccess(req, res, next) {
  try {
    const result = await reconcilePremiumForUser(req.user.id);
    if (!result?.active) {
      return res.status(402).json({ success: false, code: "PREMIUM_REQUIRED", message: "Для доступа нужен активный Premium." });
    }
    req.premium = result;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get("/features", authMiddleware, requirePremiumAccess, (req, res) => {
  res.json({
    success: true,
    data: { webinars: true, mentorReview: true, portfolioPack: true, verifiedCertificate: true },
  });
});

router.post("/maintenance/expire", authMiddleware, adminMiddleware, async (req, res) => {
  const result = await runPremiumMaintenance();
  return res.json({ success: true, data: result });
});

router.expireOverduePremiumAccess = runPremiumMaintenance;
router.requirePremiumAccess = requirePremiumAccess;

module.exports = router;
