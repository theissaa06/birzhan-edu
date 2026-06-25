const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Доступ только для администратора",
    });
  }

  next();
}

function serializeListField(value) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? JSON.stringify(items) : null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  return null;
}

function normalizeLessonData(body) {
  const data = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.content !== undefined) data.content = body.content ? String(body.content).trim() : null;
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
  if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl ? String(body.videoUrl).trim() : null;
  if (body.whatYouLearn !== undefined) data.whatYouLearn = serializeListField(body.whatYouLearn);
  if (body.steps !== undefined) data.steps = serializeListField(body.steps);
  if (body.taskText !== undefined) data.taskText = body.taskText ? String(body.taskText).trim() : null;
  if (body.beginnerHelp !== undefined) data.beginnerHelp = body.beginnerHelp ? String(body.beginnerHelp).trim() : null;
  if (body.hints !== undefined) data.hints = serializeListField(body.hints);
  if (body.orderNumber !== undefined) data.orderNumber = Number(body.orderNumber);
  if (body.type !== undefined) data.type = body.type || "VIDEO";
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.courseId !== undefined) data.courseId = Number(body.courseId);

  return data;
}

async function getCourseProgressData(userId, courseId) {
  const totalLessons = await prisma.lesson.count({
    where: { courseId, isPublished: true },
  });

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

router.get("/", async (req, res) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;

    const lessons = await prisma.lesson.findMany({
      where: courseId ? { courseId, isPublished: true } : { isPublished: true },
      orderBy: { orderNumber: "asc" },
    });

    res.json({ success: true, data: lessons });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка загрузки уроков", error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID урока" });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!lesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    res.json({ success: true, data: lesson });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка загрузки урока", error: e.message });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, orderNumber, courseId } = req.body;

    if (!title || !orderNumber || !courseId) {
      return res.status(400).json({ success: false, message: "Заполните название, номер урока и курс" });
    }

    const course = await prisma.course.findUnique({ where: { id: Number(courseId) } });

    if (!course) {
      return res.status(404).json({ success: false, message: "Курс не найден" });
    }

    const lesson = await prisma.lesson.create({ data: normalizeLessonData(req.body) });

    res.status(201).json({ success: true, message: "Урок успешно создан", data: lesson });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка создания урока", error: e.message });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID урока" });
    }

    const existingLesson = await prisma.lesson.findUnique({ where: { id } });

    if (!existingLesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: normalizeLessonData(req.body),
    });

    res.json({ success: true, message: "Урок успешно обновлён", data: lesson });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка обновления урока", error: e.message });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID урока" });
    }

    const existingLesson = await prisma.lesson.findUnique({ where: { id } });

    if (!existingLesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    await prisma.lesson.delete({ where: { id } });

    res.json({ success: true, message: "Урок удалён" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка удаления урока", error: e.message });
  }
});

router.post("/:id/start", authMiddleware, async (req, res) => {
  try {
    const lessonId = Number(req.params.id);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID урока" });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true } });

    if (!lesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    const current = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
    });

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
      update: {
        started: true,
        courseId: lesson.courseId,
        startedAt: current?.startedAt || new Date(),
      },
      create: {
        userId: req.user.id,
        lessonId,
        courseId: lesson.courseId,
        started: true,
        startedAt: new Date(),
      },
    });

    res.json({ success: true, data: progress });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка старта урока", error: e.message });
  }
});

router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const lessonId = Number(req.params.id);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({ success: false, message: "Некорректный ID урока" });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true } });

    if (!lesson) {
      return res.status(404).json({ success: false, message: "Урок не найден" });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
      update: {
        started: true,
        completed: true,
        courseId: lesson.courseId,
        completedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        lessonId,
        courseId: lesson.courseId,
        started: true,
        completed: true,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const courseProgress = await getCourseProgressData(req.user.id, lesson.courseId);

    res.json({ success: true, data: progress, courseProgress });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка завершения урока", error: e.message });
  }
});

module.exports = router;
