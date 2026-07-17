-- Frame School platform foundation (expand + backfill).
-- Legacy User role/badge/premium/block columns are deliberately retained for one release.

CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'DEVELOPER', 'OWNER');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');
CREATE TYPE "BanStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PremiumOverrideMode" AS ENUM ('FORCE_ENABLED', 'FORCE_DISABLED');
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE', 'TELEGRAM', 'VK');
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'USERS', 'PREMIUM', 'STAFF');

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'GRACE';

ALTER TABLE "User"
  ALTER COLUMN "password" DROP NOT NULL,
  ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3);

ALTER TABLE "Review" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SupportMessage"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "topic" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "Subscription" ADD COLUMN "graceUntil" TIMESTAMP(3);

CREATE TABLE "UserRole" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "role" "SystemRole" NOT NULL,
  "grantedById" INTEGER,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserBan" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "actorId" INTEGER,
  "revokedById" INTEGER,
  "reason" TEXT NOT NULL,
  "status" "BanStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserBan_userId_status_idx" ON "UserBan"("userId", "status");
CREATE INDEX "UserBan_status_endsAt_idx" ON "UserBan"("status", "endsAt");
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" BIGSERIAL NOT NULL,
  "actorId" INTEGER,
  "targetUserId" INTEGER,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Announcement" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
  "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeUntil" TIMESTAMP(3),
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_activeFrom_activeUntil_idx" ON "Announcement"("activeFrom", "activeUntil");
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AnnouncementRead" (
  "id" SERIAL NOT NULL,
  "announcementId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON "AnnouncementRead"("announcementId", "userId");
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PremiumOverride" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "mode" "PremiumOverrideMode" NOT NULL,
  "validUntil" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "actorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PremiumOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PremiumOverride_userId_key" ON "PremiumOverride"("userId");
CREATE INDEX "PremiumOverride_mode_validUntil_idx" ON "PremiumOverride"("mode", "validUntil");
ALTER TABLE "PremiumOverride" ADD CONSTRAINT "PremiumOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PremiumOverride" ADD CONSTRAINT "PremiumOverride_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SubscriptionEvent" (
  "id" BIGSERIAL NOT NULL,
  "subscriptionId" INTEGER,
  "userId" INTEGER NOT NULL,
  "actorId" INTEGER,
  "type" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionEvent_idempotencyKey_key" ON "SubscriptionEvent"("idempotencyKey");
CREATE INDEX "SubscriptionEvent_userId_createdAt_idx" ON "SubscriptionEvent"("userId", "createdAt");
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OAuthIdentity" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "emailSnapshot" TEXT,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthIdentity_provider_providerUserId_key" ON "OAuthIdentity"("provider", "providerUserId");
CREATE UNIQUE INDEX "OAuthIdentity_userId_provider_key" ON "OAuthIdentity"("userId", "provider");
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OAuthLoginAttempt" (
  "id" SERIAL NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "stateHash" TEXT NOT NULL,
  "nonceHash" TEXT,
  "codeVerifier" TEXT,
  "exchangeCodeHash" TEXT,
  "redirectPath" TEXT,
  "userId" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "exchangedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthLoginAttempt_stateHash_key" ON "OAuthLoginAttempt"("stateHash");
CREATE UNIQUE INDEX "OAuthLoginAttempt_exchangeCodeHash_key" ON "OAuthLoginAttempt"("exchangeCodeHash");
CREATE INDEX "OAuthLoginAttempt_provider_expiresAt_idx" ON "OAuthLoginAttempt"("provider", "expiresAt");
ALTER TABLE "OAuthLoginAttempt" ADD CONSTRAINT "OAuthLoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Certificate" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "courseId" INTEGER NOT NULL,
  "recipientName" TEXT NOT NULL,
  "courseTitle" TEXT NOT NULL,
  "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");
CREATE INDEX "Certificate_status_issuedAt_idx" ON "Certificate"("status", "issuedAt");
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReviewComment" (
  "id" SERIAL NOT NULL,
  "reviewId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewComment_reviewId_createdAt_idx" ON "ReviewComment"("reviewId", "createdAt");
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReviewOfficialReply" (
  "id" SERIAL NOT NULL,
  "reviewId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewOfficialReply_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewOfficialReply_reviewId_key" ON "ReviewOfficialReply"("reviewId");
ALTER TABLE "ReviewOfficialReply" ADD CONSTRAINT "ReviewOfficialReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewOfficialReply" ADD CONSTRAINT "ReviewOfficialReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Webinar" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "registrationUrl" TEXT,
  "imageUrl" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Webinar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Webinar_isPublished_startsAt_idx" ON "Webinar"("isPublished", "startsAt");

CREATE TABLE "JobPosting" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "employmentType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "salary" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobPosting_isPublished_createdAt_idx" ON "JobPosting"("isPublished", "createdAt");

CREATE TABLE "JobApplication" (
  "id" SERIAL NOT NULL,
  "jobId" INTEGER NOT NULL,
  "userId" INTEGER,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplication_jobId_status_idx" ON "JobApplication"("jobId", "status");
CREATE INDEX "JobApplication_userId_idx" ON "JobApplication"("userId");
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");
CREATE INDEX "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");
CREATE INDEX "SupportMessage_status_createdAt_idx" ON "SupportMessage"("status", "createdAt");
CREATE UNIQUE INDEX "Subscription_provider_providerId_key" ON "Subscription"("provider", "providerId");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- Backfill privileged access from the legacy role/badge representation.
INSERT INTO "UserRole" ("userId", "role")
SELECT "id", 'ADMIN'::"SystemRole" FROM "User"
WHERE "role" = 'ADMIN' OR 'ADMIN' = ANY("badges")
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
SELECT "id", 'DEVELOPER'::"SystemRole" FROM "User"
WHERE 'DEVELOPER' = ANY("badges")
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
SELECT "id", 'OWNER'::"SystemRole" FROM "User"
WHERE 'OWNER' = ANY("badges")
ON CONFLICT ("userId", "role") DO NOTHING;

-- Preserve current bans as the first history event.
INSERT INTO "UserBan" ("userId", "actorId", "reason", "status", "startsAt", "endsAt")
SELECT "id", "blockedById", COALESCE(NULLIF("blockedReason", ''), 'Перенесено из прежней системы'),
       CASE WHEN "blockedUntil" IS NOT NULL AND "blockedUntil" <= CURRENT_TIMESTAMP
            THEN 'EXPIRED'::"BanStatus" ELSE 'ACTIVE'::"BanStatus" END,
       "blockedAt", "blockedUntil"
FROM "User"
WHERE "blockedAt" IS NOT NULL;

-- Preserve legacy premium periods when no subscription exists yet.
INSERT INTO "Subscription" ("userId", "plan", "price", "currency", "status", "startedAt", "expiresAt", "graceUntil", "provider", "providerId", "updatedAt")
SELECT u."id", COALESCE(u."premiumPlan", 'legacy'), 0, 'KZT',
       CASE WHEN u."premiumUntil" > CURRENT_TIMESTAMP THEN 'ACTIVE'::"SubscriptionStatus" ELSE 'EXPIRED'::"SubscriptionStatus" END,
       COALESCE(u."premiumStarted", u."createdAt"), u."premiumUntil", u."premiumUntil" + INTERVAL '1 day',
       'legacy', 'user-' || u."id"::TEXT, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."premiumUntil" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u."id");

UPDATE "Subscription"
SET "graceUntil" = "expiresAt" + INTERVAL '1 day'
WHERE "expiresAt" IS NOT NULL AND "graceUntil" IS NULL;
