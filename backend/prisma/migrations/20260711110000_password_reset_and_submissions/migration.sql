ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
  ON "PasswordResetToken"("userId");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

DO $$
BEGIN
  ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AssignmentSubmission" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "lessonId" INTEGER NOT NULL,
  "courseId" INTEGER,
  "type" TEXT NOT NULL,
  "url" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "feedback" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssignmentSubmission_userId_idx"
  ON "AssignmentSubmission"("userId");

CREATE INDEX IF NOT EXISTS "AssignmentSubmission_lessonId_idx"
  ON "AssignmentSubmission"("lessonId");

CREATE INDEX IF NOT EXISTS "AssignmentSubmission_courseId_idx"
  ON "AssignmentSubmission"("courseId");

CREATE INDEX IF NOT EXISTS "AssignmentSubmission_status_idx"
  ON "AssignmentSubmission"("status");

DO $$
BEGIN
  ALTER TABLE "AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
