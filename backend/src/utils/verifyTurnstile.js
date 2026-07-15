const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_TIMEOUT_MS = 5000;

let optionalModeWarningShown = false;

function isEnabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function getTurnstileConfig() {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
  const required = isEnabled(process.env.TURNSTILE_REQUIRED);
  const bypassAllowed =
    isEnabled(process.env.ALLOW_TURNSTILE_BYPASS) ||
    process.env.NODE_ENV !== "production";
  const configuredTimeout = Number(process.env.TURNSTILE_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_TIMEOUT_MS;

  return { secret, required, bypassAllowed, timeoutMs };
}

function disabledResult(config) {
  if (config.required) {
    console.error(
      "[Turnstile] TURNSTILE_REQUIRED=true, but TURNSTILE_SECRET_KEY is missing.",
    );
    return { success: false, reason: "missing-secret" };
  }

  if (!optionalModeWarningShown) {
    console.warn(
      "[Turnstile] Challenge is disabled because TURNSTILE_SECRET_KEY is not configured. Auth rate limits remain active.",
    );
    optionalModeWarningShown = true;
  }

  return { success: true, reason: "disabled-not-configured" };
}

async function verifyTurnstile(token, remoteIp) {
  const config = getTurnstileConfig();

  if (!config.secret) {
    return disabledResult(config);
  }

  const cleanToken = typeof token === "string" ? token.trim() : "";
  const isBypassToken = ["bypass", "bypass-no-key"].includes(cleanToken);

  if (isBypassToken && config.bypassAllowed) {
    console.warn("[Turnstile] Explicit development bypass accepted.");
    return { success: true, reason: "development-bypass" };
  }

  if (!cleanToken || isBypassToken) {
    return {
      success: false,
      reason: isBypassToken ? "bypass-not-allowed" : "missing-token",
    };
  }

  const formData = new URLSearchParams();
  formData.append("secret", config.secret);
  formData.append("response", cleanToken);
  if (remoteIp) formData.append("remoteip", String(remoteIp));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[Turnstile] Verification service returned non-OK status.", {
        status: response.status,
      });
      return { success: false, reason: "verification-service-error" };
    }

    const data = await response.json();
    if (!data.success) {
      console.warn("[Turnstile] Challenge rejected.", {
        errors: data["error-codes"] || [],
      });
      return {
        success: false,
        reason: data["error-codes"] || "turnstile-failed",
      };
    }

    return { success: true, reason: "ok" };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("[Turnstile] Verification request failed.", {
      error: error?.stack || error?.message || error,
      timedOut,
    });
    return {
      success: false,
      reason: timedOut ? "verification-timeout" : "server-error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getTurnstileConfig, verifyTurnstile };
