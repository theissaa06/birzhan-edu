const assert = require("node:assert/strict");
const test = require("node:test");

const { verifyTurnstile } = require("../src/utils/verifyTurnstile");

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  TURNSTILE_REQUIRED: process.env.TURNSTILE_REQUIRED,
  ALLOW_TURNSTILE_BYPASS: process.env.ALLOW_TURNSTILE_BYPASS,
};
const originalFetch = global.fetch;

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  global.fetch = originalFetch;
}

test.afterEach(restoreEnv);
test.after(restoreEnv);

test("allows rate-limited auth when Turnstile is not configured", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_REQUIRED = "false";

  const result = await verifyTurnstile(undefined, "127.0.0.1");

  assert.deepEqual(result, {
    success: true,
    reason: "disabled-not-configured",
  });
});

test("fails closed when Turnstile is required without a secret", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_REQUIRED = "true";

  const result = await verifyTurnstile(undefined, "127.0.0.1");

  assert.deepEqual(result, {
    success: false,
    reason: "missing-secret",
  });
});

test("rejects bypass tokens in production when a secret is configured", async () => {
  process.env.NODE_ENV = "production";
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.ALLOW_TURNSTILE_BYPASS = "false";

  const result = await verifyTurnstile("bypass-no-key", "127.0.0.1");

  assert.deepEqual(result, {
    success: false,
    reason: "bypass-not-allowed",
  });
});

test("accepts a token verified by Cloudflare", async () => {
  process.env.NODE_ENV = "production";
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true }),
  });

  const result = await verifyTurnstile("valid-token", "127.0.0.1");

  assert.deepEqual(result, { success: true, reason: "ok" });
});
