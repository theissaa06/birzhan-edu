CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Новый диалог',
    "mode" TEXT NOT NULL DEFAULT 'assistant',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "action" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIConversation_userId_lastMessageAt_idx" ON "AIConversation"("userId", "lastMessageAt");
CREATE INDEX "AIChatMessage_conversationId_createdAt_idx" ON "AIChatMessage"("conversationId", "createdAt");

ALTER TABLE "AIConversation"
ADD CONSTRAINT "AIConversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIChatMessage"
ADD CONSTRAINT "AIChatMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
