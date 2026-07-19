const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { id: "asc" },
      include: {
        lessons: {
          orderBy: { orderNumber: "asc" },
          include: { reviewCriteria: { where: { active: true }, orderBy: { orderNumber: "asc" } } },
        },
      },
    });

    res.json({
      success: true,
      data: courses,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки курсов",
      error: e.message,
    });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, category, level, duration, description, imageUrl } =
      req.body;

    if (!title || !category || !level || !duration || !description) {
      return res.status(400).json({
        success: false,
        message: "Заполните все обязательные поля",
      });
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        category,
        level,
        duration: duration.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
        isPublished: true,
      },
      include: {
        lessons: {
          orderBy: { orderNumber: "asc" },
          include: { reviewCriteria: { where: { active: true }, orderBy: { orderNumber: "asc" } } },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Курс успешно создан",
      data: course,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка создания курса",
      error: e.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID курса",
      });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { orderNumber: "asc" },
          include: { reviewCriteria: { where: { active: true }, orderBy: { orderNumber: "asc" } } },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки курса",
      error: e.message,
    });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID курса",
      });
    }

    const { title, category, level, duration, description, imageUrl } =
      req.body;

    if (!title || !category || !level || !duration || !description) {
      return res.status(400).json({
        success: false,
        message: "Заполните все обязательные поля",
      });
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        title: title.trim(),
        category,
        level,
        duration: duration.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
      },
      include: {
        lessons: {
          orderBy: { orderNumber: "asc" },
          include: { reviewCriteria: { where: { active: true }, orderBy: { orderNumber: "asc" } } },
        },
      },
    });

    res.json({
      success: true,
      message: "Курс успешно обновлён",
      data: updatedCourse,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка обновления курса",
      error: e.message,
    });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID курса",
      });
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    await prisma.course.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Курс успешно удалён",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления курса",
      error: e.message,
    });
  }
});

module.exports = router;
