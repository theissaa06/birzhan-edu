const prisma = require("../src/config/prisma");

function normalizeLessonPayload(lesson) {
  return {
    ...lesson,
    whatYouLearn: Array.isArray(lesson.whatYouLearn)
      ? JSON.stringify(lesson.whatYouLearn)
      : lesson.whatYouLearn,
    steps: Array.isArray(lesson.steps) ? JSON.stringify(lesson.steps) : lesson.steps,
    hints: Array.isArray(lesson.hints) ? JSON.stringify(lesson.hints) : lesson.hints,
  };
}

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
            title: "Интерфейс CapCut",
            content: "Что такое CapCut, как создать проект и импортировать видео.",
            description: "В этом уроке ты разберёшься, где находятся основные кнопки, таймлайн, импорт и экспорт.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            whatYouLearn: [
              "как создать новый проект",
              "где находится таймлайн",
              "как добавить видео",
              "где искать текст, музыку и эффекты",
              "как подготовиться к первому монтажу",
            ],
            steps: [
              "Посмотри видео полностью без спешки.",
              "Открой CapCut на телефоне или ПК.",
              "Нажми создание нового проекта.",
              "Добавь любое короткое видео.",
              "Найди таймлайн и основные инструменты.",
              "Повтори действия из урока и нажми кнопку завершения.",
            ],
            taskText: "Создай новый проект в CapCut, добавь одно видео и найди таймлайн, текст, музыку и эффекты.",
            beginnerHelp: "Если ты впервые открыл CapCut, не пытайся сразу сделать сложный ролик. Сначала просто создай проект, добавь видео и пойми, где находятся основные инструменты.",
            hints: [
              "Если не получается добавить видео, проверь доступ CapCut к галерее.",
              "Если не видишь таймлайн, нажми на добавленный клип внизу экрана.",
              "Если запутался, пересмотри первые 30 секунд урока ещё раз.",
            ],
            orderNumber: 1,
            type: "VIDEO",
          },
          {
            title: "Нарезка видео под музыку",
            content: "Учимся резать видео, ставить кадры под бит и делать динамичный монтаж.",
            description: "Ты научишься удалять лишние фрагменты и собирать короткий ролик под ритм музыки.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            whatYouLearn: [
              "как разрезать клип",
              "как удалить лишний фрагмент",
              "как двигать куски видео на таймлайне",
              "как подстроить монтаж под музыку",
            ],
            steps: [
              "Посмотри пример в видео.",
              "Добавь видео и музыку в проект.",
              "Найди моменты, где меняется бит.",
              "Разрежь видео на 3–5 частей.",
              "Удали лишнее и сохрани короткий результат.",
            ],
            taskText: "Собери ролик на 10–15 секунд: добавь музыку, сделай 3–5 склеек и удали лишние моменты.",
            beginnerHelp: "Не переживай, если с первого раза монтаж не попадает в бит. Главное — понять, где находится кнопка разделения и как двигать фрагменты.",
            hints: [
              "Сначала делай крупные разрезы, потом исправляй мелкие моменты.",
              "Слушай музыку и режь видео рядом с ударом бита.",
              "Если ролик кажется резким, попробуй укоротить или удлинить один фрагмент.",
            ],
            orderNumber: 2,
            type: "PRACTICE",
          },
        ].map(normalizeLessonPayload),
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
        ].map(normalizeLessonPayload),
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
        ].map(normalizeLessonPayload),
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
