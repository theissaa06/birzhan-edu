const prisma = require('../src/config/prisma');
const fs = require('fs');
const path = require('path');

(async function main() {
  try {
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(__dirname, '..', 'backups');
    await fs.promises.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `prisma-backup-${now}.json`);

    const data = {};
    data.courses = await prisma.course.findMany({ include: { lessons: true } });
    data.lessons = await prisma.lesson.findMany();
    data.lessonProgress = await prisma.lessonProgress.findMany();
    data.users = await prisma.user.findMany();
    data.bonuses = await prisma.bonus.findMany();
    data.userBonuses = await prisma.userBonus.findMany();
    data.reviews = await prisma.review.findMany();
    data.mediaArticles = await prisma.mediaArticle.findMany();
    data.supportMessages = await prisma.supportMessage.findMany();
    data.applications = await prisma.application.findMany();

    await fs.promises.writeFile(outFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('BACKUP_SAVED:', outFile);
  } catch (e) {
    console.error('BACKUP_ERROR:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
