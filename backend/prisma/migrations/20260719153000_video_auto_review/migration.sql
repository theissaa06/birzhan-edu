-- Controlled rollout for asynchronous video assignment review.
-- Existing submissions stay unchanged; automatic review is opt-in per lesson.

CREATE TYPE "VideoReviewStatus" AS ENUM (
  'MANUAL_REQUIRED',
  'QUEUED',
  'PROCESSING',
  'APPROVED',
  'NEEDS_CHANGES',
  'FAILED',
  'APPEALED',
  'MANUAL_APPROVED',
  'MANUAL_NEEDS_CHANGES'
);

CREATE TYPE "SubmissionAppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Lesson"
  ADD COLUMN "autoReviewEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AssignmentSubmission"
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "LessonReviewCriterion" (
  "id" SERIAL NOT NULL,
  "lessonId" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "minValue" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "expectedValue" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "orderNumber" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonReviewCriterion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonReviewCriterion_lessonId_key_key"
  ON "LessonReviewCriterion"("lessonId", "key");
CREATE INDEX "LessonReviewCriterion_lessonId_active_orderNumber_idx"
  ON "LessonReviewCriterion"("lessonId", "active", "orderNumber");
ALTER TABLE "LessonReviewCriterion"
  ADD CONSTRAINT "LessonReviewCriterion_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SubmissionAutoReview" (
  "id" SERIAL NOT NULL,
  "submissionId" INTEGER NOT NULL,
  "status" "VideoReviewStatus" NOT NULL DEFAULT 'MANUAL_REQUIRED',
  "criteriaSnapshot" JSONB NOT NULL,
  "technicalMetadata" JSONB,
  "result" JSONB,
  "provider" TEXT,
  "model" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAutoReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionAutoReview_submissionId_key"
  ON "SubmissionAutoReview"("submissionId");
CREATE INDEX "SubmissionAutoReview_status_createdAt_idx"
  ON "SubmissionAutoReview"("status", "createdAt");
CREATE INDEX "SubmissionAutoReview_leaseExpiresAt_idx"
  ON "SubmissionAutoReview"("leaseExpiresAt");
ALTER TABLE "SubmissionAutoReview"
  ADD CONSTRAINT "SubmissionAutoReview_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SubmissionAppeal" (
  "id" SERIAL NOT NULL,
  "submissionId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "reviewerId" INTEGER,
  "reason" TEXT NOT NULL,
  "status" "SubmissionAppealStatus" NOT NULL DEFAULT 'PENDING',
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SubmissionAppeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionAppeal_submissionId_key"
  ON "SubmissionAppeal"("submissionId");
CREATE INDEX "SubmissionAppeal_status_createdAt_idx"
  ON "SubmissionAppeal"("status", "createdAt");
CREATE INDEX "SubmissionAppeal_userId_createdAt_idx"
  ON "SubmissionAppeal"("userId", "createdAt");
ALTER TABLE "SubmissionAppeal"
  ADD CONSTRAINT "SubmissionAppeal_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionAppeal"
  ADD CONSTRAINT "SubmissionAppeal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionAppeal"
  ADD CONSTRAINT "SubmissionAppeal_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
