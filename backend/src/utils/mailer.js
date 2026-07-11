const nodemailer = require("nodemailer");

function requireSmtpConfig() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const missing = required.filter((key) => !process.env[key]);

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
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, code }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Восстановление пароля Frame School",
    text: [
      "Вы запросили восстановление пароля Frame School.",
      "",
      `Ваш код восстановления: ${code}`,
      "",
      "Код действует 15 минут и может быть использован только один раз.",
      "",
      "Если вы не запрашивали восстановление, просто проигнорируйте это письмо.",
    ].join("\n"),
    html: `
      <p>Вы запросили восстановление пароля <strong>Frame School</strong>.</p>
      <p>Введите этот код на странице восстановления:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:18px 0;">${code}</p>
      <p>Код действует 15 минут и может быть использован только один раз.</p>
      <p>Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
