// backend/src/utils/verifyTurnstile.js

async function verifyTurnstile(token, remoteIp) {
  try {
    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error(
        "[Turnstile] TURNSTILE_SECRET_KEY не найден в backend/.env",
      );

      return {
        success: false,
        reason: "missing-secret",
      };
    }

    if (!token || typeof token !== "string") {
      return {
        success: false,
        reason: "missing-token",
      };
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

      return {
        success: false,
        reason: data["error-codes"] || "turnstile-failed",
      };
    }

    return {
      success: true,
      reason: "ok",
    };
  } catch (error) {
    console.error("[Turnstile] Ошибка проверки:", error.message);

    return {
      success: false,
      reason: "server-error",
    };
  }
}

module.exports = { verifyTurnstile };
