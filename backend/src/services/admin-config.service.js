const fs = require("fs");
const path = require("path");
const prisma = require("../config/prisma");

const CONFIG_PATH = path.resolve(__dirname, "../../config/admins.json");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter((entry) => EMAIL_RE.test(entry)))];
}

function readAdminConfig() {
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return { pending: normalizeList(parsed.pending), confirmed: normalizeList(parsed.confirmed) };
}

async function syncAdminConfig() {
  const config = readAdminConfig();
  if (config.pending.length) {
    console.warn("[AdminConfig] Pending admin emails require manual confirmation", { count: config.pending.length, emails: config.pending });
  }
  const results = [];
  for (const email of config.confirmed) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, badges: true } });
    if (!user) {
      console.warn("[AdminConfig] Confirmed email does not match an existing user", { email });
      results.push({ email, status: "user-not-found" });
      continue;
    }
    await prisma.$transaction([
      prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: "ADMIN" } },
        update: {},
        create: { userId: user.id, role: "ADMIN" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN", badges: [...new Set([...(user.badges || []), "ADMIN"])] },
      }),
    ]);
    results.push({ email, status: "synced" });
  }
  console.log("[AdminConfig] Sync complete", { confirmed: results.length });
  return results;
}

module.exports = { CONFIG_PATH, readAdminConfig, syncAdminConfig };
