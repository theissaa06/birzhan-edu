const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isPhoneVerified: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        lessonProgress: true,
        userBonuses: true,
        supportMessages: true,
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки пользователей",
      error: e.message,
    });
  }
});

router.patch("/:id/role", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Роль должна быть USER или ADMIN",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isPhoneVerified: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        lessonProgress: true,
        userBonuses: true,
        supportMessages: true,
      },
    });

    res.json({
      success: true,
      message: "Роль пользователя обновлена",
      data: user,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка изменения роли",
      error: e.message,
    });
  }
});

router.patch("/:id/reset-password", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const newPassword = req.body.newPassword || "12345678";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: "Пароль пользователя сброшен",
      data: user,
      newPassword,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка сброса пароля",
      error: e.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID пользователя",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Пользователь удалён",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления пользователя",
      error: e.message,
    });
  }
});

module.exports = router;
