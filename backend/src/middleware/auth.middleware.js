const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const ADMIN_BADGES = new Set(["ADMIN", "OWNER", "DEVELOPER"]);

function normalizeBadges(badges) {
  return Array.isArray(badges)
    ? badges.map((badge) => String(badge).toUpperCase()).filter(Boolean)
    : [];
}

function hasAdminAccess(user) {
  const badges = normalizeBadges(user?.badges);
  return user?.role === "ADMIN" || badges.some((badge) => ADMIN_BADGES.has(badge));
}

function isBlocked(user, now = new Date()) {
  if (!user?.blockedAt) return false;
  if (!user.blockedUntil) return true;
  return new Date(user.blockedUntil) > now;
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Неверный или просроченный токен",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        badges: true,
        blockedAt: true,
        blockedUntil: true,
        blockedReason: true,
        sessionVersion: true,
      },
    });

    if (!user || Number(decoded.sessionVersion || 0) !== user.sessionVersion) {
      return res.status(401).json({
        success: false,
        message: "Сессия устарела. Войдите снова.",
      });
    }

    if (isBlocked(user)) {
      return res.status(403).json({
        success: false,
        message: user.blockedUntil
          ? `Аккаунт заблокирован до ${new Date(user.blockedUntil).toLocaleString("ru-RU")}.`
          : "Аккаунт заблокирован.",
        blocked: true,
        blockedUntil: user.blockedUntil,
        reason: user.blockedReason || null,
      });
    }

    if (user.blockedAt && user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          blockedAt: null,
          blockedUntil: null,
          blockedReason: null,
          blockedById: null,
        },
      });
    }

    req.user = decoded;
    req.user.role = user.role;
    req.user.badges = normalizeBadges(user.badges);
    req.user.isAdmin = hasAdminAccess(user);

    next();
  } catch (error) {
    console.error("[AuthMiddleware] Ошибка авторизации", error?.message || error);
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Пользователь не авторизован",
      });
    }
    
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Доступ только для администратора",
      });
    }
    
    next();
  } catch (error) {
    console.error("[AdminMiddleware] Error:", error);
    return res.status(403).json({
      success: false,
      message: "Ошибка проверки прав администратора",
    });
  }
};

module.exports = { authMiddleware, adminMiddleware, hasAdminAccess, normalizeBadges };
