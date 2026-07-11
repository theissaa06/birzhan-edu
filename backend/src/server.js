const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./config/prisma");
const authRoutes = require("./routes/auth.routes");
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

const app = express();

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configuredOrigins,
  ]);
}

function isAllowedLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;

    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      return true;
    }

    const isPrivateLanIp =
      /^10\./.test(url.hostname) ||
      /^192\.168\./.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    const isViteDevPort = ["5173", "5174", "4173"].includes(url.port);

    return process.env.NODE_ENV !== "production" && isPrivateLanIp && isViteDevPort;
  } catch (error) {
    return false;
  }
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.has(normalizedOrigin) || isAllowedLocalOrigin(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS rejected origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Некорректный JSON в теле запроса.",
    });
  }

  return next(err);
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      success: true,
      service: "frame-school-backend",
      database: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Health] Database check failed", error);
    return res.status(503).json({
      success: false,
      service: "frame-school-backend",
      database: "error",
      message: "База данных недоступна.",
    });
  }
});

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

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Frame School backend работает.",
    health: "/health",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Маршрут не найден.",
  });
});

app.use((err, req, res, next) => {
  console.error("[Server] Unhandled error", {
    error: err?.stack || err?.message || err,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера.",
  });
});

const PORT = process.env.PORT || 3003;
const PREMIUM_EXPIRY_INTERVAL_MS = Number(
  process.env.PREMIUM_EXPIRY_INTERVAL_MS || 60 * 60 * 1000,
);

async function runPremiumExpiryMaintenance() {
  if (typeof premiumRoutes.expireOverduePremiumAccess !== "function") return;

  try {
    await premiumRoutes.expireOverduePremiumAccess();
  } catch (error) {
    console.error("[Premium] Scheduled expiry check failed", {
      error: error?.stack || error?.message || error,
    });
  }
}

app.listen(PORT, () => {
  console.log(`Frame School backend running on port ${PORT}`);

  runPremiumExpiryMaintenance();

  if (Number.isFinite(PREMIUM_EXPIRY_INTERVAL_MS) && PREMIUM_EXPIRY_INTERVAL_MS > 0) {
    const premiumExpiryTimer = setInterval(
      runPremiumExpiryMaintenance,
      PREMIUM_EXPIRY_INTERVAL_MS,
    );
    premiumExpiryTimer.unref?.();
  }
});
