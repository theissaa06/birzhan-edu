// backend/src/utils/verifyTurnstile.js

const BYPASS_TOKENS = ["bypass", "bypass-no-key", "dev-bypass"];

function isDevBypassAllowed() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_TURNSTILE_BYPASS === "true"
  );
}

async function verifyTurnstile(token, remoteIp) {
  try {
    // Если нет секретного ключа — пропускаем (dev режим)
    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.warn("[Turnstile] TURNSTILE_SECRET_KEY не найден — пропускаем проверку (dev режим)");
      return { success: true, reason: "no-secret-dev-bypass" };
    }

    if (!token || typeof token !== "string") {
      return { success: false, reason: "missing-token" };
    }

    // Bypass токены для разработки
    if (BYPASS_TOKENS.includes(token)) {
      if (!isDevBypassAllowed()) {
        return { success: false, reason: "bypass-disabled" };
      }

      console.warn("[Turnstile] Bypass токен — пропускаем проверку (dev режим)");
      return { success: true, reason: "bypass" };
    }

    const formData = new URLSearchParams();
    formData.append("secret", process.env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!data.success) {
      console.warn("[Turnstile] Проверка не пройдена:", data["error-codes"]);
      return { success: false, reason: data["error-codes"] || "turnstile-failed" };
    }

    return { success: true, reason: "ok" };
  } catch (error) {
    console.error("[Turnstile] Ошибка проверки:", error.message);
    // В dev не блокируем работу формы из-за сетевых ошибок Cloudflare.
    if (isDevBypassAllowed()) {
      return { success: true, reason: "network-error-bypass" };
    }

    return { success: false, reason: "turnstile-network-error" };
  }
}

module.exports = { verifyTurnstile };
