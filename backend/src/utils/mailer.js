const nodemailer = require("nodemailer");

function requireSmtpConfig() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    const error = new Error(`SMTP is not configured: ${missing.join(", ")}`);
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
}

function createTransporter() {
  requireSmtpConfig();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailFrame(content) {
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#0B0D12;color:#F4F7FB;font-family:Arial,sans-serif">
    <div style="padding:32px 16px"><div style="max-width:600px;margin:auto;border:1px solid #283140;background:#121620">
      <div style="padding:20px 24px;border-bottom:1px solid #283140;font-weight:800;letter-spacing:.08em">FRAME <span style="color:#35E6FF">SCHOOL</span></div>
      <div style="padding:28px 24px;line-height:1.65">${content}</div>
      <div style="padding:16px 24px;border-top:1px solid #283140;color:#9AA7B8;font-size:12px">Автоматическое сообщение службы безопасности Frame School.</div>
    </div></div></body></html>`;
}

async function sendPasswordResetEmail({ to, code }) {
  const safeCode = escapeHtml(code);
  return createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Код восстановления пароля Frame School",
    text: `Код восстановления: ${code}\n\nКод действует 15 минут и используется один раз. Если вы не запрашивали восстановление, проигнорируйте письмо.`,
    html: emailFrame(`
      <h1 style="margin:0 0 12px;font-size:24px">Восстановление пароля</h1>
      <p>Введите этот код на странице восстановления:</p>
      <div style="margin:22px 0;padding:18px;border:1px solid #35E6FF;background:#0B0D12;color:#FF4FD8;font:700 32px monospace;letter-spacing:8px;text-align:center">${safeCode}</div>
      <p>Код действует 15 минут и может быть использован только один раз.</p>
      <p style="color:#9AA7B8">Если вы не отправляли запрос, проигнорируйте письмо и никому не сообщайте код.</p>`),
  });
}

async function sendPasswordChangedEmail({ to }) {
  const changedAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "Asia/Almaty",
  }).format(new Date());
  return createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Пароль Frame School изменён",
    text: `Пароль аккаунта изменён ${changedAt}. Все прежние сессии завершены. Если это были не вы, обратитесь в поддержку.`,
    html: emailFrame(`
      <h1 style="margin:0 0 12px;font-size:24px">Пароль изменён</h1>
      <p>Пароль вашего аккаунта успешно обновлён.</p>
      <p style="padding:12px;border-left:3px solid #35E6FF;background:#0B0D12"><strong>Дата и время:</strong> ${escapeHtml(changedAt)}</p>
      <p>Все ранее выданные сессии завершены.</p>
      <p style="color:#FFB05C">Если это были не вы, немедленно обратитесь в поддержку Frame School.</p>`),
  });
}

module.exports = { sendPasswordResetEmail, sendPasswordChangedEmail };
