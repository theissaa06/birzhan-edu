const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const prisma = require("../src/config/prisma");
const { authMiddleware } = require("../src/middleware/auth.middleware");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("returns 503 without invalidating the session when the auth service fails", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "auth-middleware-test-secret";
  const originalFindUnique = prisma.user.findUnique;
  const originalConsoleError = console.error;
  const logs = [];

  prisma.user.findUnique = async () => {
    throw new Error("database is temporarily unavailable");
  };
  console.error = (...args) => logs.push(args);

  try {
    const token = jwt.sign({ id: 42, sessionVersion: 0 }, process.env.JWT_SECRET);
    const req = {
      method: "GET",
      originalUrl: "/api/auth/me",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${token}` },
    };
    const res = createResponse();
    let nextCalled = false;

    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, {
      success: false,
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Сервис проверки доступа временно недоступен. Повторите попытку.",
    });
    assert.equal(logs.length, 1);
    assert.equal(logs[0][1].endpoint, "GET /api/auth/me");
    assert.equal(logs[0][1].userId, 42);
    assert.match(logs[0][1].reason, /database is temporarily unavailable/);
  } finally {
    prisma.user.findUnique = originalFindUnique;
    console.error = originalConsoleError;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("keeps invalid and expired JWT responses at 401", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "auth-middleware-test-secret";
  const res = createResponse();

  try {
    await authMiddleware(
      {
        method: "GET",
        originalUrl: "/api/auth/me",
        url: "/api/auth/me",
        headers: { authorization: "Bearer definitely-not-a-jwt" },
      },
      res,
      () => assert.fail("next must not be called for an invalid token"),
    );

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, "AUTH_TOKEN_INVALID");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
