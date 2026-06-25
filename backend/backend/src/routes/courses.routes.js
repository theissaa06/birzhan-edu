const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { id: "asc" },
      include: {
        lessons: {
          orderBy: { orderNumber: "asc" },
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


function tryDecodeUser(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const jwt = require("jsonwebtoken");
    return jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function getCourseProgressData(userId, courseId) {
  const totalLessons = await prisma.lesson.count({
    where: { courseId, isPublished: true },
  });

  if (!userId) {
    return {
      totalLessons,
      completedLessons: 0,
      startedLessons: 0,
      percentage: 0,
      isCompleted: false,
    };
  }

  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, courseId, completed: true },
  });

  const startedLessons = await prisma.lessonProgress.count({
    where: { userId, courseId, started: true },
  });

  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedLessons,
    startedLessons,
    percentage,
    isCompleted: percentage === 100 && totalLessons > 0,
  };
}

router.get("/:id/lessons", async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID курса" });
    }

    const user = tryDecodeUser(req);

    const lessons = await prisma.lesson.findMany({
      where: { courseId, isPublished: true },
      orderBy: { orderNumber: "asc" },
      include: user?.id
        ? {
            progress: {
              where: { userId: user.id },
            },
          }
        : undefined,
    });

    const data = lessons.map((lesson) => ({
      ...lesson,
      progress: user?.id ? lesson.progress?.[0] || null : null,
    }));

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка загрузки уроков курса", error: e.message });
  }
});

router.get("/:id/lessons/:lessonId", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(courseId) || !Number.isInteger(lessonId)) {
      return res.status(400).json({ success: false, message: "Некорректный ID" });
    }

    const user = tryDecodeUser(req);

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isPublished: true },
      include: {
        course: true,
        progress: user?.id
          ? {
              where: { userId: user.id },
            }
          : undefined,
      },
    });

    if (!lesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    res.json({
      success: true,
      data: {
        ...lesson,
        userProgress: user?.id ? lesson.progress?.[0] || null : null,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка загрузки урока", error: e.message });
  }
});

router.get("/:id/progress", async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID курса" });
    }

    const user = tryDecodeUser(req);
    const data = await getCourseProgressData(user?.id, courseId);

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка загрузки прогресса курса", error: e.message });
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
