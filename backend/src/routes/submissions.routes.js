const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { createVideoUploadUrl } = require("../utils/r2");

const SUBMISSION_TYPES = new Set(["link", "video"]);
const REVIEW_STATUSES = new Set(["submitted", "approved", "rejected", "needs_changes"]);

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

router.get("/public", async (req, res) => {
  try {
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        isPublic: true,
        status: { in: ["submitted", "approved"] },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: {
        user: { select: { id: true, username: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("[Submissions] Ошибка публичного портфолио", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки публичных работ.",
    });
  }
});

router.use(authMiddleware);

router.post("/upload-url", async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.body?.lessonId);
    const fileName = String(req.body?.fileName || "submission.mp4").trim();
    const contentType = String(req.body?.contentType || "").trim().toLowerCase();
    const size = Number(req.body?.size || 0);

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока.",
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    const upload = await createVideoUploadUrl({
      userId: req.user.id,
      lessonId,
      fileName,
      contentType,
      size,
    });

    if (!upload.ok) {
      return res.status(upload.status || 400).json({
        success: false,
        message: upload.message,
      });
    }

    return res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    console.error("[Submissions] Ошибка presigned upload", {
      error: error?.message || error,
      code: error?.code,
      userId: req.user?.id,
      lessonId: req.body?.lessonId,
    });

    return res.status(error?.code === "R2_NOT_CONFIGURED" ? 503 : 500).json({
      success: false,
      message:
        error?.code === "R2_NOT_CONFIGURED"
          ? "Хранилище видео пока не настроено."
          : "Ошибка подготовки загрузки видео.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.body?.lessonId);
    const type = String(req.body?.type || "").trim();
    const url = normalizeUrl(req.body?.url);
    const notes = String(req.body?.notes || "").trim().slice(0, 2000) || null;
    const isPublic = Boolean(req.body?.isPublic);

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока.",
      });
    }

    if (!SUBMISSION_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: "Тип работы должен быть link или video.",
      });
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Добавьте корректную ссылку на работу или загруженное видео.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, courseId: true },
      });

      if (!lesson) return { notFound: true };

      const submission = await tx.assignmentSubmission.create({
        data: {
          userId: req.user.id,
          lessonId,
          courseId: lesson.courseId,
          type,
          url,
          notes,
          isPublic,
          status: "submitted",
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      });

      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: req.user.id, lessonId } },
        update: {
          started: true,
          courseId: lesson.courseId,
          startedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          lessonId,
          courseId: lesson.courseId,
          started: true,
          startedAt: new Date(),
        },
      });

      return { submission };
    });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Работа отправлена на проверку.",
      data: result.submission,
    });
  } catch (error) {
    console.error("[Submissions] Ошибка создания работы", {
      error: error?.message || error,
      userId: req.user?.id,
      lessonId: req.body?.lessonId,
      type: req.body?.type,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка отправки работы.",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("[Submissions] Ошибка списка работ", {
      error: error?.message || error,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки работ.",
    });
  }
});

router.get("/lesson/:lessonId", adminMiddleware, async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.params.lessonId);
    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока.",
      });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { lessonId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    return res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("[Submissions] Ошибка работ урока", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки работ урока.",
    });
  }
});

router.patch("/:id/review", adminMiddleware, async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const status = String(req.body?.status || "").trim();
    const feedback = String(req.body?.feedback || "").trim().slice(0, 3000) || null;

    if (!id || !REVIEW_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: "Некорректный статус проверки.",
      });
    }

    const submission = await prisma.assignmentSubmission.update({
      where: { id },
      data: { status, feedback },
    });

    return res.json({
      success: true,
      message: "Статус работы обновлён.",
      data: submission,
    });
  } catch (error) {
    console.error("[Submissions] Ошибка review", {
      error: error?.message || error,
      submissionId: req.params.id,
      adminId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: "Ошибка проверки работы.",
    });
  }
});

module.exports = router;
