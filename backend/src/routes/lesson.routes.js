const router = require("express").Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");

router.get("/", async (req, res) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;

    const lessons = await prisma.lesson.findMany({
      where: courseId ? { courseId } : {},
      orderBy: {
        orderNumber: "asc",
      },
    });

    res.json({
      success: true,
      data: lessons,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки уроков",
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
        message: "Некорректный ID урока",
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    res.json({
      success: true,
      data: lesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки урока",
      error: e.message,
    });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, content, videoUrl, orderNumber, type, courseId } = req.body;

    if (!title || !orderNumber || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Заполните название, номер урока и курс",
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        orderNumber: Number(orderNumber),
        type: type || "VIDEO",
        courseId: Number(courseId),
      },
    });

    res.status(201).json({
      success: true,
      message: "Урок успешно создан",
      data: lesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка создания урока",
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
        message: "Некорректный ID урока",
      });
    }

    const { title, content, videoUrl, orderNumber, type, courseId } = req.body;

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title?.trim(),
        content: content?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        orderNumber: Number(orderNumber),
        type: type || "VIDEO",
        courseId: Number(courseId),
      },
    });

    res.json({
      success: true,
      message: "Урок успешно обновлён",
      data: lesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка обновления урока",
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
        message: "Некорректный ID урока",
      });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Урок удалён",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления урока",
      error: e.message,
    });
  }
});

router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const lessonId = Number(req.params.id);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока",
      });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: req.user.id,
          lessonId,
        },
      },
      update: {
        completed: true,
      },
      create: {
        userId: req.user.id,
        lessonId,
        completed: true,
      },
    });

    res.json({
      success: true,
      data: progress,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка завершения урока",
      error: e.message,
    });
  }
});

module.exports = router;
