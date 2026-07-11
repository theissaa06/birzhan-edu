ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "whatYouLearn" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "steps" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "taskText" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "beginnerHelp" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "hints" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "LessonProgress" ADD COLUMN IF NOT EXISTS "courseId" INTEGER;
ALTER TABLE "LessonProgress" ADD COLUMN IF NOT EXISTS "started" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LessonProgress" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "LessonProgress" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KZT',
  "status" TEXT NOT NULL,
  "plan" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_provider_transactionId_key"
  ON "PaymentTransaction"("provider", "transactionId");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_userId_idx"
  ON "PaymentTransaction"("userId");

DO $$
BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
