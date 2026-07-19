const assert = require("node:assert/strict");
const test = require("node:test");
const { generateWithRetry, retryableProviderError } = require("../src/services/gemini-chat.service");

test("Gemini chat retries one transient provider failure and then returns the real response", async () => {
  let calls = 0;
  const retries = [];
  const sleeps = [];
  const result = await generateWithRetry({
    timeoutMs: 5000,
    maxRetries: 1,
    generate: async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error("temporary upstream error"), { status: 503 });
      return { text: "stable answer" };
    },
    onRetry: (event) => retries.push(event),
    sleep: async (delay) => sleeps.push(delay),
  });

  assert.equal(calls, 2);
  assert.equal(result.attempts, 2);
  assert.equal(result.response.text, "stable answer");
  assert.deepEqual(sleeps, [400]);
  assert.equal(retries[0].status, 503);
});

test("Gemini chat never retries invalid credentials and exposes no prompt data in retry metadata", async () => {
  let calls = 0;
  await assert.rejects(
    generateWithRetry({
      timeoutMs: 5000,
      maxRetries: 2,
      generate: async () => {
        calls += 1;
        throw Object.assign(new Error("invalid api key"), { status: 401 });
      },
      sleep: async () => assert.fail("non-retryable authentication error must not sleep"),
    }),
    (error) => error.providerStatus === 401 && error.attempts === 1,
  );
  assert.equal(calls, 1);
});

test("Gemini retry classification is limited to temporary network, quota, and upstream failures", () => {
  assert.equal(retryableProviderError({ status: 429 }), true);
  assert.equal(retryableProviderError({ status: 500 }), true);
  assert.equal(retryableProviderError({ code: "ETIMEDOUT" }), true);
  assert.equal(retryableProviderError({ status: 400 }), false);
  assert.equal(retryableProviderError({ status: 403 }), false);
});
