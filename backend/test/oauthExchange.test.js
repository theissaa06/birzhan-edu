const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const express = require("express");
const prisma = require("../src/config/prisma");
const oauthRouter = require("../src/routes/oauth.routes");

async function withServer(run) {
  const app = express();
  app.use(express.json());
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

test("claims an OAuth exchange code atomically and rejects its replay", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "oauth-exchange-test-secret";
  const originalFindUnique = prisma.oAuthLoginAttempt.findUnique;
  const originalUpdateMany = prisma.oAuthLoginAttempt.updateMany;
  const exchangeCode = "one-use-exchange-code";
  const exchangeCodeHash = crypto.createHash("sha256").update(exchangeCode).digest("hex");
  let claimed = false;
  const attempt = {
    id: 71,
    exchangeCodeHash,
    usedAt: new Date(),
    exchangedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 7, username: "OAuth Student", email: "oauth@example.test", sessionVersion: 0, accountStatus: "ACTIVE", role: "USER", badges: [], roles: [], oauthIdentities: [] },
  };

  prisma.oAuthLoginAttempt.findUnique = async () => attempt;
  prisma.oAuthLoginAttempt.updateMany = async ({ where }) => {
    assert.equal(where.exchangeCodeHash, exchangeCodeHash);
    if (claimed) return { count: 0 };
    claimed = true;
    return { count: 1 };
  };

  try {
    await withServer(async (origin) => {
      const request = () => fetch(`${origin}/api/auth/oauth/exchange`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: exchangeCode }),
      });
      const firstResponse = await request();
      const first = await firstResponse.json();
      assert.equal(firstResponse.status, 200);
      assert.equal(first.success, true);
      assert.ok(first.token);
      assert.equal(JSON.stringify(first).includes(exchangeCode), false);

      const replayResponse = await request();
      const replay = await replayResponse.json();
      assert.equal(replayResponse.status, 400);
      assert.equal(replay.code, "OAUTH_EXCHANGE_INVALID");
    });
  } finally {
    prisma.oAuthLoginAttempt.findUnique = originalFindUnique;
    prisma.oAuthLoginAttempt.updateMany = originalUpdateMany;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
