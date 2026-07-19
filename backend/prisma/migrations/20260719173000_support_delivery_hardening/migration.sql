-- Expand support messages into durable threads and make client retries idempotent.
ALTER TABLE "SupportMessage"
  ADD COLUMN "parentId" INTEGER,
  ADD COLUMN "clientRequestId" TEXT;

-- Preserve replies created by the legacy reply:<id> convention.
UPDATE "SupportMessage" AS reply
SET "parentId" = substring(reply."topic" from 7)::INTEGER
WHERE reply."from" = 'admin'
  AND reply."topic" ~ '^reply:[0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM "SupportMessage" AS source
    WHERE source."id" = substring(reply."topic" from 7)::INTEGER
  );

CREATE UNIQUE INDEX "SupportMessage_clientRequestId_key"
  ON "SupportMessage"("clientRequestId");
CREATE INDEX "SupportMessage_parentId_createdAt_idx"
  ON "SupportMessage"("parentId", "createdAt");

ALTER TABLE "SupportMessage"
  ADD CONSTRAINT "SupportMessage_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SupportMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
