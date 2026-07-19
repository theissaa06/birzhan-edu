const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const prisma = require("../src/config/prisma");
const usersRouter = require("../src/routes/users.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/users", usersRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("avatar API saves presets and normalized uploads atomically, serves them, and rejects unsupported MIME", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "avatar-routes-test-secret";
  const originals = {
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
    transaction: prisma.$transaction,
    consoleError: console.error,
  };
  let avatar = null;
  const audits = [];
  const errorLogs = [];
  const user = {
    id: 1,
    username: "Avatar Student",
    email: "avatar@example.test",
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
  };

  prisma.user.findUnique = async ({ where }) => where.id === user.id ? { ...user, avatar } : null;
  prisma.user.update = async () => user;
  prisma.$transaction = async (callback) => callback({
    userAvatar: {
      findUnique: async () => avatar,
      upsert: async ({ create, update }) => {
        const now = new Date();
        avatar = avatar ? { ...avatar, ...update, updatedAt: now } : { ...create, createdAt: now, updatedAt: now };
        return avatar;
      },
      delete: async () => { const previous = avatar; avatar = null; return previous; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return { id: audits.length, ...data }; } },
  });
  console.error = (...args) => errorLogs.push(args);
  const token = jwt.sign({ id: 1, sessionVersion: 0 }, process.env.JWT_SECRET);

  try {
    await withServer(async (origin) => {
      const presetsResponse = await fetch(`${origin}/api/users/avatar-presets`);
      const presets = await presetsResponse.json();
      assert.equal(presets.data.length, 12);

      const presetResponse = await fetch(`${origin}/api/users/me/avatar/preset`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ presetId: presets.data[0].id }),
      });
      const preset = await presetResponse.json();
      assert.equal(presetResponse.status, 200);
      assert.equal(preset.data.avatarKind, "PRESET");
      assert.equal(preset.data.avatarPreset, presets.data[0].id);
      assert.equal(audits.at(-1).action, "account.avatar_preset_changed");

      const source = await sharp({ create: { width: 720, height: 480, channels: 3, background: "#ff4fd8" } }).jpeg().toBuffer();
      const form = new FormData();
      form.append("avatar", new Blob([source], { type: "image/jpeg" }), "avatar.jpg");
      const uploadResponse = await fetch(`${origin}/api/users/me/avatar`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const uploaded = await uploadResponse.json();
      assert.equal(uploadResponse.status, 200);
      assert.equal(uploaded.data.avatarKind, "UPLOAD");
      assert.equal(avatar.mimeType, "image/webp");
      assert.equal(audits.at(-1).action, "account.avatar_uploaded");

      const imageResponse = await fetch(`${origin}/api/users/1/avatar`);
      assert.equal(imageResponse.status, 200);
      assert.match(imageResponse.headers.get("content-type"), /^image\/webp/);
      const metadata = await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata();
      assert.equal(metadata.width, 512);
      assert.equal(metadata.height, 512);

      const badForm = new FormData();
      badForm.append("avatar", new Blob(["not an image"], { type: "text/plain" }), "avatar.txt");
      const invalidResponse = await fetch(`${origin}/api/users/me/avatar`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: badForm,
      });
      const invalid = await invalidResponse.json();
      assert.equal(invalidResponse.status, 400);
      assert.equal(invalid.code, "AVATAR_TYPE_INVALID");

      const resetResponse = await fetch(`${origin}/api/users/me/avatar`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
      const reset = await resetResponse.json();
      assert.equal(reset.data.avatarKind, "INITIALS");
      assert.equal(avatar, null);
      assert.equal(audits.at(-1).action, "account.avatar_reset");
      assert.equal(errorLogs.length, 0);
    });
  } finally {
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    prisma.$transaction = originals.transaction;
    console.error = originals.consoleError;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
