const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

// Auth
app.use("/api/auth", authRoutes);

// Courses + lessons (единый маршрут)
app.use("/api/courses", coursesRoutes);

// Lesson actions (start/complete/CRUD)
app.use("/api/lessons", lessonRoutes);

// Users (защищённый)
app.use("/api/users", userRoutes);

// Support
app.use("/api/support", supportRoutes);

// Bonus
app.use("/api/bonus", bonusRoutes);

// Premium
app.use("/api/premium", premiumRoutes);

// Reviews
app.use("/api/reviews", reviewRoutes);

// Media
app.use("/api/media", mediaRoutes);

// Applications
app.use("/api/applications", applicationRoutes);

// Admin panel
app.use("/api/admin", adminRoutes);

// AI assistant
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Birzhan-Edu backend работает",
  });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
