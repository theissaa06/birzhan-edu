const prisma = require("../config/prisma");
const { runPremiumMaintenance } = require("./premium.service");
const { runPendingAutoReviews } = require("./video-review.service");

async function expireBans(now = new Date()) {
  const expired = await prisma.userBan.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    select: { id: true, userId: true },
  });
  if (!expired.length) return { expired: 0 };
  await prisma.$transaction(async (tx) => {
    await tx.userBan.updateMany({ where: { id: { in: expired.map((ban) => ban.id) } }, data: { status: "EXPIRED" } });
    for (const userId of [...new Set(expired.map((ban) => ban.userId))]) {
      const active = await tx.userBan.findFirst({ where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] } });
      if (!active) await tx.user.update({ where: { id: userId }, data: { blockedAt: null, blockedUntil: null, blockedReason: null, blockedById: null } });
    }
  });
  return { expired: expired.length };
}

async function runMaintenance() {
  const [premium, bans, autoReviews] = await Promise.all([
    runPremiumMaintenance(prisma),
    expireBans(),
    runPendingAutoReviews(prisma),
  ]);
  return { premium, bans, autoReviews };
}

module.exports = { expireBans, runMaintenance };
