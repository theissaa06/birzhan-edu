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
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("official review reply enforces staff roles, labels the actor, notifies, audits, and remains public", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "official-review-reply-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    reviewFindUnique: prisma.review.findUnique,
    reviewFindMany: prisma.review.findMany,
    transaction: prisma.$transaction,
    consoleInfo: console.info,
    consoleError: console.error,
  };
  const actors = {
    21: { id: 21, username: "Frame Developer", roles: [{ role: "DEVELOPER" }] },
    22: { id: 22, username: "Frame Admin", roles: [{ role: "ADMIN" }] },
    23: { id: 23, username: "Regular User", roles: [] },
  };
  const review = { id: 91, userId: 7, name: "Test Student", text: "Отзыв", rating: 5, direction: null, isHidden: false, createdAt: new Date(), updatedAt: new Date(), comments: [] };
  const notifications = [];
  const audits = [];
  const successLogs = [];
  const errorLogs = [];
  let storedReply = null;
  let transactionFailure = null;

  prisma.user.findUnique = async ({ where }) => {
    const actor = actors[where.id];
    return actor ? { ...actor, email: `${actor.id}@example.test`, role: "USER", badges: [], accountStatus: "ACTIVE", deactivatedAt: null, sessionVersion: 0, blockedAt: null, blockedUntil: null, blockedReason: null, bansReceived: [] } : null;
  };
  prisma.user.update = async ({ where }) => actors[where.id];
  prisma.review.findUnique = async ({ where }) => where.id === review.id ? { id: review.id, userId: review.userId } : null;
  prisma.review.findMany = async () => [{ ...review, user: { id: 7, username: "Test Student", role: "USER", badges: [], roles: [] }, officialReply: storedReply }];

  const tx = {
    reviewOfficialReply: {
      findUnique: async () => storedReply,
      upsert: async ({ create, update }) => {
        const actorId = storedReply ? update.authorId : create.authorId;
        const now = new Date();
        storedReply = storedReply
          ? { ...storedReply, ...update, updatedAt: now, author: actors[actorId] }
          : { id: 501, ...create, createdAt: now, updatedAt: now, author: actors[actorId] };
        return storedReply;
      },
    },
    notification: { create: async ({ data }) => { notifications.push(data); return { id: notifications.length, ...data }; } },
    auditLog: { create: async ({ data }) => { audits.push(data); return { id: audits.length, ...data }; } },
  };
  prisma.$transaction = async (callback) => {
    if (transactionFailure) throw transactionFailure;
    return callback(tx);
  };
  console.info = (...args) => successLogs.push(args);
  console.error = (...args) => errorLogs.push(args);

  const token = (id) => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const putReply = (origin, id, text) => fetch(`${origin}/api/reviews/91/official-reply`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${token(id)}` },
    body: JSON.stringify({ text }),
  });

  try {
    await withServer(async (origin) => {
      const forbiddenResponse = await putReply(origin, 23, "Обычный пользователь не может ответить.");
      assert.equal(forbiddenResponse.status, 403);
      assert.equal((await forbiddenResponse.json()).code, "INSUFFICIENT_ROLE");

      const createdResponse = await putReply(origin, 21, "Спасибо за подробный отзыв!");
      const created = await createdResponse.json();
      assert.equal(createdResponse.status, 200);
      assert.equal(created.operation, "created");
      assert.equal(created.officialReply.label, "Ответ разработчика");
      assert.equal(notifications.length, 1);
      assert.equal(audits[0].action, "review.official_reply_created");

      const updatedResponse = await putReply(origin, 22, "Спасибо! Администрация обновила официальный ответ.");
      const updated = await updatedResponse.json();
      assert.equal(updated.operation, "updated");
      assert.equal(updated.officialReply.label, "Ответ администрации");
      assert.equal(notifications.length, 2);
      assert.equal(audits[1].action, "review.official_reply_updated");
      assert.equal(audits[1].before.text, "Спасибо за подробный отзыв!");

      const unchangedResponse = await putReply(origin, 22, "Спасибо! Администрация обновила официальный ответ.");
      assert.equal((await unchangedResponse.json()).operation, "unchanged");
      assert.equal(notifications.length, 2);
      assert.equal(audits.length, 2);

      const publicResponse = await fetch(`${origin}/api/reviews`);
      const publicList = await publicResponse.json();
      assert.equal(publicList.reviews[0].officialReply.text, storedReply.text);
      assert.equal(publicList.reviews[0].officialReply.label, "Ответ администрации");

      transactionFailure = new Error("simulated official reply transaction failure");
      const failedResponse = await putReply(origin, 21, "Этот ответ не должен сохраниться из-за ошибки транзакции.");
      const failed = await failedResponse.json();
      assert.equal(failedResponse.status, 500);
      assert.equal(failed.code, "OFFICIAL_REPLY_SAVE_FAILED");
      assert.match(errorLogs[0][1].reason, /simulated official reply transaction failure/);
      assert.ok(successLogs.length >= 3);
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.review.findUnique = originals.reviewFindUnique;
    prisma.review.findMany = originals.reviewFindMany;
    prisma.$transaction = originals.transaction;
    console.info = originals.consoleInfo;
    console.error = originals.consoleError;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
