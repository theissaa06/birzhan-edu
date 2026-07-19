function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}

function providerStatus(error) {
  return Number(error?.status || error?.statusCode || error?.response?.status || 0) || null;
}

function retryableProviderError(error) {
  const status = providerStatus(error);
  if (status === 429 || (status && status >= 500)) return true;
  if (["AI_TIMEOUT", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"].includes(error?.code || error?.message)) return true;
  return ["AbortError", "FetchError"].includes(error?.name);
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(Object.assign(new Error("AI_TIMEOUT"), { code: "AI_TIMEOUT" })), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function generateWithRetry({ generate, timeoutMs, maxRetries, onRetry, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const safeTimeout = clampInteger(timeoutMs, 18000, 5000, 60000);
  const safeRetries = clampInteger(maxRetries, 1, 0, 2);
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= safeRetries; attempt += 1) {
    try {
      const response = await withTimeout(Promise.resolve().then(() => generate(attempt + 1)), safeTimeout);
      return { response, attempts: attempt + 1, durationMs: Date.now() - startedAt };
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
      error.attempts = attempt + 1;
      error.providerStatus = providerStatus(error);
      const canRetry = attempt < safeRetries && retryableProviderError(error);
      if (!canRetry) throw error;
      const delayMs = 400 * (2 ** attempt);
      onRetry?.({ attempt: attempt + 1, delayMs, status: error.providerStatus, code: error.code || error.name || "AI_PROVIDER_ERROR" });
      await sleep(delayMs);
    }
  }
  throw new Error("AI_PROVIDER_ERROR");
}

module.exports = {
  clampInteger,
  generateWithRetry,
  providerStatus,
  retryableProviderError,
  withTimeout,
};
