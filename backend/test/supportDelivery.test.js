const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const supportRouter = require("../src/routes/support.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/support", supportRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("support delivery is idempotent, user-scoped, threaded, audited, and never reports failed writes as success", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "support-delivery-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    supportFindUnique: prisma.supportMessage.findUnique,
    supportFindMany: prisma.supportMessage.findMany,
    transaction: prisma.$transaction,
    consoleError: console.error,
  };
  const actors = {
    1: { id: 1, email: "student@example.test", username: "Student", roles: [] },
    2: { id: 2, email: "admin@example.test", username: "Admin", roles: [{ role: "ADMIN" }] },
    3: { id: 3, email: "other@example.test", username: "Other", roles: [] },
  };
  const messages = [];
  const audits = [];
  const notifications = [];
  const errorLogs = [];
  let nextId = 1;
  let failNextTransaction = false;

  function authUser(id) {
    const actor = actors[id];
    if (!actor) return null;
    return {
      ...actor,
      role: "USER",
      badges: [],
      accountStatus: "ACTIVE",
      deactivatedAt: null,
      sessionVersion: 0,
      blockedAt: null,
      blockedUntil: null,
      blockedReason: null,
      bansReceived: [],
    };
  }

  function hydrate(message) {
    return {
      ...message,
      user: message.userId ? actors[message.userId] : null,
      replies: messages.filter((candidate) => candidate.parentId === message.id).sort((a, b) => a.id - b.id),
    };
  }

  prisma.user.findUnique = async ({ where }) => authUser(where.id);
  prisma.user.update = async ({ where }) => authUser(where.id);
  prisma.supportMessage.findUnique = async ({ where }) => {
    const found = messages.find((message) => (
      where.id ? message.id === where.id : message.clientRequestId === where.clientRequestId
    ));
    return found ? hydrate(found) : null;
  };
  prisma.supportMessage.findMany = async ({ where, orderBy, take }) => {
    let result = messages.filter((message) => {
      if (where.userId !== undefined) return message.userId === where.userId;
      return message.from === where.from && message.parentId === where.parentId;
    }).map(hydrate);
    result.sort((a, b) => orderBy.createdAt === "desc" ? b.id - a.id : a.id - b.id);
    return result.slice(0, take);
  };
  prisma.$transaction = async (callback) => {
    if (failNextTransaction) {
      failNextTransaction = false;
      throw new Error("simulated support database failure");
    }
    const draft = messages.map((message) => ({ ...message }));
    const draftAudits = [];
    const draftNotifications = [];
    const tx = {
      supportMessage: {
        create: async ({ data }) => {
          if (data.clientRequestId && draft.some((message) => message.clientRequestId === data.clientRequestId)) {
            const conflict = new Error("unique conflict");
            conflict.code = "P2002";
            throw conflict;
          }
          const created = {
            id: nextId++,
            status: "open",
            parentId: null,
            clientRequestId: null,
            createdAt: new Date(Date.UTC(2026, 6, 19, 12, 0, nextId)),
            ...data,
          };
          draft.push(created);
          return hydrate(created);
        },
        update: async ({ where, data }) => {
          const message = draft.find((candidate) => candidate.id === where.id);
          Object.assign(message, data);
          return message;
        },
        delete: async ({ where }) => {
          const index = draft.findIndex((candidate) => candidate.id === where.id);
          return draft.splice(index, 1)[0];
        },
      },
      notification: {
        create: async ({ data }) => {
          draftNotifications.push(data);
          return { id: draftNotifications.length, ...data };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          draftAudits.push(data);
          return { id: draftAudits.length, ...data };
        },
      },
    };
    const result = await callback(tx);
    messages.splice(0, messages.length, ...draft);
    audits.push(...draftAudits);
    notifications.push(...draftNotifications);
    return result;
  };
  console.error = (...args) => errorLogs.push(args);

  const token = (id) => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const request = (origin, path, options = {}, actorId = 1) => fetch(`${origin}/api/support${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token(actorId)}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });

  try {
    await withServer(async (origin) => {
      const body = {
        text: "Проверка реальной доставки сообщения поддержки.",
        clientRequestId: "support-request-00000001",
      };
      const createdResponse = await request(origin, "/", { method: "POST", body: JSON.stringify(body) });
      const created = await createdResponse.json();
      assert.equal(createdResponse.status, 201);
      assert.equal(created.success, true);
      assert.equal(created.data.userId, 1);
      assert.equal(messages.length, 1);
      assert.equal(audits[0].action, "support.created");

      const duplicateResponse = await request(origin, "/", { method: "POST", body: JSON.stringify(body) });
      const duplicate = await duplicateResponse.json();
      assert.equal(duplicateResponse.status, 200);
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.data.id, created.data.id);
      assert.equal(messages.length, 1);

      const ownHistoryResponse = await request(origin, "/me");
      const ownHistory = await ownHistoryResponse.json();
      assert.equal(ownHistory.success, true);
      assert.deepEqual(ownHistory.data.map((message) => message.id), [created.data.id]);

      const otherHistoryResponse = await request(origin, "/me", {}, 3);
      assert.deepEqual((await otherHistoryResponse.json()).data, []);

      const adminListResponse = await request(origin, "/", {}, 2);
      const adminList = await adminListResponse.json();
      assert.equal(adminList.data.length, 1);
      assert.equal(adminList.data[0].text, body.text);
      assert.deepEqual(adminList.data[0].replies, []);

      const replyResponse = await request(origin, `/${created.data.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: "Сообщение получено, мы уже проверяем." }),
      }, 2);
      const reply = await replyResponse.json();
      assert.equal(replyResponse.status, 201);
      assert.equal(reply.data.parentId, created.data.id);
      assert.equal(notifications.length, 1);
      assert.equal(audits.at(-1).action, "support.replied");

      const refreshedHistory = await (await request(origin, "/me")).json();
      assert.equal(refreshedHistory.data.length, 2);
      assert.equal(refreshedHistory.data[1].from, "admin");

      const refreshedAdmin = await (await request(origin, "/", {}, 2)).json();
      assert.equal(refreshedAdmin.data.length, 1);
      assert.equal(refreshedAdmin.data[0].replies.length, 1);
      assert.equal(refreshedAdmin.data[0].status, "answered");

      failNextTransaction = true;
      const failedResponse = await request(origin, "/", {
        method: "POST",
        body: JSON.stringify({ text: "Это сообщение не должно сохраниться.", clientRequestId: "support-request-00000002" }),
      });
      const failed = await failedResponse.json();
      assert.equal(failedResponse.status, 500);
      assert.equal(failed.success, false);
      assert.equal(failed.code, "SUPPORT_CREATE_FAILED");
      assert.equal(messages.some((message) => message.clientRequestId === "support-request-00000002"), false);
      assert.match(errorLogs[0][1], /simulated support database failure/);
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.supportMessage.findUnique = originals.supportFindUnique;
    prisma.supportMessage.findMany = originals.supportFindMany;
    prisma.$transaction = originals.transaction;
    console.error = originals.consoleError;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
