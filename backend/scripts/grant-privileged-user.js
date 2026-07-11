require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALLOWED_BADGES = new Set(["ADMIN", "OWNER", "DEVELOPER"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeBadges(value) {
  return String(value || "ADMIN")
    .split(",")
    .map((badge) => badge.trim().toUpperCase())
    .filter((badge) => ALLOWED_BADGES.has(badge));
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_GRANT_EMAIL);
  const username = String(process.env.ADMIN_GRANT_USERNAME || "Frame School Admin").trim();
  const password = String(process.env.ADMIN_GRANT_PASSWORD || "");
  const badges = normalizeBadges(process.env.ADMIN_GRANT_BADGES);

  if (!email) {
    throw new Error("Set ADMIN_GRANT_EMAIL before running this script.");
  }

  if (badges.length === 0) {
    throw new Error("ADMIN_GRANT_BADGES must include ADMIN, OWNER, or DEVELOPER.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const data = {
    username,
    role: "ADMIN",
    badges,
    blockedAt: null,
    blockedUntil: null,
    blockedReason: null,
    blockedById: null,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
    data.sessionVersion = { increment: 1 };
  }

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data,
        select: { id: true, email: true, role: true, badges: true },
      })
    : await prisma.user.create({
        data: {
          ...data,
          email,
          password: await bcrypt.hash(password || crypto.randomUUID(), 10),
        },
        select: { id: true, email: true, role: true, badges: true },
      });

  console.log("Privileged user is ready:");
  console.log(JSON.stringify(user, null, 2));
  if (!password && !existing) {
    console.log("A random password was generated. Set ADMIN_GRANT_PASSWORD to create a usable login password.");
  }
}

main()
  .catch((error) => {
    console.error("[admin:grant] Failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
