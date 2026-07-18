const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const {
  STAFF_ROLES,
  hasAnyRole,
  highestRole,
  normalizeRoles,
  rolesFromUser,
} = require("../utils/access");

function apiError(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra });
}

function isActiveBan(ban, now = new Date()) {
  if (!ban || ban.status !== "ACTIVE") return false;
  return !ban.endsAt || new Date(ban.endsAt) > now;
}

async function expireBanIfNeeded(user, now) {
  const ban = user.bansReceived?.[0];
  if (!ban || ban.status !== "ACTIVE" || !ban.endsAt || new Date(ban.endsAt) > now) {
    return ban;
  }

  await prisma.$transaction([
    prisma.userBan.update({
      where: { id: ban.id },
      data: { status: "EXPIRED" },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        blockedAt: null,
        blockedUntil: null,
        blockedReason: null,
        blockedById: null,
      },
    }),
  ]);
  return null;
}

const authMiddleware = async (req, res, next) => {
  let decoded = null;

  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return apiError(res, 401, "AUTH_TOKEN_REQUIRED", "Требуется авторизация.");
    }

    const token = authHeader.slice(7).trim();
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return apiError(res, 401, "AUTH_TOKEN_INVALID", "Сессия недействительна.");
    }

    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        id: true,
        email: true,
        role: true,
        badges: true,
        accountStatus: true,
        deactivatedAt: true,
        sessionVersion: true,
        blockedAt: true,
        blockedUntil: true,
        blockedReason: true,
        roles: { select: { role: true } },
        bansReceived: {
          where: { status: "ACTIVE" },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { id: true, reason: true, status: true, startsAt: true, endsAt: true },
        },
      },
    });

    if (!user || Number(decoded.sessionVersion || 0) !== user.sessionVersion) {
      return apiError(res, 401, "AUTH_SESSION_EXPIRED", "Сессия устарела. Войдите снова.");
    }

    if (user.accountStatus === "DEACTIVATED") {
      return apiError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Аккаунт деактивирован. Его можно восстановить на странице входа.",
        { deactivatedAt: user.deactivatedAt },
      );
    }

    const activeBan = await expireBanIfNeeded(user, now);
    if (isActiveBan(activeBan, now)) {
      return apiError(res, 403, "ACCOUNT_BANNED", "Аккаунт временно заблокирован.", {
        banned: true,
        reason: activeBan.reason,
        bannedUntil: activeBan.endsAt,
      });
    }

    const roles = rolesFromUser(user);
    req.user = {
      id: user.id,
      email: user.email,
      roles,
      primaryRole: highestRole(roles),
      role: roles.includes("ADMIN") ? "ADMIN" : "USER",
      isAdmin: hasAnyRole(roles, STAFF_ROLES),
      sessionVersion: user.sessionVersion,
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: now },
    }).catch((error) => {
      console.warn("[AuthMiddleware] Failed to update lastSeenAt", {
        endpoint: `${req.method} ${req.originalUrl || req.url}`,
        userId: user.id,
        timestamp: new Date().toISOString(),
        reason: error?.message || String(error),
      });
    });

    return next();
  } catch (error) {
    const isJwtError = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error?.name);
    if (isJwtError) {
      return apiError(res, 401, "AUTH_TOKEN_INVALID", "Сессия недействительна или истекла.");
    }

    console.error("[AuthMiddleware] Authorization service failed", {
      endpoint: `${req.method} ${req.originalUrl || req.url}`,
      userId: decoded?.id ? Number(decoded.id) : null,
      timestamp: new Date().toISOString(),
      reason: error?.message || String(error),
      stack: error?.stack,
    });
    return apiError(
      res,
      503,
      "AUTH_SERVICE_UNAVAILABLE",
      "Сервис проверки доступа временно недоступен. Повторите попытку.",
    );
  }
};

function requireRoles(...allowed) {
  const normalizedAllowed = normalizeRoles(allowed.flat());
  return (req, res, next) => {
    if (!req.user) {
      return apiError(res, 401, "AUTH_TOKEN_REQUIRED", "Требуется авторизация.");
    }
    if (!hasAnyRole(req.user.roles, normalizedAllowed)) {
      return apiError(res, 403, "INSUFFICIENT_ROLE", "Недостаточно прав для этого действия.", {
        requiredRoles: normalizedAllowed,
      });
    }
    return next();
  };
}

const adminMiddleware = requireRoles(...STAFF_ROLES);
const privilegedMiddleware = requireRoles("DEVELOPER", "OWNER");
const ownerMiddleware = requireRoles("OWNER");

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = String(req.headers.authorization || "");
  return authHeader.startsWith("Bearer ") ? authMiddleware(req, res, next) : next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
  privilegedMiddleware,
  ownerMiddleware,
  requireRoles,
  hasAdminAccess: (user) => hasAnyRole(user, STAFF_ROLES),
  normalizeBadges: normalizeRoles,
};
