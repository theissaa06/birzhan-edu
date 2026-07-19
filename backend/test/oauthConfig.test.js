const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const oauthRouter = require("../src/routes/oauth.routes");

const ENV_KEYS = [
  "NODE_ENV",
  "FRONTEND_URL",
  "OAUTH_REDIRECT_BASE_URL",
  "PUBLIC_BACKEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "TELEGRAM_BOT_NAME",
  "TELEGRAM_BOT_TOKEN",
  "VK_CLIENT_ID",
  "VK_CLIENT_SECRET",
  "JWT_SECRET",
];

function preserveEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

async function withOAuthServer(run) {
  const app = express();
  app.use("/api/auth/oauth", oauthRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("keeps Google disabled in production until credentials and public origins are complete", async () => {
  const previous = preserveEnvironment();
  process.env.NODE_ENV = "production";
  process.env.GOOGLE_CLIENT_ID = "public-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "backend-only-client-secret";
  delete process.env.FRONTEND_URL;
  delete process.env.OAUTH_REDIRECT_BASE_URL;
  delete process.env.PUBLIC_BACKEND_URL;

  try {
    await withOAuthServer(async (origin) => {
      const incomplete = await fetch(`${origin}/api/auth/oauth/providers`).then((response) => response.json());
      assert.equal(incomplete.data.google.configured, false);
      assert.equal(incomplete.data.google.startUrl, null);
      assert.equal(JSON.stringify(incomplete).includes(process.env.GOOGLE_CLIENT_SECRET), false);

      process.env.FRONTEND_URL = "https://frame.example";
      process.env.OAUTH_REDIRECT_BASE_URL = "https://frame.example";
      const complete = await fetch(`${origin}/api/auth/oauth/providers`).then((response) => response.json());
      assert.equal(complete.data.google.configured, true);
      assert.equal(complete.data.google.startUrl, "/api/auth/oauth/google/start");
      assert.equal(JSON.stringify(complete).includes(process.env.GOOGLE_CLIENT_SECRET), false);
    });
  } finally {
    restoreEnvironment(previous);
  }
});

test("reports all four providers ready without exposing any backend secret", async () => {
  const previous = preserveEnvironment();
  Object.assign(process.env, {
    NODE_ENV: "production",
    FRONTEND_URL: "https://frame.example",
    OAUTH_REDIRECT_BASE_URL: "https://frame.example",
    GOOGLE_CLIENT_ID: "google-public-id",
    GOOGLE_CLIENT_SECRET: "google-backend-secret",
    APPLE_CLIENT_ID: "school.frame.service",
    APPLE_TEAM_ID: "APPLETEAM1",
    APPLE_KEY_ID: "APPLEKEY1",
    APPLE_PRIVATE_KEY: "apple-backend-private-key",
    TELEGRAM_BOT_NAME: "FrameSchoolBot",
    TELEGRAM_BOT_TOKEN: "telegram-backend-token",
    VK_CLIENT_ID: "vk-public-id",
    VK_CLIENT_SECRET: "vk-backend-secret",
  });

  try {
    await withOAuthServer(async (origin) => {
      const response = await fetch(`${origin}/api/auth/oauth/providers`);
      const body = await response.json();
      assert.equal(response.status, 200);
      for (const provider of ["google", "apple", "telegram", "vk"]) {
        assert.equal(body.data[provider].configured, true);
      }
      assert.equal(body.data.telegram.botName, "FrameSchoolBot");
      const serialized = JSON.stringify(body);
      for (const secret of [process.env.GOOGLE_CLIENT_SECRET, process.env.APPLE_PRIVATE_KEY, process.env.TELEGRAM_BOT_TOKEN, process.env.VK_CLIENT_SECRET]) {
        assert.equal(serialized.includes(secret), false);
      }
    });
  } finally {
    restoreEnvironment(previous);
  }
});

test("builds a Google authorization request with the exact production callback, state, nonce, and PKCE", async () => {
  const previous = preserveEnvironment();
  const originalCreate = prisma.oAuthLoginAttempt.create;
  Object.assign(process.env, {
    NODE_ENV: "production",
    FRONTEND_URL: "https://theissaa-birzhan-edu.preview.layero.ru",
    OAUTH_REDIRECT_BASE_URL: "https://theissaa-birzhan-edu.preview.layero.ru",
    GOOGLE_CLIENT_ID: "google-public-id",
    GOOGLE_CLIENT_SECRET: "google-backend-secret",
  });
  prisma.oAuthLoginAttempt.create = async () => ({ id: 1 });

  try {
    await withOAuthServer(async (origin) => {
      const response = await fetch(`${origin}/api/auth/oauth/google/start?format=json&redirect=%2Fprofile`);
      const body = await response.json();
      const authorization = new URL(body.url);
      assert.equal(response.status, 200);
      assert.equal(authorization.origin, "https://accounts.google.com");
      assert.equal(authorization.searchParams.get("client_id"), "google-public-id");
      assert.equal(authorization.searchParams.get("redirect_uri"), "https://theissaa-birzhan-edu.preview.layero.ru/api/auth/oauth/google/callback");
      assert.equal(authorization.searchParams.get("response_type"), "code");
      assert.ok(authorization.searchParams.get("state"));
      assert.ok(authorization.searchParams.get("nonce"));
      assert.ok(authorization.searchParams.get("code_challenge"));
      assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
      assert.equal(body.url.includes(process.env.GOOGLE_CLIENT_SECRET), false);
    });
  } finally {
    prisma.oAuthLoginAttempt.create = originalCreate;
    restoreEnvironment(previous);
  }
});

test("authenticated account linking returns a provider URL as JSON instead of exposing an API error page", async () => {
  const previous = preserveEnvironment();
  const originals = {
    attemptCreate: prisma.oAuthLoginAttempt.create,
    userFindUnique: prisma.user.findUnique,
    userUpdate: prisma.user.update,
  };
  let attemptData = null;
  Object.assign(process.env, {
    NODE_ENV: "production",
    FRONTEND_URL: "https://frame.example",
    OAUTH_REDIRECT_BASE_URL: "https://frame.example",
    GOOGLE_CLIENT_ID: "google-public-id",
    GOOGLE_CLIENT_SECRET: "google-backend-secret",
    JWT_SECRET: "oauth-link-test-secret",
  });
  const user = {
    id: 7,
    email: "student@example.test",
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
  };
  prisma.user.findUnique = async ({ where }) => where.id === user.id ? user : null;
  prisma.user.update = async () => user;
  prisma.oAuthLoginAttempt.create = async ({ data }) => { attemptData = data; return { id: 9, ...data }; };

  try {
    const token = jwt.sign({ id: user.id, sessionVersion: 0 }, process.env.JWT_SECRET);
    await withOAuthServer(async (origin) => {
      const response = await fetch(`${origin}/api/auth/oauth/google/link?format=json`, { headers: { authorization: `Bearer ${token}` } });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(new URL(body.url).origin, "https://accounts.google.com");
      assert.equal(attemptData.userId, user.id);
      assert.equal(attemptData.redirectPath, "/profile");
      assert.equal(JSON.stringify(body).includes(process.env.GOOGLE_CLIENT_SECRET), false);
    });
  } finally {
    prisma.oAuthLoginAttempt.create = originals.attemptCreate;
    prisma.user.findUnique = originals.userFindUnique;
    prisma.user.update = originals.userUpdate;
    restoreEnvironment(previous);
  }
});
