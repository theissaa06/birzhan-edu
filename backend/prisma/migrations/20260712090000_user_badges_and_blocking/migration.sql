ALTER TABLE "User"
ADD COLUMN "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockedUntil" TIMESTAMP(3),
ADD COLUMN "blockedReason" TEXT,
ADD COLUMN "blockedById" INTEGER;

CREATE INDEX "User_blockedUntil_idx" ON "User"("blockedUntil");
