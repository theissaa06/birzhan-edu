const assert = require("node:assert/strict");
const test = require("node:test");
const {
  evaluateTechnicalCriteria,
  runSubmissionReview,
} = require("../src/services/video-review.service");

const criteria = [
  { key: "duration", title: "Длительность", description: "От 10 до 30 секунд", kind: "DURATION", required: true, minValue: 10, maxValue: 30 },
  { key: "resolution", title: "Разрешение", description: "Не ниже Full HD", kind: "RESOLUTION", required: true, expectedValue: "1920x1080" },
  { key: "format", title: "Формат", description: "MP4 или WEBM", kind: "FORMAT", required: true, expectedValue: "video/mp4,video/webm" },
];

test("technical video checks are deterministic and return criterion-specific feedback", () => {
  const passed = evaluateTechnicalCriteria(criteria, { durationSeconds: 18.4, width: 1920, height: 1080, contentType: "video/mp4" });
  assert.equal(passed.length, 3);
  assert.equal(passed.every((item) => item.passed), true);
  const failed = evaluateTechnicalCriteria(criteria, { durationSeconds: 45, width: 1280, height: 720, contentType: "video/quicktime" });
  assert.deepEqual(failed.map((item) => item.passed), [false, false, false]);
  assert.match(failed[0].feedback, /45\.0/);
});

function createReviewClient({ providerFailure = null } = {}) {
  const writes = { review: [], submission: [], progress: [], notifications: [], audits: [] };
  const review = {
    id: 41,
    submissionId: 91,
    status: "QUEUED",
    criteriaSnapshot: [{ key: "transitions", title: "Склейки", description: "Чистые склейки", kind: "TRANSITIONS", required: true }],
    technicalMetadata: { contentType: "video/mp4", size: 2048 },
    submission: { id: 91, userId: 7, lessonId: 8, courseId: 3, url: "https://media.example.test/video.mp4", lesson: { title: "Чистая склейка" } },
  };
  const tx = {
    submissionAutoReview: { update: async ({ data }) => { writes.review.push(data); return data; } },
    assignmentSubmission: { update: async ({ data }) => { writes.submission.push(data); return data; } },
    lessonProgress: { upsert: async ({ create }) => { writes.progress.push(create); return create; } },
    notification: { create: async ({ data }) => { writes.notifications.push(data); return data; } },
    auditLog: { create: async ({ data }) => { writes.audits.push(data); return data; } },
  };
  const client = {
    submissionAutoReview: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => review,
    },
    $transaction: async (callback) => callback(tx),
  };
  const provider = async () => {
    if (providerFailure) throw providerFailure;
    return {
      decision: "APPROVED",
      score: 96,
      summary: "Монтаж выполнен аккуратно.",
      criteria: [{ key: "transitions", title: "Склейки", required: true, passed: true, confidence: 0.96, feedback: "Склейки чистые.", timecode: "00:04" }],
      provider: "gemini",
      model: "test-model",
      technicalMetadata: review.technicalMetadata,
    };
  };
  return { client, provider, writes };
}

test("approved AI decision completes progress, notifies the user, and writes an audit event", async () => {
  const { client, provider, writes } = createReviewClient();
  const result = await runSubmissionReview(91, { client, provider });
  assert.equal(result.status, "APPROVED");
  assert.equal(writes.review.at(-1).status, "APPROVED");
  assert.equal(writes.submission.at(-1).status, "approved");
  assert.equal(writes.progress.length, 1);
  assert.equal(writes.notifications[0].type, "submission_approved");
  assert.equal(writes.audits[0].action, "submission.auto_review_approved");
});

test("provider failure is recorded as a technical failure and never as a rejected montage", async () => {
  const failure = Object.assign(new Error("simulated provider timeout"), { code: "AI_TIMEOUT" });
  const { client, provider, writes } = createReviewClient({ providerFailure: failure });
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await runSubmissionReview(91, { client, provider });
    assert.equal(result.status, "FAILED");
    assert.equal(writes.review.at(-1).status, "FAILED");
    assert.equal(writes.review.at(-1).errorCode, "AI_TIMEOUT");
    assert.equal(writes.submission.length, 0);
    assert.equal(writes.notifications[0].type, "submission_review_failed");
    assert.equal(writes.audits[0].action, "submission.auto_review_failed");
  } finally {
    console.error = originalError;
  }
});
