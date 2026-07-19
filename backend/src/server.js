const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const prisma = require("./config/prisma");
const authRoutes = require("./routes/auth.routes");
const oauthRoutes = require("./routes/oauth.routes");
const coursesRoutes = require("./routes/courses.routes");
const lessonRoutes = require("./routes/lesson.routes");
const userRoutes = require("./routes/users.routes");
const supportRoutes = require("./routes/support.routes");
const bonusRoutes = require("./routes/bonus.routes");
const premiumRoutes = require("./routes/premium.routes");
const reviewRoutes = require("./routes/review.routes");
const mediaRoutes = require("./routes/media.routes");
const applicationRoutes = require("./routes/application.routes");
const adminRoutes = require("./routes/admin.routes");
const aiRoutes = require("./routes/ai");
const submissionsRoutes = require("./routes/submissions.routes");
const certificateRoutes = require("./routes/certificate.routes");
const notificationRoutes = require("./routes/notification.routes");
const announcementRoutes = require("./routes/announcement.routes");
const webinarRoutes = require("./routes/webinar.routes");
const jobRoutes = require("./routes/job.routes");
const publicRoutes = require("./routes/public.routes");
const { runMaintenance } = require("./services/maintenance.service");
const { runPendingAutoReviews } = require("./services/video-review.service");
const { syncAdminConfig } = require("./services/admin-config.service");

const app = express();

function getTrustProxyValue() {
  const value = String(process.env.TRUST_PROXY || "").trim();
  if (!value) return process.env.NODE_ENV === "production" ? 1 : false;
  if (value === "true") return 1;
  if (value === "false") return false;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? false : numeric;
}

app.set("trust proxy", getTrustProxyValue());
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...[process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
]);

function localDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    return process.env.NODE_ENV !== "production" && url.protocol === "http:" && local && ["5173", "5174", "4173"].includes(url.port);
  } catch { return false; }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    return allowedOrigins.has(normalized) || localDevelopmentOrigin(normalized)
      ? callback(null, true)
      : callback(Object.assign(new Error("Origin is not allowed"), { code: "CORS_REJECTED" }));
  },
  credentials: true,
}));

function captureRawBody(req, res, buffer) {
  req.rawBody = Buffer.from(buffer);
}

app.use(express.json({ limit: "1mb", verify: captureRawBody }));
app.use(express.urlencoded({ limit: "1mb", extended: true, verify: captureRawBody }));

app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    if (elapsedMs > 2000) console.warn("[Performance] Slow request", { method: req.method, path: req.originalUrl, elapsedMs: Math.round(elapsedMs), status: res.statusCode });
  });
  next();
});

async function health(req, res) {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ success: true, service: "frame-school-backend", status: "ok", database: "ok", databaseLatencyMs: Date.now() - startedAt, uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[Health] Database check failed", error?.stack || error);
    return res.status(503).json({ success: false, code: "DATABASE_UNAVAILABLE", service: "frame-school-backend", status: "error", database: "error", message: "Database is unavailable." });
  }
}

app.get(["/health", "/ready", "/api/health", "/api/ready"], health);
app.use("/api/auth/oauth", oauthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/users", userRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/bonus", bonusRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/webinars", webinarRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/public", publicRoutes);

app.get("/", (req, res) => res.json({ success: true, message: "Frame School backend is running.", health: "/api/health" }));
app.use((req, res) => res.status(404).json({ success: false, code: "ROUTE_NOT_FOUND", message: "Route not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ success: false, code: "JSON_INVALID", message: "Invalid JSON in request body." });
  console.error("[Server] Unhandled error", { error: error?.stack || error, path: req.originalUrl, method: req.method });
  return res.status(error?.code === "CORS_REJECTED" ? 403 : 500).json({ success: false, code: error?.code || "INTERNAL_ERROR", message: error?.code === "CORS_REJECTED" ? "Origin is not allowed." : "Internal server error." });
});

function startKeepAlivePings() {
  const backend = process.env.PUBLIC_BACKEND_URL ? `${process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}/health` : "";
  const urls = [...new Set([backend, process.env.KEEP_ALIVE_URLS].filter(Boolean).flatMap((value) => String(value).split(",")).map((url) => url.trim()).filter(Boolean))];
  const intervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS || 5 * 60 * 1000);
  if (!urls.length || !Number.isFinite(intervalMs) || intervalMs <= 0) return;
  const ping = () => Promise.allSettled(urls.map((url) => fetch(url).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); }).catch((error) => console.warn("[KeepAlive] Ping failed", { url, message: error.message }))));
  const timer = setInterval(ping, intervalMs);
  timer.unref?.();
  ping();
}

async function runScheduledMaintenance() {
  try { await runMaintenance(); } catch (error) { console.error("[Maintenance] Failed", error?.stack || error); }
}

async function pollAutoReviews() {
  try { await runPendingAutoReviews(prisma); } catch (error) { console.error("[VideoReview] Poll failed", error?.stack || error); }
}

function startServer() {
  const port = Number(process.env.PORT || 3003);
  return app.listen(port, () => {
    console.log(`Frame School backend running on port ${port}`);
    syncAdminConfig().catch((error) => console.error("[AdminConfig] Sync failed", error?.stack || error));
    runScheduledMaintenance();
    const autoReviewIntervalMs = Number(process.env.AUTO_REVIEW_POLL_INTERVAL_MS || 30000);
    if (Number.isFinite(autoReviewIntervalMs) && autoReviewIntervalMs > 0) {
      const autoReviewTimer = setInterval(pollAutoReviews, autoReviewIntervalMs);
      autoReviewTimer.unref?.();
    }
    startKeepAlivePings();
    const intervalMs = Number(process.env.MAINTENANCE_INTERVAL_MS || 60 * 60 * 1000);
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      const timer = setInterval(runScheduledMaintenance, intervalMs);
      timer.unref?.();
    }
  });
}

if (require.main === module) startServer();

module.exports = { app, startServer };
