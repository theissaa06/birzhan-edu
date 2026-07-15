const nodemailer = require("nodemailer");

function requireSmtpConfig() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());

  if (missing.length > 0) {
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
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function emailFrame(content) {
  return `
    <div style="margin:0;padding:28px;background:#0b0e0d;color:#d6ddda;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #31413b;border-radius:8px;background:#111614;overflow:hidden;">
        <div style="padding:18px 22px;border-bottom:1px solid #31413b;color:#ffd17b;font-size:20px;font-weight:800;">
          Frame <span style="color:#5eead4;">School</span>
        </div>
        <div style="padding:24px 22px;line-height:1.65;">${content}</div>
        <div style="padding:14px 22px;border-top:1px solid #27332f;color:#7f8d88;font-size:12px;">
          Это автоматическое сообщение службы безопасности Frame School.
        </div>
      </div>
    </div>
  `;
}

async function sendPasswordResetEmail({ to, code }) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Код восстановления пароля Frame School",
    text: [
      "Вы запросили восстановление пароля Frame School.",
      "",
      `Ваш код восстановления: ${code}`,
      "",
      "Код действует 15 минут и может быть использован только один раз.",
      "Если вы не отправляли запрос, проигнорируйте письмо и не сообщайте код другим людям.",
    ].join("\n"),
    html: emailFrame(`
      <h1 style="margin:0 0 12px;color:#f7f7f2;font-size:24px;">Восстановление пароля</h1>
      <p>Введите этот код на странице восстановления:</p>
      <div style="margin:20px 0;padding:16px;border:1px solid #5eead4;border-radius:7px;color:#ffd17b;background:#0b0e0d;font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;">${code}</div>
      <p>Код действует 15 минут и может быть использован только один раз.</p>
      <p style="color:#93a19c;">Если вы не отправляли запрос, просто проигнорируйте письмо и никому не сообщайте код.</p>
    `),
  });
}

async function sendPasswordChangedEmail({ to }) {
  const transporter = createTransporter();
  const changedAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "Asia/Almaty",
  }).format(new Date());

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Пароль Frame School изменён",
    text: [
      "Пароль вашего аккаунта Frame School был успешно изменён.",
      `Дата и время: ${changedAt}`,
      "Все ранее выданные сессии завершены.",
      "",
      "Если это были не вы, немедленно обратитесь в поддержку Frame School.",
    ].join("\n"),
    html: emailFrame(`
      <h1 style="margin:0 0 12px;color:#f7f7f2;font-size:24px;">Пароль изменён</h1>
      <p>Пароль вашего аккаунта был успешно изменён.</p>
      <p style="padding:12px;border-left:3px solid #5eead4;background:#0b0e0d;"><strong>Дата и время:</strong> ${changedAt}</p>
      <p>Все ранее выданные сессии завершены.</p>
      <p style="color:#ffac99;">Если это были не вы, немедленно обратитесь в поддержку Frame School.</p>
    `),
  });
}

module.exports = { sendPasswordResetEmail, sendPasswordChangedEmail };
