const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const coursesRoutes = require("./routes/courses.routes");
const lessonsRoutes = require("./routes/lessons.routes");
const usersRoutes = require("./routes/users.routes");
const supportRoutes = require("./routes/support.routes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Birzhan-Edu backend работает",
  });
});

// 🔥 ВСЕ ROUTES ТОЛЬКО ПОСЛЕ CORS
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/support", supportRoutes);

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});
