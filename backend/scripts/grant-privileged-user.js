require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ALLOWED = new Set(["ADMIN", "DEVELOPER", "OWNER"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRoles(value) {
  return [...new Set(String(value || "ADMIN").split(",").map((role) => role.trim().toUpperCase()).filter((role) => ALLOWED.has(role)))];
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_GRANT_EMAIL);
  const roles = normalizeRoles(process.env.ADMIN_GRANT_ROLES || process.env.ADMIN_GRANT_BADGES);
  const confirmation = String(process.env.ADMIN_GRANT_CONFIRM || "");
  const expectedConfirmation = `GRANT:${email}:${roles.join("+")}`;
  if (!email || !roles.length) throw new Error("Set ADMIN_GRANT_EMAIL and ADMIN_GRANT_ROLES.");
  if (confirmation !== expectedConfirmation) throw new Error(`Set ADMIN_GRANT_CONFIRM exactly to ${expectedConfirmation}`);

  let user = await prisma.user.findUnique({ where: { email }, include: { roles: true } });
  if (!user) {
    if (process.env.ADMIN_GRANT_CREATE !== "true") throw new Error("User does not exist. Register normally first, or explicitly set ADMIN_GRANT_CREATE=true with a strong password.");
    const password = String(process.env.ADMIN_GRANT_PASSWORD || "");
    if (password.length < 12) throw new Error("ADMIN_GRANT_PASSWORD must contain at least 12 characters when creating a user.");
    user = await prisma.user.create({
      data: { username: String(process.env.ADMIN_GRANT_USERNAME || "Frame School Owner").trim(), email, password: await bcrypt.hash(password, 12) },
      include: { roles: true },
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const role of roles) {
      await tx.userRole.upsert({ where: { userId_role: { userId: user.id, role } }, update: {}, create: { userId: user.id, role } });
    }
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN", badges: roles, accountStatus: "ACTIVE", deactivatedAt: null, blockedAt: null, blockedUntil: null, blockedReason: null, blockedById: null, sessionVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: { actorId: user.id, targetUserId: user.id, action: "role.emergency_grant", entityType: "UserRole", entityId: String(user.id), metadata: { roles, source: "admin:grant" } } });
  });
  console.log(JSON.stringify({ success: true, userId: user.id, email, roles }, null, 2));
}

main().catch((error) => { console.error("[admin:grant] Failed:", error.message || error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
