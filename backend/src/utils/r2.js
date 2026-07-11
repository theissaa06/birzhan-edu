const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

function getMaxUploadBytes() {
  const mb = Number(process.env.MAX_VIDEO_UPLOAD_MB || 300);
  return Math.max(1, Math.min(mb, 2048)) * 1024 * 1024;
}

function requireR2Config() {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const error = new Error(`R2 is not configured: ${missing.join(", ")}`);
    error.code = "R2_NOT_CONFIGURED";
    throw error;
  }
}

function createR2Client() {
  requireR2Config();

  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function safeExtension(fileName = "") {
  const ext = path.extname(String(fileName)).toLowerCase();
  return ext && ext.length <= 12 ? ext : ".mp4";
}

async function createVideoUploadUrl({ userId, lessonId, fileName, contentType, size }) {
  requireR2Config();

  if (!VIDEO_TYPES.has(contentType)) {
    return {
      ok: false,
      status: 400,
      message: "Поддерживаются только видеофайлы MP4, MOV, WEBM или MKV.",
    };
  }

  if (!Number.isFinite(size) || size <= 0 || size > getMaxUploadBytes()) {
    return {
      ok: false,
      status: 400,
      message: `Файл должен быть не больше ${process.env.MAX_VIDEO_UPLOAD_MB || 300} МБ.`,
    };
  }

  const key = [
    "submissions",
    `user-${userId}`,
    `lesson-${lessonId}`,
    `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExtension(fileName)}`,
  ].join("/");

  const client = createR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 10 * 60 });
  const publicBase = process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");

  return {
    ok: true,
    key,
    uploadUrl,
    publicUrl: `${publicBase}/${key}`,
    expiresIn: 600,
  };
}

module.exports = { createVideoUploadUrl };
