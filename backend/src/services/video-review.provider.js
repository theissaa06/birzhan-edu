const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const {
  GoogleGenAI,
  createPartFromUri,
  createUserContent,
} = require("@google/genai");

const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash";
const DOWNLOAD_TIMEOUT_MS = Number(process.env.AUTO_REVIEW_DOWNLOAD_TIMEOUT_MS || 120000);
const PROCESSING_TIMEOUT_MS = Number(process.env.AUTO_REVIEW_PROCESSING_TIMEOUT_MS || 600000);
const MAX_VIDEO_BYTES = Math.max(1, Math.min(Number(process.env.AUTO_REVIEW_MAX_VIDEO_MB || 300), 2048)) * 1024 * 1024;

function reviewError(code, message) {
  return Object.assign(new Error(message), { code });
}

function isManagedVideoUrl(rawUrl) {
  const base = String(process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!base) return false;
  try {
    const expected = new URL(`${base}/`);
    const actual = new URL(String(rawUrl || ""));
    return actual.protocol === "https:" && actual.origin === expected.origin && actual.pathname.startsWith(expected.pathname);
  } catch {
    return false;
  }
}

function parseJsonResult(text) {
  const raw = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(raw);
  } catch {
    throw reviewError("AI_RESULT_INVALID", "Сервис анализа вернул результат в неподдерживаемом формате.");
  }
}

function normalizeTimecode(value) {
  const timecode = String(value || "").trim();
  return /^\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?$/.test(timecode) ? timecode : null;
}

function normalizeAnalysis(raw, criteria) {
  const received = new Map((Array.isArray(raw?.criteria) ? raw.criteria : []).map((item) => [String(item?.key || ""), item]));
  const normalizedCriteria = criteria.map((criterion) => {
    const item = received.get(criterion.key);
    if (!item || typeof item.passed !== "boolean") {
      throw reviewError("AI_RESULT_INCOMPLETE", `ИИ не вернул проверку критерия «${criterion.title}».`);
    }
    return {
      key: criterion.key,
      title: criterion.title,
      required: Boolean(criterion.required),
      passed: item.passed,
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
      feedback: String(item.feedback || "").trim().slice(0, 1200) || (item.passed ? "Критерий выполнен." : "Критерий требует доработки."),
      timecode: normalizeTimecode(item.timecode),
    };
  });
  const requiredFailed = normalizedCriteria.some((criterion) => criterion.required && !criterion.passed);
  return {
    decision: requiredFailed ? "NEEDS_CHANGES" : "APPROVED",
    score: Math.max(0, Math.min(100, Math.round(Number(raw?.score) || 0))),
    summary: String(raw?.summary || "").trim().slice(0, 2000) || (requiredFailed ? "Есть пункты, которые нужно доработать." : "Все обязательные критерии выполнены."),
    criteria: normalizedCriteria,
  };
}

function buildPrompt({ lessonTitle, criteria, technicalMetadata }) {
  return `Ты проверяешь практическую работу студента Frame School по видеомонтажу.

Урок: ${lessonTitle}
Метаданные, полученные при загрузке: ${JSON.stringify(technicalMetadata || {})}
Критерии: ${JSON.stringify(criteria)}

Проверь и визуальную, и звуковую части видео. Для каждого критерия верни отдельное решение. Не додумывай выполненный приём, если он не виден. Обратная связь должна быть дружелюбной и учебной, а для ошибки укажи тайм-код MM:SS или диапазон MM:SS-MM:SS, когда это возможно.

Верни только JSON без markdown:
{"score":0,"summary":"...","criteria":[{"key":"...","passed":true,"confidence":0.0,"feedback":"...","timecode":null}]}`;
}

async function downloadVideo(url, mimeType) {
  if (!isManagedVideoUrl(url)) {
    throw reviewError("VIDEO_SOURCE_NOT_MANAGED", "Автопроверка доступна только для видео, загруженных в защищённое хранилище Frame School.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const tempPath = path.join(os.tmpdir(), `frame-review-${crypto.randomUUID()}`);
  let receivedBytes = 0;
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!response.ok || !response.body) throw reviewError("VIDEO_DOWNLOAD_FAILED", `Хранилище вернуло HTTP ${response.status}.`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_VIDEO_BYTES) throw reviewError("VIDEO_TOO_LARGE_FOR_REVIEW", "Видео превышает лимит автоматической проверки.");
    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        receivedBytes += chunk.length;
        callback(receivedBytes > MAX_VIDEO_BYTES ? reviewError("VIDEO_TOO_LARGE_FOR_REVIEW", "Видео превышает лимит автоматической проверки.") : null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), limiter, fs.createWriteStream(tempPath, { flags: "wx" }));
    if (!receivedBytes) throw reviewError("VIDEO_EMPTY", "Загруженный видеофайл пуст.");
    return {
      tempPath,
      size: receivedBytes,
      mimeType: String(response.headers.get("content-type") || mimeType || "video/mp4").split(";")[0].trim(),
    };
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    if (error?.name === "AbortError") throw reviewError("VIDEO_DOWNLOAD_TIMEOUT", "Видео не удалось получить из хранилища вовремя.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitUntilActive(ai, name) {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  let file = await ai.files.get({ name });
  while (file?.state === "PROCESSING") {
    if (Date.now() >= deadline) throw reviewError("AI_FILE_TIMEOUT", "Gemini не успел подготовить видео к анализу.");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    file = await ai.files.get({ name });
  }
  if (file?.state === "FAILED" || !file?.uri) throw reviewError("AI_FILE_FAILED", "Gemini не смог обработать видеофайл.");
  return file;
}

async function analyzeVideoSubmission({ url, lessonTitle, criteria, technicalMetadata }) {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw reviewError("AI_NOT_CONFIGURED", "Автопроверка пока не настроена на сервере.");
  if (!Array.isArray(criteria) || !criteria.length) throw reviewError("CRITERIA_NOT_CONFIGURED", "Для задания не заданы критерии автопроверки.");

  const ai = new GoogleGenAI({ apiKey });
  const local = await downloadVideo(url, technicalMetadata?.contentType);
  let uploaded = null;
  try {
    uploaded = await ai.files.upload({ file: local.tempPath, config: { mimeType: local.mimeType, displayName: `Frame School review ${Date.now()}` } });
    const ready = await waitUntilActive(ai, uploaded.name);
    const response = await ai.models.generateContent({
      model: VIDEO_MODEL,
      contents: createUserContent([
        createPartFromUri(ready.uri, ready.mimeType || local.mimeType),
        buildPrompt({ lessonTitle, criteria, technicalMetadata: { ...technicalMetadata, verifiedSize: local.size, verifiedMimeType: local.mimeType } }),
      ]),
      config: { temperature: 0.1, maxOutputTokens: 2400, responseMimeType: "application/json" },
    });
    return {
      ...normalizeAnalysis(parseJsonResult(response.text), criteria),
      provider: "gemini",
      model: VIDEO_MODEL,
      technicalMetadata: { ...technicalMetadata, verifiedSize: local.size, verifiedMimeType: local.mimeType },
    };
  } catch (error) {
    if (error?.code) throw error;
    throw reviewError("AI_PROVIDER_ERROR", error?.message || "Gemini временно недоступен.");
  } finally {
    await fs.promises.rm(local.tempPath, { force: true }).catch(() => {});
    if (uploaded?.name) await ai.files.delete({ name: uploaded.name }).catch(() => {});
  }
}

module.exports = {
  VIDEO_MODEL,
  analyzeVideoSubmission,
  isManagedVideoUrl,
  normalizeAnalysis,
};
