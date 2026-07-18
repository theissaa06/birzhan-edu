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

test("creates, lists, and updates one persisted review per account", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "review-persistence-test-secret";
  const originalUserFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;
  const originalReviewFindMany = prisma.review.findMany;
  const originalTransaction = prisma.$transaction;
  const originalConsoleInfo = console.info;
  const originalConsoleError = console.error;
  let stored = null;
  let transactionFailure = null;
  const successLogs = [];
  const errorLogs = [];

  const author = { id: 7, username: "Test Student", role: "USER", badges: [], roles: [] };
  const tx = {
    review: {
      findUnique: async () => stored,
      upsert: async ({ create, update }) => {
        const now = new Date();
        stored = stored
          ? { ...stored, ...update, updatedAt: now }
          : {
              id: 91,
              ...create,
              isHidden: false,
              createdAt: now,
              updatedAt: now,
              user: author,
              comments: [],
              officialReply: null,
            };
        return stored;
      },
    },
    auditLog: { create: async () => ({ id: 1 }) },
  };

  prisma.user.findUnique = async ({ select }) => {
    if (select?.email) {
      return {
        ...author,
        email: "student@example.test",
        accountStatus: "ACTIVE",
        deactivatedAt: null,
        sessionVersion: 0,
        blockedAt: null,
        blockedUntil: null,
        blockedReason: null,
        bansReceived: [],
      };
    }
    return { id: author.id, username: author.username };
  };
  prisma.user.update = async () => author;
  prisma.review.findMany = async () => (stored ? [stored] : []);
  prisma.$transaction = async (callback) => {
    if (transactionFailure) throw transactionFailure;
    return callback(tx);
  };
  console.info = (...args) => successLogs.push(args);
  console.error = (...args) => errorLogs.push(args);

  try {
    const token = jwt.sign({ id: author.id, sessionVersion: 0 }, process.env.JWT_SECRET);
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };

    await withServer(async (origin) => {
      const createdResponse = await fetch(`${origin}/api/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: 5, direction: "Монтаж", text: "Первый подтверждённый отзыв длиной больше двадцати символов." }),
      });
      const created = await createdResponse.json();
      assert.equal(createdResponse.status, 201);
      assert.equal(created.success, true);
      assert.equal(created.operation, "created");
      assert.equal(created.review.id, 91);

      const listResponse = await fetch(`${origin}/api/reviews?refresh=1`);
      const list = await listResponse.json();
      assert.match(listResponse.headers.get("cache-control"), /no-store/);
      assert.equal(list.reviews.length, 1);
      assert.equal(list.reviews[0].text, created.review.text);

      const updatedResponse = await fetch(`${origin}/api/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: 4, direction: "Цвет", text: "Обновлённый подтверждённый отзыв без создания второй записи." }),
      });
      const updated = await updatedResponse.json();
      assert.equal(updatedResponse.status, 200);
      assert.equal(updated.operation, "updated");
      assert.equal(updated.review.id, 91);
      assert.equal(stored.rating, 4);
      assert.equal(successLogs.length, 2);

      transactionFailure = new Error("simulated transaction failure");
      const failedResponse = await fetch(`${origin}/api/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: 3, direction: "VFX", text: "Этот текст не должен считаться успешно сохранённым отзывом." }),
      });
      const failed = await failedResponse.json();
      assert.equal(failedResponse.status, 500);
      assert.equal(failed.success, false);
      assert.equal(failed.code, "REVIEW_SAVE_FAILED");
      assert.equal(errorLogs.length, 1);
      assert.match(errorLogs[0][1].reason, /simulated transaction failure/);
      assert.equal(stored.rating, 4);
    });
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.user.update = originalUserUpdate;
    prisma.review.findMany = originalReviewFindMany;
    prisma.$transaction = originalTransaction;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
