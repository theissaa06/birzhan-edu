const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.AI_ALLOW_DEMO_FALLBACK = "true";
delete process.env.GEMINI_API_KEY;

const prisma = require("../src/config/prisma");
const aiRouter = require("../src/routes/ai");
const { normalizeAIMode, normalizeAIAction, publicAIOptions, conversationTitle } = require("../src/services/frame-ai-options.service");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/ai", aiRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("Frame AI exposes only supported modes and content actions", () => {
  const options = publicAIOptions();
  assert.deepEqual(options.modes.map((item) => item.id), ["assistant", "mentor", "ideas", "reviewer"]);
  assert.deepEqual(options.actions.map((item) => item.id), ["answer", "summary", "video_plan", "quiz", "rewrite"]);
  assert.equal(options.modes.some((item) => "instruction" in item), false);
  assert.equal(normalizeAIMode("OWNER"), "assistant");
  assert.equal(normalizeAIAction("invalid"), "answer");
  assert.equal(conversationTitle("  Первый   учебный диалог  "), "Первый учебный диалог");
  assert.match(conversationTitle("x".repeat(100)), /…$/);
});

test("authenticated Frame AI persists, scopes, reopens, and deletes conversation memory", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "frame-ai-memory-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    conversationFindMany: prisma.aIConversation.findMany,
    conversationFindFirst: prisma.aIConversation.findFirst,
    conversationCreate: prisma.aIConversation.create,
    conversationUpdate: prisma.aIConversation.update,
    conversationDeleteMany: prisma.aIConversation.deleteMany,
    messageCreateMany: prisma.aIChatMessage.createMany,
    transaction: prisma.$transaction,
  };
  const users = new Map([
    [1, { id: 1, email: "student@example.test" }],
    [2, { id: 2, email: "other@example.test" }],
  ]);
  const conversations = [];
  const messages = [];
  let sequence = 1;

  function authUser(id) {
    const user = users.get(id);
    return user ? {
      ...user,
      role: "USER",
      badges: [],
      accountStatus: "ACTIVE",
      deactivatedAt: null,
      sessionVersion: 0,
      blockedAt: null,
      blockedUntil: null,
      blockedReason: null,
      roles: [],
      bansReceived: [],
    } : null;
  }

  function conversationView(conversation, includeMessages = false) {
    const related = messages.filter((item) => item.conversationId === conversation.id);
    return {
      ...conversation,
      ...(includeMessages ? { messages: related } : {}),
      _count: { messages: related.length },
    };
  }

  prisma.user.findUnique = async ({ where }) => authUser(where.id);
  prisma.user.update = async ({ where }) => authUser(where.id);
  prisma.aIConversation.findMany = async ({ where }) => conversations
    .filter((item) => item.userId === where.userId)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .map((item) => ({ ...conversationView(item), messages: messages.filter((message) => message.conversationId === item.id).slice(-1).reverse() }));
  prisma.aIConversation.findFirst = async ({ where, include }) => {
    const found = conversations.find((item) => item.id === where.id && item.userId === where.userId);
    return found ? conversationView(found, Boolean(include?.messages)) : null;
  };
  prisma.aIConversation.create = async ({ data }) => {
    const now = new Date(Date.UTC(2026, 6, 19, 19, 30, sequence));
    const created = { id: `conversation-${sequence++}`, title: "Новый диалог", mode: "assistant", createdAt: now, updatedAt: now, lastMessageAt: now, ...data };
    const nested = data.messages?.create || [];
    delete created.messages;
    conversations.push(created);
    nested.forEach((item) => messages.push({ id: `message-${sequence++}`, conversationId: created.id, createdAt: new Date(now.getTime() + messages.length), ...item }));
    return created;
  };
  prisma.aIConversation.update = async ({ where, data }) => {
    const found = conversations.find((item) => item.id === where.id);
    Object.assign(found, data, { updatedAt: new Date() });
    return { ...found };
  };
  prisma.aIConversation.deleteMany = async ({ where }) => {
    const index = conversations.findIndex((item) => item.id === where.id && item.userId === where.userId);
    if (index < 0) return { count: 0 };
    const [removed] = conversations.splice(index, 1);
    for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].conversationId === removed.id) messages.splice(i, 1);
    return { count: 1 };
  };
  prisma.aIChatMessage.createMany = async ({ data }) => {
    data.forEach((item) => messages.push({ id: `message-${sequence++}`, createdAt: new Date(), ...item }));
    return { count: data.length };
  };
  prisma.$transaction = async (operations) => Promise.all(operations);

  const token = (id) => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const request = (origin, path, options = {}, userId = 1) => fetch(`${origin}/api/ai${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token(userId)}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });

  try {
    await withServer(async (origin) => {
      const chatResponse = await request(origin, "/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Составь план короткого ролика", mode: "mentor", action: "video_plan" }),
      });
      const chat = await chatResponse.json();
      assert.equal(chatResponse.status, 200);
      assert.equal(chat.success, true);
      assert.equal(chat.demo, true);
      assert.equal(chat.conversation.mode, "mentor");
      assert.equal(conversations.length, 1);
      assert.equal(messages.length, 2);
      assert.equal(messages[0].action, "video_plan");

      const id = chat.conversation.id;
      const list = await (await request(origin, "/conversations")).json();
      assert.equal(list.conversations.length, 1);
      assert.equal(list.conversations[0].id, id);
      assert.equal(list.conversations[0].messageCount, 2);

      const opened = await (await request(origin, `/conversations/${id}`)).json();
      assert.deepEqual(opened.messages.map((item) => item.role), ["user", "assistant"]);
      assert.equal(opened.messages[0].text, "Составь план короткого ролика");

      const forbiddenResponse = await request(origin, `/conversations/${id}`, {}, 2);
      assert.equal(forbiddenResponse.status, 404);

      const deleteResponse = await request(origin, `/conversations/${id}`, { method: "DELETE" });
      assert.equal(deleteResponse.status, 200);
      assert.equal(conversations.length, 0);
      assert.equal(messages.length, 0);
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.aIConversation.findMany = originals.conversationFindMany;
    prisma.aIConversation.findFirst = originals.conversationFindFirst;
    prisma.aIConversation.create = originals.conversationCreate;
    prisma.aIConversation.update = originals.conversationUpdate;
    prisma.aIConversation.deleteMany = originals.conversationDeleteMany;
    prisma.aIChatMessage.createMany = originals.messageCreateMany;
    prisma.$transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
