const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.course.updateMany({
    where: {
      id: {
        in: [5, 8, 9],
      },
    },
    data: {
      isPremium: true,
    },
  });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      isPremium: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log("Premium courses updated:");
  console.table(courses);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
