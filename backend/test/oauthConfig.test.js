const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const oauthRouter = require("../src/routes/oauth.routes");

const ENV_KEYS = [
  "NODE_ENV",
  "FRONTEND_URL",
  "OAUTH_REDIRECT_BASE_URL",
  "PUBLIC_BACKEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
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
