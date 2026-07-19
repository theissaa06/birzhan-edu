const crypto = require("crypto");
const prisma = require("../config/prisma");

const PREMIUM_GRACE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;

function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * 24 * 60 * 60 * 1000);
}

function overrideIsCurrent(override, now) {
  return Boolean(override && (!override.validUntil || new Date(override.validUntil) > now));
}

function evaluatePremiumRecord(user, now = new Date()) {
  const override = user.premiumOverride;
  const overrideCurrent = overrideIsCurrent(override, now);

  if (overrideCurrent && override.mode === "FORCE_DISABLED") {
    return {
      active: false,
      status: "force_disabled",
      source: "manual",
      plan: null,
      paidUntil: null,
      graceUntil: null,
      override,
    };
  }

  if (overrideCurrent && override.mode === "FORCE_ENABLED") {
    return {
      active: true,
      status: "force_enabled",
      source: "manual",
      plan: "Premium PRO",
      paidUntil: override.validUntil || null,
      graceUntil: null,
      override,
    };
  }

  const subscription = (user.subscriptions || [])
    .filter((entry) => entry.status !== "EXPIRED")
    .sort((a, b) => new Date(b.expiresAt || 0) - new Date(a.expiresAt || 0))[0];

  if (subscription?.expiresAt) {
    const paidUntil = new Date(subscription.expiresAt);
    const graceUntil = subscription.graceUntil
      ? new Date(subscription.graceUntil)
      : new Date(paidUntil.getTime() + PREMIUM_GRACE_MS);

    if (paidUntil > now) {
      return {
        active: true,
        status: "active",
        source: "subscription",
        plan: subscription.plan,
        paidUntil,
        graceUntil,
        subscription,
      };
    }
    if (graceUntil > now) {
      return {
        active: true,
        status: "grace",
        source: "subscription",
        plan: subscription.plan,
        paidUntil,
        graceUntil,
        subscription,
      };
    }
  }

  // Expand-migration compatibility for a legacy premium period.
  if (!subscription && user.premiumUntil) {
    const paidUntil = new Date(user.premiumUntil);
    const graceUntil = new Date(paidUntil.getTime() + PREMIUM_GRACE_MS);
    if (paidUntil > now || graceUntil > now) {
      return {
        active: true,
        status: paidUntil > now ? "active" : "grace",
        source: "legacy",
        plan: user.premiumPlan || "Premium PRO",
        paidUntil,
        graceUntil,
      };
    }
  }

  return {
    active: false,
    status: "free",
    source: null,
    plan: null,
    paidUntil: null,
    graceUntil: null,
    override: overrideCurrent ? override : null,
  };
}

const premiumInclude = {
  premiumOverride: {
    include: {
      actor: {
        select: {
          id: true,
          role: true,
          badges: true,
          roles: { select: { role: true } },
        },
      },
    },
  },
  subscriptions: {
    orderBy: { expiresAt: "desc" },
    take: 5,
  },
};

async function getPremiumAccess(userId, client = prisma, now = new Date()) {
  const user = await client.user.findUnique({
    where: { id: Number(userId) },
    include: premiumInclude,
  });
  return user ? { user, ...evaluatePremiumRecord(user, now) } : null;
}

async function reconcilePremiumForUser(userId, client = prisma, now = new Date()) {
  const result = await getPremiumAccess(userId, client, now);
  if (!result) return null;

  const subscription = result.subscription;
  if (subscription && subscription.status !== "CANCELED") {
    const nextStatus = result.status === "active"
      ? "ACTIVE"
      : result.status === "grace"
        ? "GRACE"
        : "EXPIRED";
    if (subscription.status !== nextStatus) {
      await client.subscription.update({
        where: { id: subscription.id },
        data: { status: nextStatus },
      });
      await client.subscriptionEvent.upsert({
        where: { idempotencyKey: `${nextStatus.toLowerCase()}:${subscription.id}:${subscription.expiresAt?.toISOString() || "none"}` },
        update: {},
        create: {
          subscriptionId: subscription.id,
          userId: result.user.id,
          type: `SUBSCRIPTION_${nextStatus}`,
          idempotencyKey: `${nextStatus.toLowerCase()}:${subscription.id}:${subscription.expiresAt?.toISOString() || "none"}`,
          payload: { evaluatedAt: now.toISOString() },
        },
      });
    }
  }

  await client.user.update({
    where: { id: result.user.id },
    data: {
      isPremium: result.active,
      premiumPlan: result.active ? result.plan : null,
      premiumUntil: result.paidUntil || null,
      premiumStarted: result.active
        ? result.subscription?.startedAt || result.user.premiumStarted || now
        : null,
    },
  });

  return result;
}

async function runPremiumMaintenance(client = prisma, now = new Date()) {
  const candidates = await client.user.findMany({
    where: {
      OR: [
        { isPremium: true },
        { premiumUntil: { not: null } },
        { subscriptions: { some: { status: { in: ["ACTIVE", "GRACE"] } } } },
        { premiumOverride: { is: { validUntil: { lte: now } } } },
      ],
    },
    select: { id: true },
  });

  const settled = await Promise.allSettled(
    candidates.map((user) => reconcilePremiumForUser(user.id, client, now)),
  );
  return {
    checked: candidates.length,
    failed: settled.filter((entry) => entry.status === "rejected").length,
  };
}

async function recordPaidSubscription({
  userId,
  provider,
  transactionId,
  amount,
  currency,
  plan = "Premium PRO",
  periodDays = DEFAULT_PERIOD_DAYS,
  metadata,
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentTransaction.findUnique({
      where: { provider_transactionId: { provider, transactionId } },
    });
    if (existing) {
      return { reused: true, access: await getPremiumAccess(existing.userId, tx) };
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });

    const latest = await tx.subscription.findFirst({
      where: { userId, provider, status: { in: ["ACTIVE", "GRACE"] } },
      orderBy: { expiresAt: "desc" },
    });
    const now = new Date();
    const startsAt = latest?.expiresAt && new Date(latest.expiresAt) > now
      ? new Date(latest.expiresAt)
      : now;
    const expiresAt = addDays(startsAt, periodDays);
    const graceUntil = new Date(expiresAt.getTime() + PREMIUM_GRACE_MS);

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

    const subscription = latest
      ? await tx.subscription.update({
          where: { id: latest.id },
          data: { plan, price: amount, currency, status: "ACTIVE", expiresAt, graceUntil },
        })
      : await tx.subscription.create({
          data: {
            userId,
            plan,
            price: amount,
            currency,
            status: "ACTIVE",
            startedAt: now,
            expiresAt,
            graceUntil,
            provider,
            providerId: `${provider}:${userId}:${transactionId}`,
          },
        });

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        type: "PAYMENT_CONFIRMED",
        idempotencyKey: `payment:${provider}:${transactionId}`,
        payload: { amount, currency, plan },
      },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "premium",
        title: "Premium активирован",
        message: `Доступ ${plan} действует до ${expiresAt.toLocaleDateString("ru-RU")}.`,
        link: "/premium",
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumPlan: plan,
        premiumStarted: user.premiumStarted || now,
        premiumUntil: expiresAt,
      },
    });

    return { reused: false, subscription, access: await getPremiumAccess(userId, tx) };
  });
}

function randomIdempotencyKey(prefix) {
  return `${prefix}:${crypto.randomUUID()}`;
}

module.exports = {
  PREMIUM_GRACE_MS,
  DEFAULT_PERIOD_DAYS,
  addDays,
  evaluatePremiumRecord,
  getPremiumAccess,
  reconcilePremiumForUser,
  runPremiumMaintenance,
  recordPaidSubscription,
  randomIdempotencyKey,
};
