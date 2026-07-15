const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

const DEFAULT_COURSES = [
  {
    title: "CapCut с нуля до PRO",
    category: "capcut",
    level: "С нуля",
    duration: "6 часов",
    description:
      "Научитесь монтировать видео в CapCut: нарезка, музыка, переходы, текст, эффекты и экспорт для TikTok и Reels.",
    isPublished: true,
    lessons: {
      create: [
        {
          title: "Знакомство с CapCut",
          content: "Что такое CapCut, как создать проект и импортировать видео.",
          orderNumber: 1,
          type: "TEXT",
        },
        {
          title: "Нарезка и монтаж под музыку",
          content:
            "Учимся резать видео, ставить кадры под бит и делать динамичный монтаж.",
          taskText: "Соберите короткий ролик из 5–7 кадров и синхронизируйте склейки с музыкой.",
          orderNumber: 2,
          type: "PRACTICE",
        },
      ],
    },
  },
  {
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
          orderNumber: 1,
          type: "TEXT",
        },
        {
          title: "Первый монтаж в Premiere Pro",
          content:
            "Собираем короткий ролик: нарезка, музыка, титры и экспорт.",
          taskText: "Смонтируйте ролик до 30 секунд и экспортируйте его в H.264.",
          orderNumber: 2,
          type: "PRACTICE",
        },
      ],
    },
  },
  {
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
            "Разбираем структуру короткого видео: хук, ритм, переходы и финал.",
          orderNumber: 1,
          type: "TEXT",
        },
        {
          title: "Практика: монтаж под бит",
          content: "Соберите 15-секундный ролик с нарезкой под музыку.",
          taskText: "Добавьте хук в первые две секунды и не менее пяти точных склеек под бит.",
          orderNumber: 2,
          type: "PRACTICE",
        },
      ],
    },
  },
];

const ALLOWED_ADMIN_BADGES = new Set(["ADMIN", "OWNER", "DEVELOPER"]);

function getAdminConfig() {
  const email = String(process.env.ADMIN_GRANT_EMAIL || "").trim().toLowerCase();
  if (!email) return null;

  const badges = String(process.env.ADMIN_GRANT_BADGES || "ADMIN")
    .split(",")
    .map((badge) => badge.trim().toUpperCase())
    .filter((badge) => ALLOWED_ADMIN_BADGES.has(badge));

  return {
    email,
    username: String(
      process.env.ADMIN_GRANT_USERNAME || "Frame School Admin",
    ).trim(),
    password: String(process.env.ADMIN_GRANT_PASSWORD || ""),
    badges: badges.length > 0 ? badges : ["ADMIN"],
  };
}

async function ensureDefaultCourses(tx) {
  const created = [];
  const skipped = [];

  for (const courseData of DEFAULT_COURSES) {
    const existing = await tx.course.findFirst({
      where: {
        title: courseData.title,
        category: courseData.category,
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push(courseData.title);
      continue;
    }

    const course = await tx.course.create({ data: courseData });
    created.push(course.title);
  }

  return { created, skipped };
}

async function ensureAdmin(tx, config) {
  if (!config) return { status: "not-configured" };

  const existing = await tx.user.findUnique({
    where: { email: config.email },
    select: { id: true, badges: true },
  });

  if (existing) {
    const badges = Array.from(
      new Set([...(existing.badges || []), ...config.badges]),
    );

    await tx.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        badges,
        blockedAt: null,
        blockedUntil: null,
        blockedReason: null,
        blockedById: null,
      },
    });

    return { status: "updated", email: config.email };
  }

  if (config.password.length < 12) {
    return { status: "missing-strong-password", email: config.email };
  }

  const password = await bcrypt.hash(config.password, 12);
  await tx.user.create({
    data: {
      username: config.username || "Frame School Admin",
      email: config.email,
      password,
      role: "ADMIN",
      badges: config.badges,
    },
  });

  return { status: "created", email: config.email };
}

async function main() {
  const adminConfig = getAdminConfig();

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(728347120260711)`;
    const courses = await ensureDefaultCourses(tx);
    const admin = await ensureAdmin(tx, adminConfig);
    return { courses, admin };
  });

  console.log("[Seed] Default course bootstrap complete", {
    created: result.courses.created.length,
    skipped: result.courses.skipped.length,
  });
  console.log("[Seed] Admin bootstrap", result.admin.status);

  if (result.admin.status === "missing-strong-password") {
    console.warn(
      "[Seed] ADMIN_GRANT_PASSWORD must contain at least 12 characters to create the initial admin.",
    );
  }
}

main()
  .catch((error) => {
    console.error("[Seed] Production bootstrap failed", error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error("[Seed] Prisma disconnect failed", error?.stack || error);
      process.exitCode = 1;
    }
  });
