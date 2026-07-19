const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const premiumRouter = require("../src/routes/premium.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/premium", premiumRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("Premium status distinguishes staff grants and requires support after user disable", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "premium-status-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    subscriptionFindMany: prisma.subscription.findMany,
    transaction: prisma.$transaction,
  };
  const actor = { id: 21, role: "ADMIN", badges: ["DEVELOPER"], roles: [{ role: "DEVELOPER" }] };
  let override = {
    id: 1,
    userId: 7,
    mode: "FORCE_ENABLED",
    validUntil: null,
    reason: "Доступ выдан для обучения",
    actorId: actor.id,
    actor,
  };
  const user = {
    id: 7,
    username: "Premium Student",
    email: "premium@example.test",
    role: "USER",
    badges: [],
    roles: [],
    accountStatus: "ACTIVE",
    deactivatedAt: null,
    sessionVersion: 0,
    blockedAt: null,
    blockedUntil: null,
    blockedReason: null,
    bansReceived: [],
    premiumOverride: override,
    subscriptions: [],
    premiumUntil: null,
    premiumPlan: null,
    premiumStarted: null,
  };
  const events = [];
  const notifications = [];
  const audits = [];

  prisma.user.findUnique = async ({ where, include }) => {
    if (where.id !== user.id) return null;
    return include ? { ...user, premiumOverride: override } : user;
  };
  prisma.user.update = async ({ data }) => { Object.assign(user, data); return user; };
  prisma.subscription.findMany = async () => [];
  prisma.$transaction = async (callback) => callback({
    premiumOverride: {
      upsert: async ({ update }) => {
        override = { ...override, ...update, actor: null };
        user.premiumOverride = override;
        return override;
      },
    },
    subscription: { updateMany: async () => ({ count: 0 }) },
    subscriptionEvent: { create: async ({ data }) => { events.push(data); return data; } },
    notification: { create: async ({ data }) => { notifications.push(data); return data; } },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  });

  const token = jwt.sign({ id: user.id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

  try {
    await withServer(async (origin) => {
      const statusResponse = await fetch(`${origin}/api/premium/status`, { headers });
      const status = await statusResponse.json();
      assert.equal(statusResponse.status, 200);
      assert.equal(status.data.isPremium, true);
      assert.equal(status.data.premiumUntil, null);
      assert.deepEqual(status.data.accessOrigin, { kind: "granted", issuedByRole: "DEVELOPER" });

      const unconfirmedResponse = await fetch(`${origin}/api/premium/cancel`, { method: "POST", headers, body: JSON.stringify({}) });
      assert.equal(unconfirmedResponse.status, 400);

      const cancelResponse = await fetch(`${origin}/api/premium/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmed: true, reason: "Отключение со страницы Premium" }),
      });
      const canceled = await cancelResponse.json();
      assert.equal(cancelResponse.status, 200);
      assert.equal(canceled.data.isPremium, false);
      assert.equal(canceled.data.recoveryRequired, true);
      assert.equal(canceled.data.disabledByUser, true);
      assert.equal(canceled.data.restorationPath, "/support");
      assert.equal(events[0].type, "USER_PREMIUM_DISABLED");
      assert.equal(notifications[0].link, "/support");
      assert.equal(audits[0].action, "premium.disabled_by_user");
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.subscription.findMany = originals.subscriptionFindMany;
    prisma.$transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
