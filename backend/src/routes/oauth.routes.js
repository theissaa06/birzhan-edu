const crypto = require("crypto");
const express = require("express");
const prisma = require("../config/prisma");
const { authMiddleware } = require("../middleware/auth.middleware");
const { generateToken } = require("../utils/jwt");
const { rolesFromUser, highestRole } = require("../utils/access");
const { writeAudit } = require("../utils/audit");

const router = express.Router();
const STATE_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TTL_MS = 5 * 60 * 1000;

const PROVIDERS = Object.freeze({
  google: {
    enum: "GOOGLE",
    required: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    clientId: "GOOGLE_CLIENT_ID",
  },
  apple: {
    enum: "APPLE",
    required: ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"],
    clientId: "APPLE_CLIENT_ID",
  },
  telegram: {
    enum: "TELEGRAM",
    required: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_NAME"],
  },
  vk: {
    enum: "VK",
    required: ["VK_CLIENT_ID", "VK_CLIENT_SECRET"],
    clientId: "VK_CLIENT_ID",
  },
});

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function configured(name) {
  const provider = PROVIDERS[name];
  if (!provider) return false;
  if (!provider.required.every((key) => String(process.env[key] || "").trim())) return false;
  if (name === "telegram" || process.env.NODE_ENV !== "production") return true;

  const redirectBase = String(
    process.env.OAUTH_REDIRECT_BASE_URL || process.env.PUBLIC_BACKEND_URL || "",
  ).trim();
  const frontendBase = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  return Boolean(redirectBase && frontendBase);
}

function frontendUrl(path = "/login") {
  const base = String(process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function callbackUrl(name) {
  const base = String(process.env.OAUTH_REDIRECT_BASE_URL || process.env.PUBLIC_BACKEND_URL || "http://localhost:3003").trim().replace(/\/$/, "");
  return `${base}/api/auth/oauth/${name}/callback`;
}

function safeRedirectPath(value) {
  const path = String(value || "/profile");
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 200) : "/profile";
}

function redirectError(res, code, provider) {
  const query = new URLSearchParams({ oauth_error: code, provider });
  return res.redirect(303, `${frontendUrl("/login")}?${query}`);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAppleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlJson({ alg: "ES256", kid: process.env.APPLE_KEY_ID, typ: "JWT" });
  const payload = base64urlJson({
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: process.env.APPLE_CLIENT_ID,
  });
  const input = `${header}.${payload}`;
  const privateKey = String(process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const signature = crypto.sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${signature.toString("base64url")}`;
}

async function verifyJwt(jwt, { jwksUrl, issuer, audience, nonceHash }) {
  const parts = String(jwt || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed identity token");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error("Identity key service unavailable");
  const { keys = [] } = await response.json();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Identity signing key not found");
  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signature = Buffer.from(parts[2], "base64url");
  const verified = crypto.verify(
    header.alg === "ES256" ? "sha256" : "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    header.alg === "ES256" ? { key, dsaEncoding: "ieee-p1363" } : key,
    signature,
  );
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!verified || payload.iss !== issuer || !audiences.includes(audience) || Number(payload.exp || 0) <= now) {
    throw new Error("Identity token validation failed");
  }
  if (nonceHash && hash(payload.nonce || "") !== nonceHash) throw new Error("Identity nonce mismatch");
  return payload;
}

function authorizationUrl(name, { state, nonce, codeChallenge }) {
  const redirectUri = callbackUrl(name);
  if (name === "google") {
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    });
    return `${process.env.GOOGLE_AUTHORIZE_URL || "https://accounts.google.com/o/oauth2/v2/auth"}?${query}`;
  }
  if (name === "apple") {
    const query = new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "name email",
      state,
      nonce,
    });
    return `${process.env.APPLE_AUTHORIZE_URL || "https://appleid.apple.com/auth/authorize"}?${query}`;
  }
  if (name === "vk") {
    const query = new URLSearchParams({
      response_type: "code",
      client_id: process.env.VK_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "email",
    });
    return `${process.env.VK_AUTHORIZE_URL || "https://id.vk.com/authorize"}?${query}`;
  }
  throw new Error("Provider does not use redirect OAuth");
}

async function createAttempt(name, { redirectPath, userId }) {
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken(48);
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  await prisma.oAuthLoginAttempt.create({
    data: {
      provider: PROVIDERS[name].enum,
      stateHash: hash(state),
      nonceHash: hash(nonce),
      codeVerifier,
      redirectPath: safeRedirectPath(redirectPath),
      userId: userId || null,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });
  return { state, nonce, codeChallenge };
}

async function exchangeProviderCode(name, body, attempt) {
  const code = String(body.code || "");
  if (!code) throw new Error("Authorization code is missing");
  if (name === "google") {
    const tokenResponse = await fetch(process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(name),
        code_verifier: attempt.codeVerifier,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const tokens = await tokenResponse.json();
    const userResponse = await fetch(process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!userResponse.ok) throw new Error("Google profile request failed");
    const user = await userResponse.json();
    if (!user.sub || !user.email || user.email_verified === false) throw new Error("Google did not return a verified email");
    return { providerUserId: String(user.sub), email: String(user.email).toLowerCase(), displayName: user.name || user.email.split("@")[0] };
  }
  if (name === "apple") {
    const tokenResponse = await fetch(process.env.APPLE_TOKEN_URL || "https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: createAppleClientSecret(),
        redirect_uri: callbackUrl(name),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) throw new Error("Apple token exchange failed");
    const tokens = await tokenResponse.json();
    const payload = await verifyJwt(tokens.id_token || body.id_token, {
      jwksUrl: process.env.APPLE_JWKS_URL || "https://appleid.apple.com/auth/keys",
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
      nonceHash: attempt.nonceHash,
    });
    let displayName = "Участник Frame School";
    try {
      const supplied = typeof body.user === "string" ? JSON.parse(body.user) : body.user;
      displayName = [supplied?.name?.firstName, supplied?.name?.lastName].filter(Boolean).join(" ") || displayName;
    } catch {}
    return { providerUserId: String(payload.sub), email: payload.email ? String(payload.email).toLowerCase() : null, displayName };
  }
  if (name === "vk") {
    const tokenResponse = await fetch(process.env.VK_TOKEN_URL || "https://id.vk.com/oauth2/auth", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: attempt.codeVerifier,
        client_id: process.env.VK_CLIENT_ID,
        client_secret: process.env.VK_CLIENT_SECRET,
        redirect_uri: callbackUrl(name),
        device_id: String(body.device_id || ""),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) throw new Error("VK token exchange failed");
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch(process.env.VK_USERINFO_URL || "https://id.vk.com/oauth2/user_info", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: tokens.access_token, client_id: process.env.VK_CLIENT_ID }),
      signal: AbortSignal.timeout(8000),
    });
    if (!profileResponse.ok) throw new Error("VK profile request failed");
    const response = await profileResponse.json();
    const user = response.user || response;
    const id = user.user_id || user.id || tokens.user_id;
    if (!id) throw new Error("VK profile identifier is missing");
    return {
      providerUserId: String(id),
      email: (user.email || tokens.email) ? String(user.email || tokens.email).toLowerCase() : null,
      displayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Участник VK",
    };
  }
  throw new Error("Unsupported provider");
}

async function linkIdentity(userId, provider, profile, tx = prisma) {
  const owned = await tx.oAuthIdentity.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
  });
  if (owned && owned.userId !== userId) {
    const error = new Error("Identity belongs to another account");
    error.code = "OAUTH_IDENTITY_IN_USE";
    throw error;
  }
  return tx.oAuthIdentity.upsert({
    where: { userId_provider: { userId, provider } },
    update: { providerUserId: profile.providerUserId, emailSnapshot: profile.email, displayName: profile.displayName },
    create: { userId, provider, providerUserId: profile.providerUserId, emailSnapshot: profile.email, displayName: profile.displayName },
  });
}

async function resolveOAuthUser(provider, profile, linkingUserId) {
  if (linkingUserId) {
    await linkIdentity(linkingUserId, provider, profile);
    return prisma.user.findUnique({ where: { id: linkingUserId }, include: { roles: true, oauthIdentities: true } });
  }
  const identity = await prisma.oAuthIdentity.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
    include: { user: { include: { roles: true, oauthIdentities: true, bansReceived: { where: { status: "ACTIVE" }, take: 1 } } } },
  });
  if (identity) return identity.user;
  if (profile.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: profile.email } });
    if (emailOwner) {
      const error = new Error("Existing email requires authenticated linking");
      error.code = "OAUTH_LINK_REQUIRED";
      throw error;
    }
  }
  const email = profile.email || `${provider.toLowerCase()}-${profile.providerUserId}@oauth.frame-school.invalid`;
  return prisma.user.create({
    data: {
      username: String(profile.displayName || "Участник Frame School").slice(0, 50),
      email,
      password: null,
      oauthIdentities: { create: { provider, providerUserId: profile.providerUserId, emailSnapshot: profile.email, displayName: profile.displayName } },
      notifications: { create: { type: "welcome", title: "Добро пожаловать в Frame School", message: "Профиль создан через безопасный вход.", link: "/courses" } },
    },
    include: { roles: true, oauthIdentities: true, bansReceived: true },
  });
}

async function createExchange(attempt, user) {
  const exchangeCode = randomToken(36);
  await prisma.oAuthLoginAttempt.update({
    where: { id: attempt.id },
    data: {
      usedAt: new Date(),
      exchangeCodeHash: hash(exchangeCode),
      userId: user.id,
      expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS),
    },
  });
  return exchangeCode;
}

async function callbackHandler(req, res) {
  const name = String(req.params.provider || "").toLowerCase();
  if (!PROVIDERS[name] || name === "telegram") return redirectError(res, "provider_invalid", name || "unknown");
  if (req.body?.error || req.query?.error) return redirectError(res, "provider_denied", name);
  const body = { ...req.query, ...req.body };
  const attempt = await prisma.oAuthLoginAttempt.findUnique({ where: { stateHash: hash(body.state || "") } });
  if (!attempt || attempt.provider !== PROVIDERS[name].enum || attempt.usedAt || attempt.expiresAt <= new Date()) {
    return redirectError(res, "state_invalid", name);
  }
  try {
    const profile = await exchangeProviderCode(name, body, attempt);
    const user = await resolveOAuthUser(PROVIDERS[name].enum, profile, attempt.userId);
    if (attempt.userId) {
      await prisma.oAuthLoginAttempt.update({ where: { id: attempt.id }, data: { usedAt: new Date() } });
      return res.redirect(303, `${frontendUrl(attempt.redirectPath || "/profile")}?oauth_linked=${name}`);
    }
    const ban = user.bansReceived?.find((entry) => entry.status === "ACTIVE" && (!entry.endsAt || new Date(entry.endsAt) > new Date()));
    if (ban) return redirectError(res, "account_banned", name);
    if (user.accountStatus === "DEACTIVATED") {
      await prisma.user.update({ where: { id: user.id }, data: { accountStatus: "ACTIVE", deactivatedAt: null, sessionVersion: { increment: 1 } } });
      user.sessionVersion += 1;
    }
    const code = await createExchange(attempt, user);
    return res.redirect(303, `${frontendUrl("/login")}?oauth_code=${encodeURIComponent(code)}`);
  } catch (error) {
    console.error("[OAuth] Callback failed", { provider: name, code: error?.code, message: error?.message });
    return redirectError(res, String(error?.code || "callback_failed").toLowerCase(), name);
  }
}

router.get("/providers", (req, res) => {
  const data = Object.fromEntries(Object.keys(PROVIDERS).map((name) => [name, {
    configured: configured(name),
    startUrl: configured(name) && name !== "telegram" ? `/api/auth/oauth/${name}/start` : null,
    botName: name === "telegram" && configured(name) ? process.env.TELEGRAM_BOT_NAME : null,
  }]));
  return res.json({ success: true, data });
});

router.get("/:provider/start", async (req, res) => {
  const name = String(req.params.provider || "").toLowerCase();
  if (!PROVIDERS[name] || name === "telegram") return res.status(404).json({ success: false, code: "OAUTH_PROVIDER_INVALID", message: "Провайдер не поддерживается." });
  if (!configured(name)) return res.status(503).json({ success: false, code: "OAUTH_PROVIDER_NOT_CONFIGURED", message: "Этот способ входа пока не настроен." });
  const attempt = await createAttempt(name, { redirectPath: req.query.redirect });
  const url = authorizationUrl(name, attempt);
  return req.query.format === "json" ? res.json({ success: true, url }) : res.redirect(302, url);
});

router.get("/:provider/link", authMiddleware, async (req, res) => {
  const name = String(req.params.provider || "").toLowerCase();
  if (!PROVIDERS[name] || name === "telegram" || !configured(name)) return res.status(503).json({ success: false, code: "OAUTH_PROVIDER_NOT_CONFIGURED", message: "Провайдер не настроен." });
  const attempt = await createAttempt(name, { redirectPath: "/profile", userId: req.user.id });
  return res.redirect(302, authorizationUrl(name, attempt));
});

router.get("/:provider/callback", callbackHandler);
router.post("/:provider/callback", express.urlencoded({ extended: false }), callbackHandler);

router.post("/exchange", async (req, res) => {
  const codeHash = hash(String(req.body?.code || ""));
  const attempt = await prisma.oAuthLoginAttempt.findUnique({
    where: { exchangeCodeHash: codeHash },
    include: { user: { include: { roles: true, oauthIdentities: true } } },
  });
  if (!attempt || !attempt.user || !attempt.usedAt || attempt.exchangedAt || attempt.expiresAt <= new Date()) {
    return res.status(400).json({ success: false, code: "OAUTH_EXCHANGE_INVALID", message: "Код входа недействителен или уже использован." });
  }
  await prisma.oAuthLoginAttempt.update({ where: { id: attempt.id }, data: { exchangedAt: new Date(), exchangeCodeHash: null } });
  const roles = rolesFromUser(attempt.user);
  const token = generateToken({ id: attempt.user.id, email: attempt.user.email, sessionVersion: attempt.user.sessionVersion });
  return res.json({
    success: true,
    token,
    user: {
      id: attempt.user.id,
      username: attempt.user.username,
      email: attempt.user.email,
      roles,
      badges: roles,
      role: roles.length ? "ADMIN" : "USER",
      primaryRole: highestRole(roles),
      accountStatus: attempt.user.accountStatus,
    },
  });
});

function verifyTelegramPayload(payload) {
  const suppliedHash = String(payload.hash || "");
  const authDate = Number(payload.auth_date || 0);
  if (!suppliedHash || !authDate || Math.abs(Date.now() / 1000 - authDate) > 600) return false;
  const checkString = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(process.env.TELEGRAM_BOT_TOKEN).digest();
  const expected = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  const a = Buffer.from(suppliedHash);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function telegramProfile(payload) {
  if (!configured("telegram") || !verifyTelegramPayload(payload)) {
    const error = new Error("Telegram signature is invalid");
    error.code = "TELEGRAM_SIGNATURE_INVALID";
    throw error;
  }
  return {
    providerUserId: String(payload.id),
    email: null,
    displayName: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || payload.username || "Участник Telegram",
  };
}

router.post("/telegram/verify", async (req, res) => {
  try {
    const profile = await telegramProfile(req.body || {});
    const user = await resolveOAuthUser("TELEGRAM", profile, null);
    const attempt = await prisma.oAuthLoginAttempt.create({
      data: { provider: "TELEGRAM", stateHash: hash(randomToken()), userId: user.id, usedAt: new Date(), expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS) },
    });
    const code = randomToken(36);
    await prisma.oAuthLoginAttempt.update({ where: { id: attempt.id }, data: { exchangeCodeHash: hash(code) } });
    return res.json({ success: true, code });
  } catch (error) {
    return res.status(401).json({ success: false, code: error?.code || "TELEGRAM_LOGIN_FAILED", message: "Не удалось подтвердить вход через Telegram." });
  }
});

router.post("/telegram/link", authMiddleware, async (req, res) => {
  try {
    const profile = await telegramProfile(req.body || {});
    await linkIdentity(req.user.id, "TELEGRAM", profile);
    return res.json({ success: true, message: "Telegram подключён." });
  } catch (error) {
    return res.status(409).json({ success: false, code: error?.code || "TELEGRAM_LINK_FAILED", message: "Не удалось подключить Telegram." });
  }
});

router.delete("/:provider", authMiddleware, async (req, res) => {
  const name = String(req.params.provider || "").toLowerCase();
  if (!PROVIDERS[name]) return res.status(404).json({ success: false, code: "OAUTH_PROVIDER_INVALID", message: "Провайдер не найден." });
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { password: true, oauthIdentities: true } });
  const identity = user?.oauthIdentities.find((entry) => entry.provider === PROVIDERS[name].enum);
  if (!identity) return res.status(404).json({ success: false, code: "OAUTH_IDENTITY_NOT_FOUND", message: "Способ входа не подключён." });
  if (!user.password && user.oauthIdentities.length <= 1) {
    return res.status(409).json({ success: false, code: "LAST_AUTH_METHOD", message: "Нельзя удалить последний способ входа. Сначала задайте пароль или подключите другой сервис." });
  }
  await prisma.$transaction(async (tx) => {
    await tx.oAuthIdentity.delete({ where: { id: identity.id } });
    await writeAudit(tx, { req, action: "oauth.unlinked", entityType: "OAuthIdentity", entityId: identity.id, targetUserId: req.user.id, metadata: { provider: PROVIDERS[name].enum } });
  });
  return res.json({ success: true, message: "Способ входа отключён." });
});

module.exports = router;
