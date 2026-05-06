const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const coursesRoutes = require("./routes/courses.routes");
const lessonRoutes = require("./routes/lesson.routes");
const lessonsRoutes = require("./routes/lessons.routes");
const userRoutes = require("./routes/users.routes");
const supportRoutes = require("./routes/support.routes");
const bonusRoutes = require("./routes/bonus.routes");
const premiumRoutes = require("./routes/premium.routes");
const reviewRoutes = require("./routes/review.routes");
const mediaRoutes = require("./routes/media.routes");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/lesson", lessonRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/bonus", bonusRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/media", mediaRoutes);

/* AI assistant */
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
