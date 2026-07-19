const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { createVideoUploadUrl } = require("../utils/r2");
const { writeAudit } = require("../utils/audit");
const { enqueueSubmissionReview } = require("../services/video-review.service");
const { isManagedVideoUrl } = require("../services/video-review.provider");

const SUBMISSION_TYPES = new Set(["link", "video"]);
const REVIEW_STATUSES = new Set(["submitted", "approved", "rejected", "needs_changes"]);
const CRITERION_KINDS = new Set([
  "DURATION",
  "RESOLUTION",
  "FORMAT",
  "FILE_SIZE",
  "AUDIO_PRESENT",
  "SOUND_SYNC",
  "TRANSITIONS",
  "COLOR",
  "CUSTOM",
]);

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

function normalizeTechnicalMetadata(body = {}) {
  const finite = (value, max) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
  };
  return {
    uploadKey: String(body.uploadKey || "").trim().slice(0, 500) || null,
    fileName: String(body.fileName || "").trim().slice(0, 240) || null,
    contentType: String(body.contentType || "").trim().toLowerCase().slice(0, 100) || null,
    size: finite(body.size, 3 * 1024 * 1024 * 1024),
    durationSeconds: finite(body.durationSeconds, 24 * 60 * 60),
    width: finite(body.width, 16384),
    height: finite(body.height, 16384),
    hasAudio: typeof body.hasAudio === "boolean" ? body.hasAudio : null,
  };
}

function criterionSnapshot(criterion) {
  return {
    key: criterion.key,
    title: criterion.title,
    description: criterion.description,
    kind: criterion.kind,
    required: criterion.required,
    minValue: criterion.minValue,
    maxValue: criterion.maxValue,
    expectedValue: criterion.expectedValue,
    weight: criterion.weight,
    orderNumber: criterion.orderNumber,
  };
}

function normalizeCriteria(input) {
  if (!Array.isArray(input) || input.length > 20) return { error: "Добавьте от 1 до 20 структурированных критериев." };
  const criteria = [];
  const keys = new Set();
  for (let index = 0; index < input.length; index += 1) {
    const item = input[index] || {};
    const key = String(item.key || `criterion-${index + 1}`).trim().toLowerCase();
    const title = String(item.title || "").trim().slice(0, 160);
    const description = String(item.description || "").trim().slice(0, 1200);
    const kind = String(item.kind || "CUSTOM").trim().toUpperCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(key) || keys.has(key)) return { error: "Ключи критериев должны быть уникальными и содержать латинские буквы, цифры, _ или -." };
    if (title.length < 3 || description.length < 5 || !CRITERION_KINDS.has(kind)) return { error: `Проверьте название, описание и тип критерия №${index + 1}.` };
    keys.add(key);
    criteria.push({
      key,
      title,
      description,
      kind,
      required: item.required !== false,
      minValue: item.minValue === "" || item.minValue == null ? null : Number(item.minValue),
      maxValue: item.maxValue === "" || item.maxValue == null ? null : Number(item.maxValue),
      expectedValue: String(item.expectedValue || "").trim().slice(0, 500) || null,
      weight: Math.max(1, Math.min(10, Number(item.weight) || 1)),
      orderNumber: index + 1,
      active: true,
    });
  }
  if (criteria.some((item) => (item.minValue != null && !Number.isFinite(item.minValue)) || (item.maxValue != null && !Number.isFinite(item.maxValue)))) return { error: "Минимальные и максимальные значения должны быть числами." };
  return { criteria };
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
    const technicalMetadata = normalizeTechnicalMetadata(req.body?.technicalMetadata);

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
        select: {
          id: true,
          courseId: true,
          autoReviewEnabled: true,
          reviewCriteria: {
            where: { active: true },
            orderBy: { orderNumber: "asc" },
          },
        },
      });

      if (!lesson) return { notFound: true };

      const previousAttempts = await tx.assignmentSubmission.count({
        where: { userId: req.user.id, lessonId },
      });
      const criteria = lesson.reviewCriteria.map(criterionSnapshot);
      const autoReviewReady = Boolean(
        lesson.autoReviewEnabled &&
        type === "video" &&
        criteria.length &&
        isManagedVideoUrl(url),
      );
      const reviewStatus = autoReviewReady ? "QUEUED" : "MANUAL_REQUIRED";

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
          attemptNumber: previousAttempts + 1,
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

      const autoReview = await tx.submissionAutoReview.create({
        data: {
          submissionId: submission.id,
          status: reviewStatus,
          criteriaSnapshot: criteria,
          technicalMetadata,
          errorCode: autoReviewReady
            ? null
            : !lesson.autoReviewEnabled
              ? "AUTO_REVIEW_DISABLED"
              : !criteria.length
                ? "CRITERIA_NOT_CONFIGURED"
                : type !== "video"
                  ? "VIDEO_UPLOAD_REQUIRED"
                  : "VIDEO_SOURCE_NOT_MANAGED",
          errorMessage: autoReviewReady
            ? null
            : "Для этой попытки сохранён безопасный ручной процесс проверки.",
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

      return { submission: { ...submission, autoReview }, autoReviewReady };
    });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден.",
      });
    }

    if (result.autoReviewReady) enqueueSubmissionReview(result.submission.id);

    return res.status(201).json({
      success: true,
      message: result.autoReviewReady
        ? "Видео загружено. Автоматическая проверка поставлена в очередь."
        : "Работа сохранена и передана на ручную проверку.",
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
    const lessonId = req.query.lessonId ? parsePositiveInt(req.query.lessonId) : null;
    if (req.query.lessonId && !lessonId) {
      return res.status(400).json({ success: false, code: "LESSON_ID_INVALID", message: "Некорректный ID урока." });
    }
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { userId: req.user.id, ...(lessonId ? { lessonId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        autoReview: true,
        appeal: true,
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

router.get("/:id", async (req, res, next) => {
  if (!/^\d+$/.test(String(req.params.id || ""))) return next();
  try {
    const id = parsePositiveInt(req.params.id);
    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id, userId: req.user.id },
      include: {
        autoReview: true,
        appeal: true,
        lesson: { select: { id: true, title: true, courseId: true } },
      },
    });
    if (!submission) return res.status(404).json({ success: false, code: "SUBMISSION_NOT_FOUND", message: "Работа не найдена." });
    return res.json({ success: true, data: submission });
  } catch (error) {
    console.error("[Submissions] Ошибка статуса работы", { submissionId: req.params.id, userId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "SUBMISSION_STATUS_FAILED", message: "Не удалось загрузить статус проверки." });
  }
});

router.post("/:id/retry-analysis", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, code: "SUBMISSION_ID_INVALID", message: "Некорректный ID работы." });
    const result = await prisma.submissionAutoReview.updateMany({
      where: { submissionId: id, status: "FAILED", submission: { userId: req.user.id } },
      data: { status: "QUEUED", errorCode: null, errorMessage: null, completedAt: null },
    });
    if (!result.count) return res.status(409).json({ success: false, code: "AUTO_REVIEW_RETRY_NOT_ALLOWED", message: "Повторный запуск недоступен для текущего статуса." });
    enqueueSubmissionReview(id);
    return res.json({ success: true, message: "Проверка снова поставлена в очередь." });
  } catch (error) {
    console.error("[Submissions] Ошибка повторной проверки", { submissionId: req.params.id, userId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "AUTO_REVIEW_RETRY_FAILED", message: "Не удалось повторно запустить проверку." });
  }
});

router.post("/:id/appeals", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const reason = String(req.body?.reason || "").trim().slice(0, 2000);
    if (!id || reason.length < 10) return res.status(400).json({ success: false, code: "APPEAL_INVALID", message: "Опишите причину пересмотра минимум в 10 символах." });
    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.assignmentSubmission.findFirst({ where: { id, userId: req.user.id }, include: { autoReview: true, appeal: true } });
      if (!submission) return { notFound: true };
      if (!submission.autoReview || submission.autoReview.status !== "NEEDS_CHANGES") return { invalidStatus: true };
      if (submission.appeal) return { exists: true, appeal: submission.appeal };
      const appeal = await tx.submissionAppeal.create({ data: { submissionId: id, userId: req.user.id, reason } });
      await tx.submissionAutoReview.update({ where: { submissionId: id }, data: { status: "APPEALED" } });
      await writeAudit(tx, { req, actorId: req.user.id, targetUserId: req.user.id, action: "submission.appeal_created", entityType: "AssignmentSubmission", entityId: id, after: { reason } });
      return { appeal };
    });
    if (result.notFound) return res.status(404).json({ success: false, code: "SUBMISSION_NOT_FOUND", message: "Работа не найдена." });
    if (result.invalidStatus) return res.status(409).json({ success: false, code: "APPEAL_NOT_ALLOWED", message: "Оспорить можно только решение о доработке." });
    if (result.exists) return res.status(409).json({ success: false, code: "APPEAL_EXISTS", message: "Запрос на пересмотр уже создан.", appeal: result.appeal });
    return res.status(201).json({ success: true, message: "Работа передана на ручной пересмотр.", appeal: result.appeal });
  } catch (error) {
    console.error("[Submissions] Ошибка апелляции", { submissionId: req.params.id, userId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "APPEAL_CREATE_FAILED", message: "Не удалось запросить ручной пересмотр." });
  }
});

router.get("/admin/lessons", adminMiddleware, async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      orderBy: [{ courseId: "asc" }, { orderNumber: "asc" }],
      select: {
        id: true,
        title: true,
        type: true,
        orderNumber: true,
        autoReviewEnabled: true,
        course: { select: { id: true, title: true } },
        reviewCriteria: { orderBy: { orderNumber: "asc" } },
      },
    });
    return res.json({ success: true, data: lessons });
  } catch (error) {
    console.error("[Submissions] Ошибка списка критериев", { adminId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "REVIEW_CRITERIA_LIST_FAILED", message: "Не удалось загрузить критерии автопроверки." });
  }
});

router.put("/admin/lessons/:lessonId/criteria", adminMiddleware, async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.params.lessonId);
    const autoReviewEnabled = Boolean(req.body?.autoReviewEnabled);
    const normalized = normalizeCriteria(req.body?.criteria);
    if (!lessonId) return res.status(400).json({ success: false, code: "LESSON_ID_INVALID", message: "Некорректный ID урока." });
    if (normalized.error) return res.status(400).json({ success: false, code: "REVIEW_CRITERIA_INVALID", message: normalized.error });
    if (autoReviewEnabled && !normalized.criteria.length) return res.status(400).json({ success: false, code: "REVIEW_CRITERIA_REQUIRED", message: "Нельзя включить автопроверку без критериев." });
    const result = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { id: true, autoReviewEnabled: true, reviewCriteria: true } });
      if (!lesson) return { notFound: true };
      await tx.lessonReviewCriterion.deleteMany({ where: { lessonId } });
      if (normalized.criteria.length) await tx.lessonReviewCriterion.createMany({ data: normalized.criteria.map((criterion) => ({ lessonId, ...criterion })) });
      const updated = await tx.lesson.update({
        where: { id: lessonId },
        data: { autoReviewEnabled },
        select: { id: true, title: true, autoReviewEnabled: true, reviewCriteria: { orderBy: { orderNumber: "asc" } } },
      });
      await writeAudit(tx, {
        req,
        actorId: req.user.id,
        action: "lesson.review_criteria_updated",
        entityType: "Lesson",
        entityId: lessonId,
        before: { autoReviewEnabled: lesson.autoReviewEnabled, criteria: lesson.reviewCriteria },
        after: { autoReviewEnabled, criteria: normalized.criteria },
      });
      return { updated };
    });
    if (result.notFound) return res.status(404).json({ success: false, code: "LESSON_NOT_FOUND", message: "Урок не найден." });
    return res.json({ success: true, message: autoReviewEnabled ? "Критерии сохранены, автопроверка включена." : "Критерии сохранены, автопроверка остаётся выключенной.", data: result.updated });
  } catch (error) {
    console.error("[Submissions] Ошибка сохранения критериев", { lessonId: req.params.lessonId, adminId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "REVIEW_CRITERIA_SAVE_FAILED", message: "Не удалось сохранить критерии автопроверки." });
  }
});

router.get("/admin/reviews", adminMiddleware, async (req, res) => {
  try {
    const reviews = await prisma.submissionAutoReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        submission: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            lesson: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
            appeal: true,
          },
        },
      },
    });
    return res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("[Submissions] Ошибка журнала автопроверки", { adminId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "AUTO_REVIEW_LOG_FAILED", message: "Не удалось загрузить журнал решений." });
  }
});

router.post("/admin/appeals/:appealId/resolve", adminMiddleware, async (req, res) => {
  try {
    const appealId = parsePositiveInt(req.params.appealId);
    const decision = String(req.body?.decision || "").trim().toUpperCase();
    const resolution = String(req.body?.resolution || "").trim().slice(0, 2000);
    if (!appealId || !["APPROVED", "NEEDS_CHANGES"].includes(decision) || resolution.length < 5) {
      return res.status(400).json({ success: false, code: "APPEAL_RESOLUTION_INVALID", message: "Выберите решение и добавьте пояснение минимум из 5 символов." });
    }
    const result = await prisma.$transaction(async (tx) => {
      const appeal = await tx.submissionAppeal.findUnique({ where: { id: appealId }, include: { submission: { include: { autoReview: true } } } });
      if (!appeal) return { notFound: true };
      if (appeal.status !== "PENDING") return { alreadyResolved: true };
      const approved = decision === "APPROVED";
      const now = new Date();
      await tx.submissionAppeal.update({ where: { id: appealId }, data: { status: approved ? "APPROVED" : "REJECTED", resolution, reviewerId: req.user.id, resolvedAt: now } });
      await tx.submissionAutoReview.update({ where: { submissionId: appeal.submissionId }, data: { status: approved ? "MANUAL_APPROVED" : "MANUAL_NEEDS_CHANGES", completedAt: now } });
      await tx.assignmentSubmission.update({ where: { id: appeal.submissionId }, data: { status: approved ? "approved" : "needs_changes", feedback: resolution } });
      if (approved) {
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId: appeal.userId, lessonId: appeal.submission.lessonId } },
          update: { started: true, completed: true, courseId: appeal.submission.courseId, completedAt: now },
          create: { userId: appeal.userId, lessonId: appeal.submission.lessonId, courseId: appeal.submission.courseId, started: true, completed: true, startedAt: now, completedAt: now },
        });
      }
      await tx.notification.create({ data: { userId: appeal.userId, type: "submission_appeal_resolved", title: approved ? "Пересмотр завершён: работа принята" : "Пересмотр завершён: нужна доработка", message: resolution, link: `/courses/${appeal.submission.courseId}/lessons/${appeal.submission.lessonId}` } });
      await writeAudit(tx, { req, actorId: req.user.id, targetUserId: appeal.userId, action: "submission.appeal_resolved", entityType: "AssignmentSubmission", entityId: appeal.submissionId, before: { status: "APPEALED" }, after: { decision, resolution } });
      return { approved };
    });
    if (result.notFound) return res.status(404).json({ success: false, code: "APPEAL_NOT_FOUND", message: "Запрос на пересмотр не найден." });
    if (result.alreadyResolved) return res.status(409).json({ success: false, code: "APPEAL_ALREADY_RESOLVED", message: "Этот запрос уже рассмотрен." });
    return res.json({ success: true, message: result.approved ? "Работа принята вручную, прогресс обновлён." : "Решение о доработке подтверждено вручную." });
  } catch (error) {
    console.error("[Submissions] Ошибка ручного пересмотра", { appealId: req.params.appealId, adminId: req.user?.id, reason: error?.message || error });
    return res.status(500).json({ success: false, code: "APPEAL_RESOLUTION_FAILED", message: "Не удалось сохранить решение по пересмотру." });
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

    const submission = await prisma.$transaction(async (tx) => {
      const existing = await tx.assignmentSubmission.findUnique({ where: { id }, include: { autoReview: true } });
      if (!existing) return null;
      const updated = await tx.assignmentSubmission.update({ where: { id }, data: { status, feedback } });
      if (existing.autoReview) {
        await tx.submissionAutoReview.update({
          where: { submissionId: id },
          data: {
            status: status === "approved" ? "MANUAL_APPROVED" : status === "needs_changes" || status === "rejected" ? "MANUAL_NEEDS_CHANGES" : existing.autoReview.status,
            completedAt: ["approved", "needs_changes", "rejected"].includes(status) ? new Date() : undefined,
          },
        });
      }
      if (status === "approved") {
        const now = new Date();
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId: existing.userId, lessonId: existing.lessonId } },
          update: { started: true, completed: true, courseId: existing.courseId, completedAt: now },
          create: { userId: existing.userId, lessonId: existing.lessonId, courseId: existing.courseId, started: true, completed: true, startedAt: now, completedAt: now },
        });
      }
      await tx.notification.create({ data: { userId: existing.userId, type: "submission_manual_review", title: status === "approved" ? "Работа принята" : "Статус работы обновлён", message: feedback || `Новый статус: ${status}.`, link: `/courses/${existing.courseId}/lessons/${existing.lessonId}` } });
      await writeAudit(tx, { req, actorId: req.user.id, targetUserId: existing.userId, action: "submission.manual_reviewed", entityType: "AssignmentSubmission", entityId: id, before: { status: existing.status, feedback: existing.feedback }, after: { status, feedback } });
      return updated;
    });

    if (!submission) return res.status(404).json({ success: false, code: "SUBMISSION_NOT_FOUND", message: "Работа не найдена." });

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
