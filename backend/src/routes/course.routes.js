const router = require("express").Router();
const prisma = require("../config/prisma");

router.get("/", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        id: "asc",
      },
      include: {
        lessons: {
          orderBy: {
            orderNumber: "asc",
          },
        },
      },
    });

    res.json({
      success: true,
      data: courses,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки курсов",
      error: e.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: {
            orderNumber: "asc",
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки курса",
      error: e.message,
    });
  }
});

module.exports = router;
