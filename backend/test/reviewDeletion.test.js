const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const reviewRouter = require("../src/routes/review.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", reviewRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("staff permanently deletes a review with its dependent data, audit, and author notification", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "review-delete-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    reviewFindUnique: prisma.review.findUnique,
    reviewFindMany: prisma.review.findMany,
    transaction: prisma.$transaction,
  };
  const actor = { id: 21, email: "developer@example.test", role: "USER", badges: [], accountStatus: "ACTIVE", deactivatedAt: null, sessionVersion: 0, blockedAt: null, blockedUntil: null, blockedReason: null, roles: [{ role: "DEVELOPER" }], bansReceived: [] };
  let stored = { id: 91, userId: 7, name: "Student", text: "Отзыв для полного удаления", rating: 2, direction: "Монтаж", isHidden: false, _count: { comments: 2 }, officialReply: { id: 51 } };
  const audits = [];
  const notifications = [];

  prisma.user.findUnique = async ({ where }) => where.id === actor.id ? actor : null;
  prisma.user.update = async () => actor;
  prisma.review.findUnique = async ({ where }) => where.id === stored?.id ? stored : null;
  prisma.review.findMany = async () => stored ? [stored] : [];
  prisma.$transaction = async (callback) => callback({
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
    notification: { create: async ({ data }) => { notifications.push(data); return data; } },
    review: { delete: async ({ where }) => { assert.equal(where.id, 91); stored = null; return { id: 91 }; } },
  });

  try {
    const token = jwt.sign({ id: actor.id, sessionVersion: 0 }, process.env.JWT_SECRET);
    await withServer(async (origin) => {
      const response = await fetch(`${origin}/api/reviews/91`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual({ success: body.success, deletedId: body.deletedId }, { success: true, deletedId: 91 });
      assert.equal(stored, null);
      assert.equal(audits[0].action, "review.deleted");
      assert.equal(audits[0].before.comments, 2);
      assert.equal(audits[0].before.hadOfficialReply, true);
      assert.equal(notifications[0].userId, 7);

      const publicList = await (await fetch(`${origin}/api/reviews`)).json();
      assert.equal(publicList.reviews.length, 0);
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.review.findUnique = originals.reviewFindUnique;
    prisma.review.findMany = originals.reviewFindMany;
    prisma.$transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
