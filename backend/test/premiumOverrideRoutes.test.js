const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const adminRouter = require("../src/routes/admin.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("manual Premium requires explicit confirmation and persists a visible dated override", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "premium-override-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    transaction: prisma.$transaction,
  };
  const developer = {
    id: 21,
    email: "developer@example.test",
    role: "ADMIN",
    badges: ["DEVELOPER"],
    roles: [{ role: "DEVELOPER" }],
    accountStatus: "ACTIVE",
    deactivatedAt: null,
    sessionVersion: 0,
    blockedAt: null,
    blockedUntil: null,
    blockedReason: null,
    bansReceived: [],
  };
  let override = null;
  const events = [];
  const notifications = [];
  const audits = [];

  prisma.user.findUnique = async ({ where, include }) => {
    if (where.id === developer.id) return developer;
    if (where.id !== 7) return null;
    if (include) {
      return { id: 7, premiumOverride: override, subscriptions: [], premiumUntil: null, premiumPlan: null, premiumStarted: null };
    }
    return { id: 7, premiumOverride: override };
  };
  prisma.user.update = async ({ where, data }) => where.id === developer.id ? developer : { id: 7, ...data };
  prisma.$transaction = async (callback) => callback({
    premiumOverride: {
      upsert: async ({ create, update }) => {
        override = override ? { ...override, ...update, updatedAt: new Date() } : { id: 1, ...create, createdAt: new Date(), updatedAt: new Date() };
        return override;
      },
      deleteMany: async () => { const count = override ? 1 : 0; override = null; return { count }; },
    },
    subscriptionEvent: { create: async ({ data }) => { events.push(data); return { id: events.length, ...data }; } },
    notification: { create: async ({ data }) => { notifications.push(data); return { id: notifications.length, ...data }; } },
    auditLog: { create: async ({ data }) => { audits.push(data); return { id: audits.length, ...data }; } },
  });

  const token = jwt.sign({ id: developer.id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const post = (origin, body) => fetch(`${origin}/api/admin/users/7/premium-override`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  try {
    await withServer(async (origin) => {
      const validUntil = new Date(Date.now() + 30 * 86400000).toISOString();
      const unconfirmedResponse = await post(origin, { mode: "FORCE_ENABLED", reason: "Доступ на проверку", validUntil });
      const unconfirmed = await unconfirmedResponse.json();
      assert.equal(unconfirmedResponse.status, 400);
      assert.equal(unconfirmed.code, "PREMIUM_OVERRIDE_INVALID");
      assert.equal(unconfirmed.fieldErrors.confirmed, "Подтвердите ручное изменение Premium.");
      assert.equal(override, null);

      const successResponse = await post(origin, { mode: "FORCE_ENABLED", reason: "Доступ на проверку", validUntil, confirmed: true });
      const success = await successResponse.json();
      assert.equal(successResponse.status, 200);
      assert.equal(success.success, true);
      assert.equal(override.mode, "FORCE_ENABLED");
      assert.equal(override.reason, "Доступ на проверку");
      assert.equal(override.validUntil.toISOString(), validUntil);
      assert.equal(events[0].type, "MANUAL_OVERRIDE_FORCE_ENABLED");
      assert.equal(notifications[0].title, "Статус Premium изменён");
      assert.equal(audits[0].action, "premium.override");
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.$transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
