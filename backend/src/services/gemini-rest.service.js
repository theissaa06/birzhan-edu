const GEMINI_API_ORIGIN = "https://generativelanguage.googleapis.com";

function safeProviderDetail(value) {
  return String(value || "")
    .replace(/AIza[\w-]{20,}/g, "[redacted-api-key]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]")
    .replace(/([\"']x-goog-api-key[\"']?\s*[:=]\s*[\"'])[^\"']+/gi, "$1[redacted]")
    .slice(0, 700);
}

async function generateGeminiText({
  apiKey,
  model,
  prompt,
  temperature = 0.4,
  maxOutputTokens = 900,
  fetchImpl = globalThis.fetch,
}) {
  const cleanKey = String(apiKey || "").trim();
  const cleanModel = String(model || "").trim();
  if (!cleanKey || !cleanModel) {
    throw Object.assign(new Error("Gemini is not configured"), { code: "AI_NOT_CONFIGURED", status: 503 });
  }
  if (typeof fetchImpl !== "function") {
    throw Object.assign(new Error("Fetch is unavailable"), { code: "AI_PROVIDER_TRANSPORT_ERROR" });
  }

  const response = await fetchImpl(
    `${GEMINI_API_ORIGIN}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": cleanKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    },
  );

  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }

  if (!response.ok) {
    const detail = safeProviderDetail(payload?.error?.message || raw || `Gemini HTTP ${response.status}`);
    throw Object.assign(new Error(detail || `Gemini HTTP ${response.status}`), {
      code: payload?.error?.status || "AI_PROVIDER_ERROR",
      status: response.status,
      providerDetail: detail,
    });
  }

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => typeof part?.text === "string" ? part.text : "")
    .join("")
    .trim();
  return { text, usageMetadata: payload?.usageMetadata || null };
}

module.exports = { GEMINI_API_ORIGIN, generateGeminiText, safeProviderDetail };
