// backend/src/routes/ai.js
// POST /api/ai/chat — Birzhan AI через Gemini + fallback demo

const express = require("express");
const router = express.Router();

const { GoogleGenAI } = require("@google/genai");

const GEMINI_TEST_MODE = false;

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_TEXT_LENGTH = 1500;
const MAX_OUTPUT_TOKENS = 900;

if (!process.env.GEMINI_API_KEY) {
  console.warn("[Birzhan AI] GEMINI_API_KEY не найден в .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `Ты Birzhan AI — быстрый универсальный AI-помощник образовательной платформы Birzhan-Edu.

Платформа обучает видеомонтажу, CapCut, Premiere Pro, TikTok/Reels, VFX, цветокоррекции, звуку, портфолио и digital-навыкам.

Отвечай на любые нормальные вопросы пользователя: учёба, школа, тексты, идеи, код, программирование, сайт, повседневные вопросы, видеомонтаж, CapCut, Premiere Pro, TikTok, YouTube, портфолио и digital-навыки.

Правила:
- Отвечай быстро и по делу.
- Если вопрос простой — отвечай коротко.
- Если вопрос сложный — дай понятные шаги.
- Если пользователь просит подробно — отвечай подробнее.
- Если пользователь просит кратко — отвечай кратко.
- Если вопрос про код — давай рабочий пример.
- Отвечай на языке пользователя.
- Можно обращаться на "ты".
- Не пиши огромные ответы без просьбы.
- Если вопрос про Birzhan-Edu — отвечай как помощник платформы.`;

function getDemoAnswer(message = "") {
  const originalText = String(message || "").trim();
  const text = originalText.toLowerCase();

  if (
    text.includes("привет") ||
    text.includes("салам") ||
    text.includes("здравствуй") ||
    text.includes("hello") ||
    text.includes("hi")
  ) {
    return "Привет! Я Birzhan AI. Можешь задать мне любой вопрос: про учёбу, код, сайт, монтаж, CapCut, Premiere Pro, идеи, тексты или обычные темы.";
  }

  if (
    text.includes("как дела") ||
    text.includes("как ты") ||
    text.includes("что делаешь")
  ) {
    return "У меня всё хорошо, я готов помогать тебе 😊 Можешь задать вопрос, попросить идею, объяснение, текст, код или совет по монтажу.";
  }

  if (
    text.includes("спасибо") ||
    text.includes("рахмет") ||
    text.includes("thank")
  ) {
    return "Пожалуйста! Обращайся, я всегда рядом и готов помочь.";
  }

  const mathOnly = originalText.replace(/\s/g, "");

  if (/^[0-9+\-*/().,%]+$/.test(mathOnly)) {
    try {
      const safeExpression = mathOnly.replace(/,/g, ".");
      const result = Function(`"use strict"; return (${safeExpression})`)();

      if (Number.isFinite(result)) {
        return `Ответ: ${result}`;
      }
    } catch {
      return "Я вижу математический пример, но не смог точно посчитать. Напиши его чуть проще, например: 25 + 17 или 120 / 4.";
    }
  }

  if (text.includes("2+2") || text.includes("сколько будет 2")) {
    return "2 + 2 = 4.";
  }

  if (
    text.includes("день рождения") ||
    text.includes("поздравление") ||
    text.includes("поздравь")
  ) {
    return "Конечно! Вот вариант: Желаю крепкого здоровья, счастья, удачи, исполнения желаний и много радостных моментов. Пусть каждый день приносит новые возможности, поддержку близких и хорошее настроение!";
  }

  if (
    text.includes("эссе") ||
    text.includes("сочинение") ||
    text.includes("текст")
  ) {
    return "Конечно. Напиши тему, объём и стиль: кратко, красиво, школьно или подробно. Я помогу составить готовый текст с началом, основной частью и выводом.";
  }

  if (
    text.includes("код") ||
    text.includes("react") ||
    text.includes("typescript") ||
    text.includes("javascript") ||
    text.includes("ошибка") ||
    text.includes("сайт") ||
    text.includes("backend") ||
    text.includes("frontend") ||
    text.includes("node") ||
    text.includes("express")
  ) {
    return "Могу помочь с кодом. Скинь ошибку, файл или скрин — я подскажу, что именно заменить. Лучше отправляй полный код файла, чтобы я дал готовую исправленную версию и ничего не сломал.";
  }

  if (
    text.includes("capcut") ||
    text.includes("капкат") ||
    text.includes("premiere") ||
    text.includes("премьер") ||
    text.includes("монтаж") ||
    text.includes("эдит") ||
    text.includes("видео")
  ) {
    return "Для монтажа начни с основы: выбери лучшие кадры, убери лишнее, подстрой нарезку под ритм музыки, добавь акценты, текст и лёгкую цветокоррекцию. Если хочешь, напиши стиль видео — TikTok, Reels, игровой клип, авто-эдит или учебный ролик — и я подскажу конкретный план.";
  }

  if (
    text.includes("идея") ||
    text.includes("идеи") ||
    text.includes("tiktok") ||
    text.includes("тикток") ||
    text.includes("youtube") ||
    text.includes("shorts") ||
    text.includes("reels")
  ) {
    return "Идея для видео: сделай формат «до/после». Сначала покажи сырой материал, потом 2–3 шага обработки: нарезка, музыка, цвет, эффекты — и в конце финальный результат. Такой формат хорошо подходит для TikTok, Reels и Shorts.";
  }

  if (
    text.includes("birzhan") ||
    text.includes("edu") ||
    text.includes("платформа") ||
    text.includes("курс") ||
    text.includes("урок")
  ) {
    return "Birzhan-Edu Platform — образовательная платформа для обучения видеомонтажу, CapCut, Premiere Pro, VFX, цветокоррекции, звуку и digital-навыкам. Здесь можно проходить уроки, выполнять практику, получать прогресс, бонусы и сертификаты.";
  }

  return `Я понял твой вопрос: "${originalText}". Сейчас я могу поддержать разговор и помочь по разным темам: учёба, тексты, код, сайт, монтаж, CapCut, Premiere Pro, идеи и обычные вопросы. Напиши чуть подробнее, что именно нужно: объяснить, придумать, посчитать, исправить, написать текст или дать совет.`;
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
      const role = item.role === "user" ? "Пользователь" : "Birzhan AI";
      return `${role}: ${item.text.slice(0, MAX_HISTORY_TEXT_LENGTH)}`;
    })
    .join("\n");

  return `${SYSTEM_PROMPT}

История диалога:
${historyText || "Истории пока нет."}

Текущий вопрос пользователя:
${message}

Ответ Birzhan AI:`;
}

router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
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

    if (!process.env.GEMINI_API_KEY) {
      if (GEMINI_TEST_MODE) {
        return res.status(500).json({
          success: false,
          message:
            "GEMINI_API_KEY не найден. Проверь backend/.env и перезапусти backend.",
        });
      }

      return res.json({
        success: true,
        answer: getDemoAnswer(trimmedMessage),
        demo: true,
        source: "demo",
        message: "AI работает в резервном режиме.",
      });
    }

    const prompt = buildGeminiPrompt(trimmedMessage, history);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    const answer = response.text?.trim();

    if (!answer) {
      if (GEMINI_TEST_MODE) {
        return res.status(500).json({
          success: false,
          message: "Gemini ответил, но текст ответа пустой.",
        });
      }

      return res.json({
        success: true,
        answer: getDemoAnswer(trimmedMessage),
        demo: true,
        source: "demo",
        message: "AI работает в резервном режиме.",
      });
    }

    return res.json({
      success: true,
      answer,
      demo: false,
      source: "gemini",
    });
  } catch (err) {
    console.error("[Birzhan AI / Gemini] Ошибка:", err?.message || err);

    if (GEMINI_TEST_MODE) {
      return res.status(500).json({
        success: false,
        message: `Gemini ошибка: ${err?.message || "неизвестная ошибка"}`,
      });
    }

    return res.json({
      success: true,
      answer: getDemoAnswer(req.body?.message),
      demo: true,
      source: "demo",
      message: "AI работает в резервном режиме.",
    });
  }
});

module.exports = router;
