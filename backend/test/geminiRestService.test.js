const assert = require("node:assert/strict");
const test = require("node:test");
const { generateGeminiText, safeProviderDetail } = require("../src/services/gemini-rest.service");

test("Gemini REST client sends a real generateContent request and extracts text", async () => {
  let captured = null;
  const result = await generateGeminiText({
    apiKey: "safe-test-key",
    model: "gemini-3.5-flash",
    prompt: "Тестовый запрос",
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Первый " }, { text: "ответ" }] } }], usageMetadata: { totalTokenCount: 12 } }), { status: 200 });
    },
  });

  assert.match(captured.url, /gemini-3\.5-flash:generateContent$/);
  assert.equal(captured.options.headers["x-goog-api-key"], "safe-test-key");
  assert.equal(captured.url.includes("safe-test-key"), false);
  assert.equal(captured.body.contents[0].parts[0].text, "Тестовый запрос");
  assert.equal(result.text, "Первый ответ");
});

test("Gemini REST client surfaces provider status while redacting API keys", async () => {
  await assert.rejects(
    generateGeminiText({
      apiKey: "safe-test-key",
      model: "gemini-3.5-flash",
      prompt: "Тест",
      fetchImpl: async () => new Response(JSON.stringify({ error: { status: "INVALID_ARGUMENT", message: "Bad key=AIzaExampleSecretValue123456789012345 and request" } }), { status: 400 }),
    }),
    (error) => error.status === 400 && error.code === "INVALID_ARGUMENT" && !error.message.includes("AIzaExampleSecretValue"),
  );
  assert.equal(safeProviderDetail("?key=secret-value"), "?key=[redacted]");
});
