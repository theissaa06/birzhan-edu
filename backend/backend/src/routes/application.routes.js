const router = require("express").Router();
const prisma = require("../config/prisma");

router.post("/", async (req, res) => {
  try {
    const application = await prisma.application.create({ data: req.body });
    res.status(201).json({ success: true, application });
  } catch (e) {
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

module.exports = router;
