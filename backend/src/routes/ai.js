// backend/src/routes/ai.js
// POST /api/ai/chat - Frame AI через реальный Gemini API без локальных заглушек.

const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("node:crypto");
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware } = require("../middleware/auth.middleware");
const { clampInteger, generateWithRetry, providerStatus } = require("../services/gemini-chat.service");
const { generateGeminiText, safeProviderDetail } = require("../services/gemini-rest.service");
const {
  normalizeAIMode,
  normalizeAIAction,
  publicAIOptions,
  optionInstructions,
  conversationTitle,
} = require("../services/frame-ai-options.service");

const router = express.Router();

const AI_TIMEOUT_MS = clampInteger(process.env.AI_REQUEST_TIMEOUT_MS, 18000, 5000, 60000);
const AI_MAX_RETRIES = clampInteger(process.env.AI_MAX_RETRIES, 1, 0, 2);
const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_TEXT_LENGTH = 1500;
const MAX_OUTPUT_TOKENS = 900;
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || "gemini-3.5-flash").trim();
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn("[Frame AI] Request rate limited", { requestId: req.headers["x-request-id"] || null, timestamp: new Date().toISOString() });
    return res.status(429).json({ success: false, code: "AI_RATE_LIMIT", message: "Слишком много запросов к Frame AI. Подождите минуту и попробуйте снова." });
  },
});

if (!GEMINI_API_KEY) console.warn("[Frame AI] GEMINI_API_KEY не настроен. Frame AI недоступен до добавления ключа.");

const SYSTEM_PROMPT = `Ты Frame AI - помощник образовательной платформы Frame School.

Контекст платформы:
- Frame School обучает видеомонтажу через практические задания, а не только просмотр видео.
- Основные направления: CapCut, Premiere Pro, After Effects, TikTok/Reels, YouTube, VFX, звук, цветокоррекция и портфолио.
- Урок состоит из задачи, критериев результата, подсказок и практики.
- Сертификаты должны опираться на выполненные задания и прогресс.
- Premium PRO даёт расширенные материалы, вебинары, фидбек, портфолио-пак и расширенные сертификаты.

Правила ответа:
- Отвечай на языке пользователя.
- Пиши понятно, практично и без лишней воды.
- Если вопрос про монтаж, давай конкретные шаги.
- Если вопрос про Frame School, отвечай как помощник платформы.
- Если не хватает данных, задай один короткий уточняющий вопрос.`;

function buildGeminiPrompt(message, history = [], mode = "assistant", action = "answer") {
  const instructions = optionInstructions(mode, action);
  const safeHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_ITEMS)
    : [];

  const historyText = safeHistory
    .filter(
      (item) =>
        item &&
        typeof item.role === "string" &&
        typeof item.text === "string" &&
        (item.role === "user" || item.role === "assistant"),
    )
    .map((item) => {
      const role = item.role === "user" ? "Пользователь" : "Frame AI";
      return `${role}: ${item.text.slice(0, MAX_HISTORY_TEXT_LENGTH)}`;
    })
    .join("\n");

  return `${SYSTEM_PROMPT}

Текущий режим:
${instructions.modeInstruction}

Формат текущей задачи:
${instructions.actionInstruction}

История диалога:
${historyText || "Истории пока нет."}

Текущий вопрос пользователя:
${message}

Ответ Frame AI:`;
}

function serializeConversation(conversation) {
  const lastMessage = Array.isArray(conversation?.messages) ? conversation.messages[0] : null;
  return {
    id: conversation.id,
    title: conversation.title,
    mode: normalizeAIMode(conversation.mode),
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    preview: lastMessage?.content ? String(lastMessage.content).slice(0, 120) : "",
    messageCount: conversation._count?.messages,
  };
}

async function ownedConversation(userId, conversationId, includeMessages = false) {
  if (!conversationId) return null;
  return prisma.aIConversation.findFirst({
    where: { id: String(conversationId), userId },
    include: includeMessages
      ? { messages: { orderBy: { createdAt: "asc" }, take: 200 } }
      : undefined,
  });
}

async function persistExchange({ userId, conversation, message, answer, mode, action }) {
  const now = new Date();
  const title = conversation?.title === "Новый диалог" || !conversation?.title
    ? conversationTitle(message)
    : conversation.title;

  if (!conversation) {
    const created = await prisma.aIConversation.create({
      data: {
        userId,
        title,
        mode,
        lastMessageAt: now,
        messages: {
          create: [
            { role: "user", content: message, action },
            { role: "assistant", content: answer, action },
          ],
        },
      },
    });
    return serializeConversation(created);
  }

  const [, updated] = await prisma.$transaction([
    prisma.aIChatMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "user", content: message, action },
        { conversationId: conversation.id, role: "assistant", content: answer, action },
      ],
    }),
    prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { title, mode, lastMessageAt: now },
    }),
  ]);
  return serializeConversation(updated);
}

router.get("/status", (req, res) => {
  return res.json({
    success: true,
    provider: "gemini",
    model: GEMINI_MODEL,
    mode: GEMINI_API_KEY ? "gemini" : "unavailable",
    configured: Boolean(GEMINI_API_KEY),
  });
});

router.get("/options", (_req, res) => {
  return res.json({ success: true, ...publicAIOptions() });
});

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const conversations = await prisma.aIConversation.findMany({
      where: { userId: req.user.id },
      orderBy: { lastMessageAt: "desc" },
      take: 40,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
        _count: { select: { messages: true } },
      },
    });
    return res.json({ success: true, conversations: conversations.map(serializeConversation) });
  } catch (error) {
    console.error("[Frame AI] Failed to list conversations", { userId: req.user.id, reason: error?.message || String(error) });
    return res.status(500).json({ success: false, code: "AI_HISTORY_READ_FAILED", message: "Не удалось загрузить историю Frame AI." });
  }
});

router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const mode = normalizeAIMode(req.body?.mode);
    const conversation = await prisma.aIConversation.create({
      data: { userId: req.user.id, mode },
    });
    return res.status(201).json({ success: true, conversation: serializeConversation(conversation) });
  } catch (error) {
    console.error("[Frame AI] Failed to create conversation", { userId: req.user.id, reason: error?.message || String(error) });
    return res.status(500).json({ success: false, code: "AI_CONVERSATION_CREATE_FAILED", message: "Не удалось создать новый диалог." });
  }
});

router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await ownedConversation(req.user.id, req.params.id, true);
    if (!conversation) {
      return res.status(404).json({ success: false, code: "AI_CONVERSATION_NOT_FOUND", message: "Диалог не найден." });
    }
    return res.json({
      success: true,
      conversation: serializeConversation(conversation),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.content,
        action: message.action,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    console.error("[Frame AI] Failed to read conversation", { userId: req.user.id, conversationId: req.params.id, reason: error?.message || String(error) });
    return res.status(500).json({ success: false, code: "AI_HISTORY_READ_FAILED", message: "Не удалось открыть диалог." });
  }
});

router.delete("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const result = await prisma.aIConversation.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    if (!result.count) {
      return res.status(404).json({ success: false, code: "AI_CONVERSATION_NOT_FOUND", message: "Диалог не найден." });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("[Frame AI] Failed to delete conversation", { userId: req.user.id, conversationId: req.params.id, reason: error?.message || String(error) });
    return res.status(500).json({ success: false, code: "AI_CONVERSATION_DELETE_FAILED", message: "Не удалось удалить диалог." });
  }
});

router.post("/chat", optionalAuthMiddleware, aiLimiter, async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const { message, history, conversationId } = req.body || {};
    const mode = normalizeAIMode(req.body?.mode);
    const action = normalizeAIAction(req.body?.action);

    if (typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Сообщение не может быть пустым.",
      });
    }

    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: "Сообщение не может быть пустым.",
      });
    }

    let conversation = null;
    let storedHistory = null;
    if (req.user && conversationId) {
      conversation = await ownedConversation(req.user.id, conversationId, true);
      if (!conversation) {
        return res.status(404).json({ success: false, code: "AI_CONVERSATION_NOT_FOUND", message: "Диалог не найден." });
      }
      storedHistory = conversation.messages
        .slice(-MAX_HISTORY_ITEMS)
        .map((item) => ({ role: item.role, text: item.content }));
    }

    const effectiveHistory = storedHistory || history;

    if (!GEMINI_API_KEY) return res.status(503).json({
      success: false,
      answer: "",
      source: "unavailable",
      code: "AI_NOT_CONFIGURED",
      message: "Frame AI временно недоступен: Gemini не настроен на сервере.",
    });

    const result = await generateWithRetry({
      timeoutMs: AI_TIMEOUT_MS,
      maxRetries: AI_MAX_RETRIES,
      generate: () => generateGeminiText({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL,
        prompt: buildGeminiPrompt(trimmedMessage, effectiveHistory, mode, action),
        temperature: 0.4,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      }),
      onRetry: ({ attempt, delayMs, status, code }) => console.warn("[Frame AI] Retrying provider request", {
        requestId,
        attempt,
        delayMs,
        providerStatus: status,
        providerCode: code,
        timestamp: new Date().toISOString(),
      }),
    });
    const response = result.response;

    const answer = response.text?.trim();

    if (!answer) return res.status(502).json({
      success: false,
      answer: "",
      source: "gemini",
      code: "AI_EMPTY_RESPONSE",
      message: "Gemini не вернул ответ. Попробуйте повторить запрос.",
    });

    console.info("[Frame AI] Request succeeded", {
      requestId,
      model: GEMINI_MODEL,
      attempts: result.attempts,
      durationMs: result.durationMs,
      messageLength: trimmedMessage.length,
      historyItems: Array.isArray(history) ? Math.min(history.length, MAX_HISTORY_ITEMS) : 0,
      timestamp: new Date().toISOString(),
    });
    const savedConversation = req.user
      ? await persistExchange({ userId: req.user.id, conversation, message: trimmedMessage, answer, mode, action })
      : null;
    return res.json({
      success: true,
      answer,
      source: "gemini",
      requestId,
      conversation: savedConversation,
    });
  } catch (err) {
    const isTimeout = err?.code === "AI_TIMEOUT" || err?.message === "AI_TIMEOUT";
    const status = providerStatus(err);
    const isProviderLimit = status === 429;
    const isProviderAuth = status === 401 || status === 403;

    console.error("[Frame AI] Provider request failed", {
      requestId,
      providerStatus: status,
      providerCode: err?.code || err?.name || "AI_PROVIDER_ERROR",
      timeout: isTimeout,
      attempts: err?.attempts || 1,
      durationMs: Date.now() - startedAt,
      messageLength: String(req.body?.message || "").length,
      historyItems: Array.isArray(req.body?.history) ? Math.min(req.body.history.length, MAX_HISTORY_ITEMS) : 0,
      providerDetail: safeProviderDetail(err?.providerDetail || err?.message),
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    });

    return res.status(isTimeout ? 504 : isProviderLimit || isProviderAuth ? 503 : 502).json({
      success: false,
      answer: "",
      source: "gemini",
      code: isTimeout ? "AI_TIMEOUT" : isProviderLimit ? "AI_PROVIDER_RATE_LIMIT" : isProviderAuth ? "AI_PROVIDER_CONFIGURATION_ERROR" : "AI_PROVIDER_ERROR",
      message: isTimeout
        ? "Frame AI не успел ответить. Повторите запрос ещё раз."
        : isProviderLimit
          ? "Frame AI достиг временного лимита провайдера. Попробуйте через несколько минут."
          : isProviderAuth
            ? "Frame AI временно недоступен из-за настройки подключения. Команда уже может увидеть эту ошибку в журнале."
            : "Frame AI временно недоступен. Попробуйте позже.",
      requestId,
    });
  }
});

module.exports = router;
