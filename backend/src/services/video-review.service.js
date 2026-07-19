const prisma = require("../config/prisma");
const { analyzeVideoSubmission, VIDEO_MODEL } = require("./video-review.provider");

const activeJobs = new Set();
const LEASE_MS = Number(process.env.AUTO_REVIEW_LEASE_MS || 15 * 60 * 1000);
const TECHNICAL_KINDS = new Set(["DURATION", "RESOLUTION", "FORMAT", "FILE_SIZE", "AUDIO_PRESENT"]);

function criterionResult(criterion, passed, feedback) {
  return {
    key: criterion.key,
    title: criterion.title,
    required: Boolean(criterion.required),
    passed,
    confidence: 1,
    feedback,
    timecode: null,
    source: "technical",
  };
}

function evaluateTechnicalCriteria(criteria, metadata = {}) {
  const results = [];
  for (const criterion of criteria || []) {
    const kind = String(criterion.kind || "").toUpperCase();
    if (!TECHNICAL_KINDS.has(kind)) continue;
    if (kind === "DURATION" && Number.isFinite(Number(metadata.durationSeconds))) {
      const value = Number(metadata.durationSeconds);
      const minOk = criterion.minValue == null || value >= Number(criterion.minValue);
      const maxOk = criterion.maxValue == null || value <= Number(criterion.maxValue);
      results.push(criterionResult(criterion, minOk && maxOk, minOk && maxOk
        ? `Длительность ${value.toFixed(1)} сек. входит в заданный диапазон.`
        : `Длительность ${value.toFixed(1)} сек. не входит в диапазон ${criterion.minValue ?? "0"}–${criterion.maxValue ?? "∞"} сек.`));
    } else if (kind === "RESOLUTION" && Number(metadata.width) > 0 && Number(metadata.height) > 0) {
      const expected = String(criterion.expectedValue || "").match(/^(\d+)x(\d+)$/i);
      if (expected) {
        const passed = Number(metadata.width) >= Number(expected[1]) && Number(metadata.height) >= Number(expected[2]);
        results.push(criterionResult(criterion, passed, passed
          ? `Разрешение ${metadata.width}×${metadata.height} соответствует минимуму.`
          : `Разрешение ${metadata.width}×${metadata.height} ниже требуемого ${expected[1]}×${expected[2]}.`));
      }
    } else if (kind === "FORMAT" && metadata.contentType) {
      const allowed = String(criterion.expectedValue || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (allowed.length) {
        const passed = allowed.includes(String(metadata.contentType).toLowerCase());
        results.push(criterionResult(criterion, passed, passed ? "Формат видео поддерживается." : `Формат ${metadata.contentType} не входит в список: ${allowed.join(", ")}.`));
      }
    } else if (kind === "FILE_SIZE" && Number.isFinite(Number(metadata.size))) {
      const value = Number(metadata.size);
      const minOk = criterion.minValue == null || value >= Number(criterion.minValue);
      const maxOk = criterion.maxValue == null || value <= Number(criterion.maxValue);
      results.push(criterionResult(criterion, minOk && maxOk, minOk && maxOk ? "Размер файла соответствует требованиям." : "Размер файла не соответствует требованиям задания."));
    } else if (kind === "AUDIO_PRESENT" && typeof metadata.hasAudio === "boolean") {
      results.push(criterionResult(criterion, metadata.hasAudio, metadata.hasAudio ? "Аудиодорожка обнаружена." : "В видео не обнаружена аудиодорожка."));
    }
  }
  return results;
}

function mergeTechnicalResults(analysis, technicalResults) {
  const technical = new Map(technicalResults.map((item) => [item.key, item]));
  const criteria = (analysis.criteria || []).map((item) => technical.get(item.key) || { ...item, source: "gemini" });
  const requiredFailed = criteria.some((item) => item.required && !item.passed);
  const passedWeight = criteria.filter((item) => item.passed).length;
  return {
    ...analysis,
    decision: requiredFailed ? "NEEDS_CHANGES" : "APPROVED",
    score: criteria.length ? Math.round((passedWeight / criteria.length) * 100) : analysis.score,
    criteria,
  };
}

async function persistDecision(review, analysis, client = prisma) {
  const now = new Date();
  const approved = analysis.decision === "APPROVED";
  const nextStatus = approved ? "APPROVED" : "NEEDS_CHANGES";
  return client.$transaction(async (tx) => {
    await tx.submissionAutoReview.update({
      where: { id: review.id },
      data: {
        status: nextStatus,
        result: analysis,
        technicalMetadata: analysis.technicalMetadata || review.technicalMetadata || undefined,
        provider: analysis.provider || "technical",
        model: analysis.model || (analysis.provider === "technical" ? null : VIDEO_MODEL),
        errorCode: null,
        errorMessage: null,
        leaseExpiresAt: null,
        completedAt: now,
      },
    });
    await tx.assignmentSubmission.update({
      where: { id: review.submissionId },
      data: { status: approved ? "approved" : "needs_changes", feedback: analysis.summary },
    });
    if (approved) {
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: review.submission.userId, lessonId: review.submission.lessonId } },
        update: { started: true, completed: true, courseId: review.submission.courseId, completedAt: now },
        create: { userId: review.submission.userId, lessonId: review.submission.lessonId, courseId: review.submission.courseId, started: true, completed: true, startedAt: now, completedAt: now },
      });
    }
    await tx.notification.create({
      data: {
        userId: review.submission.userId,
        type: approved ? "submission_approved" : "submission_needs_changes",
        title: approved ? "Монтаж принят" : "Монтаж нужно доработать",
        message: analysis.summary,
        link: `/courses/${review.submission.courseId}/lessons/${review.submission.lessonId}`,
      },
    });
    await tx.auditLog.create({
      data: {
        targetUserId: review.submission.userId,
        action: approved ? "submission.auto_review_approved" : "submission.auto_review_needs_changes",
        entityType: "AssignmentSubmission",
        entityId: String(review.submissionId),
        after: { status: nextStatus, criteria: analysis.criteria, score: analysis.score },
        metadata: { provider: analysis.provider || "technical", model: analysis.model || null },
      },
    });
    return { status: nextStatus, approved };
  });
}

async function persistFailure(review, error, client = prisma) {
  const code = String(error?.code || "AUTO_REVIEW_FAILED").slice(0, 80);
  const message = String(error?.message || "Автоматическую проверку не удалось выполнить.").slice(0, 1000);
  await client.$transaction(async (tx) => {
    await tx.submissionAutoReview.update({
      where: { id: review.id },
      data: { status: "FAILED", errorCode: code, errorMessage: message, leaseExpiresAt: null, completedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: review.submission.userId,
        type: "submission_review_failed",
        title: "Проверка временно не завершена",
        message: "Мы не смогли проверить монтаж по технической причине. Работа не отклонена — запустите проверку повторно позже.",
        link: `/courses/${review.submission.courseId}/lessons/${review.submission.lessonId}`,
      },
    });
    await tx.auditLog.create({
      data: {
        targetUserId: review.submission.userId,
        action: "submission.auto_review_failed",
        entityType: "AssignmentSubmission",
        entityId: String(review.submissionId),
        after: { status: "FAILED", code },
      },
    });
  });
  console.error("[VideoReview] Analysis failed", { submissionId: review.submissionId, code, reason: message });
}

async function runSubmissionReview(submissionId, options = {}) {
  const client = options.client || prisma;
  const provider = options.provider || analyzeVideoSubmission;
  const numericId = Number(submissionId);
  const claimed = await client.submissionAutoReview.updateMany({
    where: { submissionId: numericId, status: "QUEUED" },
    data: { status: "PROCESSING", startedAt: new Date(), leaseExpiresAt: new Date(Date.now() + LEASE_MS), errorCode: null, errorMessage: null },
  });
  if (!claimed.count) return { claimed: false };
  const review = await client.submissionAutoReview.findUnique({
    where: { submissionId: numericId },
    include: { submission: { include: { lesson: { select: { title: true } } } } },
  });
  if (!review) return { claimed: false };
  try {
    const criteria = Array.isArray(review.criteriaSnapshot) ? review.criteriaSnapshot : [];
    const technicalResults = evaluateTechnicalCriteria(criteria, review.technicalMetadata || {});
    const requiredTechnicalFailure = technicalResults.some((item) => item.required && !item.passed);
    let analysis;
    if (requiredTechnicalFailure) {
      analysis = {
        decision: "NEEDS_CHANGES",
        score: 0,
        summary: "Видео не прошло обязательную техническую проверку. Исправьте указанные пункты и отправьте новую версию.",
        criteria: criteria.map((criterion) => technicalResults.find((item) => item.key === criterion.key) || {
          key: criterion.key, title: criterion.title, required: Boolean(criterion.required), passed: true, confidence: 0, feedback: "Содержательная проверка не запускалась из-за технической ошибки.", timecode: null, source: "not_run",
        }),
        provider: "technical",
        model: null,
        technicalMetadata: review.technicalMetadata || {},
      };
    } else {
      analysis = mergeTechnicalResults(await provider({
        url: review.submission.url,
        lessonTitle: review.submission.lesson.title,
        criteria,
        technicalMetadata: review.technicalMetadata || {},
      }), technicalResults);
    }
    await persistDecision(review, analysis, client);
    return { claimed: true, status: analysis.decision };
  } catch (error) {
    await persistFailure(review, error, client);
    return { claimed: true, status: "FAILED", code: error?.code || "AUTO_REVIEW_FAILED" };
  }
}

function enqueueSubmissionReview(submissionId) {
  const id = Number(submissionId);
  if (!Number.isInteger(id) || id <= 0 || activeJobs.has(id)) return;
  activeJobs.add(id);
  const timer = setTimeout(() => runSubmissionReview(id).catch((error) => console.error("[VideoReview] Queue failed", { submissionId: id, reason: error?.message || error })).finally(() => activeJobs.delete(id)), 0);
  timer.unref?.();
}

async function runPendingAutoReviews(client = prisma) {
  const now = new Date();
  await client.submissionAutoReview.updateMany({
    where: { status: "PROCESSING", leaseExpiresAt: { lt: now } },
    data: { status: "QUEUED", leaseExpiresAt: null, errorCode: "LEASE_EXPIRED", errorMessage: "Предыдущая попытка была прервана и поставлена в очередь повторно." },
  });
  const pending = await client.submissionAutoReview.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: 3, select: { submissionId: true } });
  pending.forEach(({ submissionId }) => enqueueSubmissionReview(submissionId));
  return { queued: pending.length };
}

module.exports = {
  enqueueSubmissionReview,
  evaluateTechnicalCriteria,
  mergeTechnicalResults,
  persistDecision,
  persistFailure,
  runPendingAutoReviews,
  runSubmissionReview,
};
