const prisma = require("../src/config/prisma");

async function main() {
  await prisma.lessonProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();

  const capcut = await prisma.course.create({
    data: {
      title: "CapCut с нуля до PRO",
      category: "capcut",
      level: "С нуля",
      duration: "6 часов",
      description:
        "Научитесь монтировать видео в CapCut: нарезка, музыка, переходы, текст, эффекты, экспорт для TikTok и Reels.",
      isPublished: true,
      lessons: {
        create: [
          {
            title: "Знакомство с CapCut",
            content:
              "Что такое CapCut, как создать проект и импортировать видео.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 1,
            type: "VIDEO",
          },
          {
            title: "Нарезка и монтаж под музыку",
            content:
              "Учимся резать видео, ставить кадры под бит и делать динамичный монтаж.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 2,
            type: "PRACTICE",
          },
        ],
      },
    },
  });

  const premiere = await prisma.course.create({
    data: {
      title: "Premiere Pro для начинающих",
      category: "premiere-pro",
      level: "С нуля",
      duration: "10 часов",
      description:
        "Профессиональный монтаж в Premiere Pro: таймлайн, инструменты, звук, цветокоррекция и экспорт готового видео.",
      isPublished: true,
      lessons: {
        create: [
          {
            title: "Интерфейс Premiere Pro",
            content:
              "Разбираем рабочие панели, таймлайн, импорт файлов и создание проекта.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 1,
            type: "VIDEO",
          },
          {
            title: "Первый монтаж в Premiere Pro",
            content:
              "Собираем короткий ролик: нарезка, музыка, титры и экспорт.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 2,
            type: "PRACTICE",
          },
        ],
      },
    },
  });

  const tiktok = await prisma.course.create({
    data: {
      title: "TikTok Edit: монтаж коротких видео",
      category: "tiktok",
      level: "Новичок",
      duration: "4 часа",
      description:
        "Создание коротких динамичных роликов: тренды, beat sync, shake, zoom, flash-переходы и экспорт.",
      isPublished: true,
      lessons: {
        create: [
          {
            title: "Как устроен TikTok-эдит",
            content:
              "Разбираем структуру короткого видео: хук, ритм, переходы, финал.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 1,
            type: "VIDEO",
          },
          {
            title: "Практика: монтаж под бит",
            content: "Соберите 15-секундный ролик с нарезкой под музыку.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            orderNumber: 2,
            type: "PRACTICE",
          },
        ],
      },
    },
  });

  console.log("Курсы добавлены:", capcut.title, premiere.title, tiktok.title);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
