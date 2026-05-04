const router = require("express").Router();
const prisma = require("../config/prisma");

router.get("/", async (req, res) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;

    const lessons = await prisma.lesson.findMany({
      where: courseId ? { courseId } : {},
      orderBy: {
        orderNumber: "asc",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: lessons,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки уроков",
      error: e.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока",
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    res.json({
      success: true,
      data: lesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка загрузки урока",
      error: e.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, content, videoUrl, orderNumber, type, courseId } = req.body;

    if (!title || !orderNumber || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Заполните название, номер урока и курс",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: Number(courseId),
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Курс не найден",
      });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        content: content || null,
        videoUrl: videoUrl || null,
        orderNumber: Number(orderNumber),
        type: type || "VIDEO",
        courseId: Number(courseId),
      },
    });

    res.status(201).json({
      success: true,
      message: "Урок успешно создан",
      data: lesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка создания урока",
      error: e.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока",
      });
    }

    const { title, content, videoUrl, orderNumber, type, courseId } = req.body;

    if (!title || !orderNumber || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Заполните название, номер урока и курс",
      });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        title,
        content: content || null,
        videoUrl: videoUrl || null,
        orderNumber: Number(orderNumber),
        type: type || "VIDEO",
        courseId: Number(courseId),
      },
    });

    res.json({
      success: true,
      message: "Урок успешно обновлён",
      data: updatedLesson,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка обновления урока",
      error: e.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Некорректный ID урока",
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Урок не найден",
      });
    }

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Урок успешно удалён",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Ошибка удаления урока",
      error: e.message,
    });
  }
});

module.exports = router;
