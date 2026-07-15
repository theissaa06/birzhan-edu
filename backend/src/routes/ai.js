// backend/src/routes/ai.js
// POST /api/ai/chat - Frame AI через Gemini + безопасный demo fallback.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const AI_TIMEOUT_MS = 25000;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_TEXT_LENGTH = 1500;
const MAX_OUTPUT_TOKENS = 900;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const ALLOW_DEMO_FALLBACK =
  process.env.AI_ALLOW_DEMO_FALLBACK === "true";

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Слишком много запросов к Frame AI. Подожди минуту и попробуй снова.",
  },
});

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

if (!ai) {
  console.warn(
    ALLOW_DEMO_FALLBACK
      ? "[Frame AI] GEMINI_API_KEY не настроен. Разрешён явный demo fallback."
      : "[Frame AI] GEMINI_API_KEY не настроен. Production AI недоступен до добавления ключа.",
  );
}

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

function getDemoAnswer(message = "") {
  const originalText = String(message || "").trim();
  const text = originalText.toLowerCase();

  if (!originalText) {
    return "Напиши вопрос, и я помогу с обучением, монтажом, курсами Frame School или идеей для видео.";
  }

  if (text.includes("2+2") || text.replace(/\s/g, "") === "2+2") {
    return "2 + 2 = 4.";
  }

  if (
    text.includes("привет") ||
    text.includes("салам") ||
    text.includes("здравств") ||
    text.includes("hello") ||
    text.includes("hi")
  ) {
    return "Привет! Я Frame AI. Могу помочь с курсами Frame School, идеями для роликов, CapCut, Premiere Pro, портфолио, текстами и учебными вопросами.";
  }

  if (
    text.includes("capcut") ||
    text.includes("капкат") ||
    text.includes("premiere") ||
    text.includes("монтаж") ||
    text.includes("видео")
  ) {
    return "Для монтажа начни с цели ролика: выбери лучший материал, убери лишнее, подстрой склейки под ритм, добавь текстовые акценты, проверь звук и сделай лёгкую цветокоррекцию. Если расскажешь формат ролика, я дам точный план.";
  }

  if (
    text.includes("идея") ||
    text.includes("tiktok") ||
    text.includes("reels") ||
    text.includes("shorts") ||
    text.includes("youtube")
  ) {
    return "Идея для ролика: формат “до/после”. Покажи сырой материал, затем 2-3 шага обработки: нарезка, музыка, цвет, эффекты, и в конце финальный результат. Такой формат хорошо работает для TikTok, Reels и Shorts.";
  }

  if (
    text.includes("сертификат") ||
    text.includes("курс") ||
    text.includes("урок") ||
    text.includes("frame school")
  ) {
    return "В Frame School курс строится вокруг практики: ты проходишь уроки, выполняешь задания, фиксируешь прогресс и собираешь работы в портфолио. Сертификат логично выдавать после завершения всех обязательных заданий курса.";
  }

  return `Я понял вопрос: “${originalText}”. Сейчас я работаю в резервном режиме без обращения к модели, но могу помочь по темам Frame School: обучение, монтаж, CapCut, Premiere Pro, идеи для видео, портфолио и сертификаты.`;
}

function buildGeminiPrompt(message, history = []) {
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

История диалога:
${historyText || "Истории пока нет."}

Текущий вопрос пользователя:
${message}

Ответ Frame AI:`;
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("AI_TIMEOUT"));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

router.get("/status", (req, res) => {
  return res.json({
    success: true,
    provider: "gemini",
    model: GEMINI_MODEL,
    mode: ai ? "gemini" : ALLOW_DEMO_FALLBACK ? "demo" : "unavailable",
    configured: Boolean(ai),
  });
});

router.post("/chat", aiLimiter, async (req, res) => {
  try {
    const { message, history } = req.body || {};

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

    if (!ai) {
      if (!ALLOW_DEMO_FALLBACK) {
        return res.status(503).json({
          success: false,
          answer: "",
          demo: false,
          source: "unavailable",
          code: "AI_NOT_CONFIGURED",
          message:
            "Frame AI временно недоступен: Gemini не настроен на сервере.",
        });
      }

      return res.json({
        success: true,
        answer: getDemoAnswer(trimmedMessage),
        demo: true,
        source: "demo",
        message: "Frame AI работает в резервном режиме.",
      });
    }

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: buildGeminiPrompt(trimmedMessage, history),
        config: {
          temperature: 0.4,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
      AI_TIMEOUT_MS,
    );

    const answer = response.text?.trim();

    if (!answer) {
      if (!ALLOW_DEMO_FALLBACK) {
        return res.status(502).json({
          success: false,
          answer: "",
          demo: false,
          source: "gemini",
          code: "AI_EMPTY_RESPONSE",
          message: "Gemini не вернул ответ. Попробуйте повторить запрос.",
        });
      }

      return res.json({
        success: true,
        answer: getDemoAnswer(trimmedMessage),
        demo: true,
        source: "demo",
        message: "Frame AI вернул пустой ответ, включён резервный режим.",
      });
    }

    return res.json({
      success: true,
      answer,
      demo: false,
      source: "gemini",
    });
  } catch (err) {
    const isTimeout = err?.message === "AI_TIMEOUT";

    console.error("[Frame AI] Ошибка запроса", {
      error: err?.message || err,
      timeout: isTimeout,
      messageLength: String(req.body?.message || "").length,
    });

    if (ALLOW_DEMO_FALLBACK) {
      return res.json({
        success: true,
        answer: getDemoAnswer(req.body?.message),
        demo: true,
        source: "demo",
        message: isTimeout
          ? "Не получилось получить ответ вовремя. Попробуй ещё раз."
          : "Frame AI работает в резервном режиме.",
      });
    }

    return res.status(isTimeout ? 504 : 502).json({
      success: false,
      answer: "",
      demo: false,
      source: "gemini",
      code: isTimeout ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
      message: isTimeout
        ? "Gemini не ответил вовремя. Попробуйте ещё раз."
        : "Gemini временно недоступен. Попробуйте позже.",
    });
  }
});

module.exports = router;
