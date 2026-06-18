const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// Проверяет токен и загружает актуальную роль из БД
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

    // Загружаем актуальную роль из БД (не из токена — роль могла измениться)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Кладём актуальные данные в req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Доступ только для администратора",
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
