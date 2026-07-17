const bcrypt = require("bcryptjs");
const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
  privilegedMiddleware,
} = require("../middleware/auth.middleware");
const {
  canManageRole,
  hasAnyRole,
  rolesFromUser,
  highestRole,
} = require("../utils/access");
const { writeAudit } = require("../utils/audit");
const { getPremiumAccess, reconcilePremiumForUser } = require("../services/premium.service");

router.use(authMiddleware, adminMiddleware);

function positiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseEndDate(body = {}) {
  if (body.endsAt) {
    const parsed = new Date(body.endsAt);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const minutes = Number(body.durationMinutes || 0);
  if (Number.isFinite(minutes) && minutes > 0) {
    return new Date(Date.now() + Math.min(minutes, 5256000) * 60 * 1000);
  }
  return null;
}

const adminUserSelect = {
  id: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  badges: true,
  accountStatus: true,
  isPremium: true,
  premiumPlan: true,
  premiumStarted: true,
  premiumUntil: true,
  createdAt: true,
  lastSeenAt: true,
  roles: { select: { role: true, grantedAt: true, grantedById: true } },
  bansReceived: {
    where: { status: "ACTIVE" },
    orderBy: { startsAt: "desc" },
    take: 1,
  },
  premiumOverride: true,
};

function serializeAdminUser(user) {
  const roles = rolesFromUser(user);
  return {
    ...user,
    roles,
    badges: roles,
    primaryRole: highestRole(roles),
    activeBan: user.bansReceived?.[0] || null,
    blockedAt: user.bansReceived?.[0]?.startsAt || null,
    blockedUntil: user.bansReceived?.[0]?.endsAt || null,
    blockedReason: user.bansReceived?.[0]?.reason || null,
  };
}

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [
      users, courses, reviews, applications, openSupport, activeUsers,
      newUsersMonth, completedLessonsMonth, premiumUsers, premiumRevenueMonth,
      activeBans, certificates,
    ] = await Promise.all([
      prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.review.count({ where: { isHidden: false } }),
      prisma.application.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.supportMessage.count({ where: { status: "open" } }),
      prisma.user.count({ where: { lastSeenAt: { gte: weekAgo }, accountStatus: "ACTIVE" } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.lessonProgress.count({ where: { completedAt: { gte: monthAgo } } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.paymentTransaction.aggregate({ where: { createdAt: { gte: monthAgo }, status: "paid" }, _sum: { amount: true } }),
      prisma.userBan.count({ where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] } }),
      prisma.certificate.count({ where: { status: "ACTIVE" } }),
    ]);
    const progressUsers = await prisma.lessonProgress.groupBy({ by: ["userId"], where: { completed: true } });
    return res.json({
      success: true,
      stats: {
        users, courses, reviews, applications, messages: openSupport, openSupport,
        activeUsers, newUsersMonth, completedSubmissionsMonth: completedLessonsMonth,
        premiumUsers, premiumRevenueMonth: premiumRevenueMonth._sum.amount || 0,
        activeBans, certificates,
        conversionRate: users ? Math.round((progressUsers.length / users) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error("[Admin] Stats failed", error?.stack || error);
    return res.status(500).json({ success: false, code: "ADMIN_STATS_FAILED", message: "Не удалось загрузить метрики." });
  }
});

router.get("/users", async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 100);
  const users = await prisma.user.findMany({
    where: query ? { OR: [{ username: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : undefined,
    select: adminUserSelect,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return res.json({ success: true, users: users.map(serializeAdminUser), data: users.map(serializeAdminUser) });
});

router.patch("/users/:id/roles", async (req, res) => {
  const userId = positiveId(req.params.id);
  const role = String(req.body?.role || "").toUpperCase();
  const enabled = req.body?.enabled !== false;
  if (!userId || !["ADMIN", "DEVELOPER", "OWNER"].includes(role)) {
    return res.status(400).json({ success: false, code: "ROLE_REQUEST_INVALID", message: "Укажите пользователя и допустимую роль." });
  }
  if (role === "OWNER") {
    return res.status(403).json({ success: false, code: "OWNER_CLI_REQUIRED", message: "Роль Owner изменяется только защищённым CLI-сценарием." });
  }
  if (!canManageRole(req.user.roles, role)) {
    return res.status(403).json({ success: false, code: "ROLE_GRANT_FORBIDDEN", message: "Недостаточно прав для изменения этой роли." });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { ...adminUserSelect, password: true } });
  if (!target) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  const beforeRoles = rolesFromUser(target);

  if (!enabled && userId === req.user.id) {
    const currentPassword = String(req.body?.currentPassword || "");
    if (!target.password || !(await bcrypt.compare(currentPassword, target.password))) {
      return res.status(403).json({ success: false, code: "PASSWORD_CONFIRMATION_REQUIRED", message: "Для снятия собственной роли подтвердите пароль." });
    }
  }

  const nextRoles = enabled
    ? [...new Set([...beforeRoles, role])]
    : beforeRoles.filter((entry) => entry !== role);
  await prisma.$transaction(async (tx) => {
    if (enabled) {
      await tx.userRole.upsert({
        where: { userId_role: { userId, role } },
        update: { grantedById: req.user.id, grantedAt: new Date() },
        create: { userId, role, grantedById: req.user.id },
      });
    } else {
      await tx.userRole.deleteMany({ where: { userId, role } });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        role: nextRoles.includes("ADMIN") || nextRoles.includes("DEVELOPER") || nextRoles.includes("OWNER") ? "ADMIN" : "USER",
        badges: nextRoles,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.notification.create({
      data: {
        userId,
        type: "role",
        title: "Права доступа обновлены",
        message: enabled ? `Вам назначена роль ${role}.` : `Роль ${role} снята.`,
        link: "/profile",
      },
    });
    await writeAudit(tx, {
      req, action: enabled ? "role.granted" : "role.revoked", entityType: "UserRole",
      entityId: `${userId}:${role}`, targetUserId: userId, before: { roles: beforeRoles }, after: { roles: nextRoles },
    });
  });
  const updated = await prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
  return res.json({ success: true, message: "Роли обновлены.", user: serializeAdminUser(updated) });
});

router.post("/users/:id/bans", async (req, res) => {
  const userId = positiveId(req.params.id);
  const reason = String(req.body?.reason || "").trim().slice(0, 500);
  const endsAt = parseEndDate(req.body || {});
  if (!userId || reason.length < 5 || endsAt === undefined) {
    return res.status(400).json({ success: false, code: "BAN_REQUEST_INVALID", message: "Укажите причину не короче 5 символов и корректную длительность." });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ success: false, code: "SELF_BAN_FORBIDDEN", message: "Нельзя заблокировать собственный аккаунт." });
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, roles: { select: { role: true } }, role: true, badges: true } });
  if (!target) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  if (hasAnyRole(target, ["OWNER", "DEVELOPER"])) {
    return res.status(403).json({ success: false, code: "PROTECTED_USER", message: "Owner и Developer защищены от блокировки." });
  }
  const existing = await prisma.userBan.findFirst({ where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] } });
  if (existing) return res.status(409).json({ success: false, code: "BAN_ALREADY_ACTIVE", message: "У пользователя уже есть активная блокировка." });

  const ban = await prisma.$transaction(async (tx) => {
    const created = await tx.userBan.create({ data: { userId, actorId: req.user.id, reason, endsAt } });
    await tx.user.update({
      where: { id: userId },
      data: { blockedAt: created.startsAt, blockedUntil: endsAt, blockedReason: reason, blockedById: req.user.id, sessionVersion: { increment: 1 } },
    });
    await tx.notification.create({ data: { userId, type: "ban", title: "Доступ ограничен", message: reason, link: "/support" } });
    await writeAudit(tx, { req, action: "ban.created", entityType: "UserBan", entityId: created.id, targetUserId: userId, after: { reason, endsAt } });
    return created;
  });
  return res.status(201).json({ success: true, message: "Блокировка применена, активные сессии завершены.", ban });
});

router.delete("/users/:id/bans/active", async (req, res) => {
  const userId = positiveId(req.params.id);
  if (!userId) return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "Некорректный ID пользователя." });
  const activeBan = await prisma.userBan.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { startsAt: "desc" } });
  if (!activeBan) return res.status(404).json({ success: false, code: "ACTIVE_BAN_NOT_FOUND", message: "Активная блокировка не найдена." });
  await prisma.$transaction(async (tx) => {
    await tx.userBan.update({ where: { id: activeBan.id }, data: { status: "REVOKED", revokedAt: new Date(), revokedById: req.user.id } });
    await tx.user.update({ where: { id: userId }, data: { blockedAt: null, blockedUntil: null, blockedReason: null, blockedById: null, sessionVersion: { increment: 1 } } });
    await tx.notification.create({ data: { userId, type: "ban", title: "Блокировка снята", message: "Доступ к аккаунту восстановлен.", link: "/profile" } });
    await writeAudit(tx, { req, action: "ban.revoked", entityType: "UserBan", entityId: activeBan.id, targetUserId: userId });
  });
  return res.json({ success: true, message: "Блокировка снята." });
});

router.get("/bans", async (req, res) => {
  const status = String(req.query.status || "").toUpperCase();
  const where = ["ACTIVE", "EXPIRED", "REVOKED"].includes(status) ? { status } : undefined;
  const bans = await prisma.userBan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: { select: { id: true, username: true, email: true } },
      actor: { select: { id: true, username: true } },
      revokedBy: { select: { id: true, username: true } },
    },
  });
  return res.json({ success: true, bans });
});

async function applyPremiumOverride(req, res, input) {
  const userId = positiveId(input.userId);
  const mode = String(input.mode || "").toUpperCase();
  const reason = String(input.reason || "").trim().slice(0, 500);
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (!userId || !["FORCE_ENABLED", "FORCE_DISABLED", "CLEAR"].includes(mode) || reason.length < 5 || (validUntil && Number.isNaN(validUntil.getTime()))) {
    return res.status(400).json({ success: false, code: "PREMIUM_OVERRIDE_INVALID", message: "Укажите режим, причину не короче 5 символов и корректную дату." });
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, premiumOverride: true } });
  if (!target) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  await prisma.$transaction(async (tx) => {
    if (mode === "CLEAR") {
      await tx.premiumOverride.deleteMany({ where: { userId } });
    } else {
      await tx.premiumOverride.upsert({
        where: { userId },
        update: { mode, validUntil, reason, actorId: req.user.id },
        create: { userId, mode, validUntil, reason, actorId: req.user.id },
      });
    }
    await tx.subscriptionEvent.create({
      data: {
        userId, actorId: req.user.id, type: `MANUAL_OVERRIDE_${mode}`,
        idempotencyKey: `override:${userId}:${Date.now()}:${req.user.id}`,
        payload: { reason, validUntil, warning: mode === "FORCE_DISABLED" ? "Provider billing is not cancelled" : null },
      },
    });
    await tx.notification.create({
      data: {
        userId, type: "premium", title: "Статус Premium изменён",
        message: mode === "FORCE_ENABLED" ? "Premium включён вручную." : mode === "FORCE_DISABLED" ? "Premium временно отключён. Это не отменяет оплату у провайдера." : "Ручная настройка Premium снята.",
        link: "/premium",
      },
    });
    await writeAudit(tx, { req, action: "premium.override", entityType: "PremiumOverride", entityId: userId, targetUserId: userId, before: target.premiumOverride || null, after: { mode, validUntil, reason } });
  });
  const access = await reconcilePremiumForUser(userId);
  return res.json({ success: true, message: mode === "FORCE_DISABLED" ? "Premium отключён вручную; подписка у провайдера не отменена." : "Настройка Premium обновлена.", data: access ? { active: access.active, status: access.status, paidUntil: access.paidUntil } : null });
}

router.post("/users/:id/premium-override", privilegedMiddleware, (req, res) =>
  applyPremiumOverride(req, res, { userId: req.params.id, ...req.body }).catch((error) => {
    console.error("[Admin] Premium override failed", error?.stack || error);
    res.status(500).json({ success: false, code: "PREMIUM_OVERRIDE_FAILED", message: "Не удалось изменить Premium." });
  }),
);

// Compatibility for the previous admin UI. Both endpoints still create an audited override.
router.post("/premium/grant", privilegedMiddleware, async (req, res) => {
  const userId = positiveId(req.body?.userId);
  const durationDays = positiveId(req.body?.durationDays) || 30;
  if (!userId) return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "Некорректный ID пользователя." });
  return applyPremiumOverride(req, res, {
    userId,
    mode: "FORCE_ENABLED",
    validUntil: new Date(Date.now() + durationDays * 86400000).toISOString(),
    reason: req.body?.reason || "Выдача Premium через панель управления",
  });
});

router.post("/premium/revoke", privilegedMiddleware, async (req, res) => {
  const userId = positiveId(req.body?.userId);
  if (!userId) return res.status(400).json({ success: false, code: "USER_ID_INVALID", message: "Некорректный ID пользователя." });
  return applyPremiumOverride(req, res, {
    userId,
    mode: "FORCE_DISABLED",
    reason: req.body?.reason || "Отключение Premium через панель управления",
  });
});

router.delete("/users/:id", async (req, res) => {
  const userId = positiveId(req.params.id);
  if (!userId || userId === req.user.id) return res.status(400).json({ success: false, code: "USER_DELETE_INVALID", message: "Нельзя деактивировать этот аккаунт." });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, roles: { select: { role: true } }, role: true, badges: true } });
  if (!target) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Пользователь не найден." });
  if (hasAnyRole(target, ["OWNER", "DEVELOPER"])) return res.status(403).json({ success: false, code: "PROTECTED_USER", message: "Owner и Developer нельзя деактивировать через панель." });
  await prisma.user.update({ where: { id: userId }, data: { accountStatus: "DEACTIVATED", deactivatedAt: new Date(), sessionVersion: { increment: 1 } } });
  return res.json({ success: true, message: "Аккаунт деактивирован; данные сохранены." });
});

module.exports = router;
