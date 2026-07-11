const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");

const LESSON_TYPES = new Set(["VIDEO", "TEXT", "PRACTICE"]);

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Доступ только для администратора.",
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

function parsePositiveId(value, label) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return { error: `${label} должен быть положительным числом.` };
  }

  return { id };
}

function normalizeLessonData(body = {}) {
  const data = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.content !== undefined)
    data.content = body.content ? String(body.content).trim() : null;
  if (body.description !== undefined)
    data.description = body.description ? String(body.description).trim() : null;
  if (body.videoUrl !== undefined)
    data.videoUrl = body.videoUrl ? String(body.videoUrl).trim() : null;
  if (body.whatYouLearn !== undefined)
    data.whatYouLearn = serializeListField(body.whatYouLearn);
  if (body.steps !== undefined) data.steps = serializeListField(body.steps);
  if (body.taskText !== undefined)
    data.taskText = body.taskText ? String(body.taskText).trim() : null;
  if (body.beginnerHelp !== undefined)
    data.beginnerHelp = body.beginnerHelp
      ? String(body.beginnerHelp).trim()
      : null;
  if (body.hints !== undefined) data.hints = serializeListField(body.hints);
  if (body.orderNumber !== undefined) data.orderNumber = Number(body.orderNumber);
  if (body.type !== undefined) data.type = String(body.type || "VIDEO").trim();
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.courseId !== undefined) data.courseId = Number(body.courseId);

  return data;
}

function validateLessonPayload(data, { partial = false } = {}) {
  if (!partial || data.title !== undefined) {
    if (!data.title || data.title.length < 2) {
      return "Название урока должно быть минимум 2 символа.";
    }
  }

  if (!partial || data.courseId !== undefined) {
    if (!Number.isInteger(data.courseId) || data.courseId <= 0) {
      return "Выберите корректный курс.";
    }
  }

  if (!partial || data.orderNumber !== undefined) {
    if (!Number.isInteger(data.orderNumber) || data.orderNumber <= 0) {
      return "Номер урока должен быть положительным числом.";
    }
  }

  if (data.type !== undefined && !LESSON_TYPES.has(data.type)) {
    return "Тип урока должен быть VIDEO, TEXT или PRACTICE.";
  }

  return null;
}

async function getCourseProgressData(userId, courseId, client = prisma) {
  const totalLessons = await client.lesson.count({
    where: { courseId, isPublished: true },
  });

  const completedLessons = await client.lessonProgress.count({
    where: { userId, courseId, completed: true },
  });

  const startedLessons = await client.lessonProgress.count({
    where: { userId, courseId, started: true },
  });

  const percentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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

    if (req.query.courseId && (!Number.isInteger(courseId) || courseId <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID курса.",
      });
    }

    const lessons = await prisma.lesson.findMany({
      where: courseId ? { courseId, isPublished: true } : { isPublished: true },
      orderBy: { orderNumber: "asc" },
    });

    return res.json({ success: true, data: lessons });
  } catch (e) {
    console.error("[Lessons] Ошибка загрузки уроков", e?.message || e);
    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки уроков.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const parsed = parsePositiveId(req.params.id, "ID урока");
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.id },
      include: { course: true },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    return res.json({ success: true, data: lesson });
  } catch (e) {
    console.error("[Lessons] Ошибка загрузки урока", e?.message || e);
    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки урока.",
    });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const data = normalizeLessonData(req.body);
    const validationError = validateLessonPayload(data);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден.",
      });
    }

    const lesson = await prisma.lesson.create({ data });

    return res.status(201).json({
      success: true,
      message: "Урок успешно создан.",
      data: lesson,
    });
  } catch (e) {
    console.error("[Lessons] Ошибка создания урока", {
      error: e?.message || e,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка создания урока.",
    });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = parsePositiveId(req.params.id, "ID урока");
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const data = normalizeLessonData(req.body);
    const validationError = validateLessonPayload(data, { partial: true });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: parsed.id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    if (data.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Курс не найден.",
        });
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id: parsed.id },
      data,
    });

    return res.json({
      success: true,
      message: "Урок успешно обновлён.",
      data: lesson,
    });
  } catch (e) {
    console.error("[Lessons] Ошибка обновления урока", {
      error: e?.message || e,
      userId: req.user?.id,
      lessonId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка обновления урока.",
    });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = parsePositiveId(req.params.id, "ID урока");
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: parsed.id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    await prisma.lesson.delete({ where: { id: parsed.id } });

    return res.json({ success: true, message: "Урок удалён." });
  } catch (e) {
    console.error("[Lessons] Ошибка удаления урока", {
      error: e?.message || e,
      userId: req.user?.id,
      lessonId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка удаления урока.",
    });
  }
});

router.post("/:id/start", authMiddleware, async (req, res) => {
  try {
    const parsed = parsePositiveId(req.params.id, "ID урока");
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const lessonId = parsed.id;

    const result = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, courseId: true },
      });

      if (!lesson) return { notFound: true };

      const current = await tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId } },
      });

      const progress = await tx.lessonProgress.upsert({
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

      return { progress };
    });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    return res.json({ success: true, data: result.progress });
  } catch (e) {
    console.error("[Lessons] Ошибка старта урока", {
      error: e?.message || e,
      userId: req.user?.id,
      lessonId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка старта урока.",
    });
  }
});

router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const parsed = parsePositiveId(req.params.id, "ID урока");
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const lessonId = parsed.id;

    const result = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, courseId: true },
      });

      if (!lesson) return { notFound: true };

      const now = new Date();
      const progress = await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: req.user.id, lessonId } },
        update: {
          started: true,
          completed: true,
          courseId: lesson.courseId,
          completedAt: now,
        },
        create: {
          userId: req.user.id,
          lessonId,
          courseId: lesson.courseId,
          started: true,
          completed: true,
          startedAt: now,
          completedAt: now,
        },
      });

      const courseProgress = await getCourseProgressData(
        req.user.id,
        lesson.courseId,
        tx,
      );

      return { progress, courseProgress };
    });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    return res.json({
      success: true,
      data: result.progress,
      courseProgress: result.courseProgress,
    });
  } catch (e) {
    console.error("[Lessons] Ошибка завершения урока", {
      error: e?.message || e,
      userId: req.user?.id,
      lessonId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка завершения урока.",
    });
  }
});

module.exports = router;
