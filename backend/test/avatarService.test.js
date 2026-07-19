const assert = require("node:assert/strict");
const test = require("node:test");
const sharp = require("sharp");
const {
  AVATAR_PRESETS,
  avatarData,
  normalizeUploadedAvatar,
  renderAvatarSvg,
} = require("../src/services/avatar.service");

test("avatar presets are a stable custom set and default initials are safely escaped", () => {
  assert.equal(AVATAR_PRESETS.length, 12);
  assert.equal(new Set(AVATAR_PRESETS.map((preset) => preset.id)).size, 12);
  const svg = renderAvatarSvg({ username: "<script>alert(1)</script>" });
  assert.match(svg, /viewBox="0 0 128 128"/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

test("uploaded photos are decoded by content and normalized to a square 512px WEBP", async () => {
  const source = await sharp({ create: { width: 900, height: 500, channels: 3, background: "#35e6ff" } }).png().toBuffer();
  const normalized = await normalizeUploadedAvatar(source);
  const metadata = await sharp(normalized.imageData).metadata();
  assert.equal(normalized.mimeType, "image/webp");
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.ok(normalized.imageData.length < 700 * 1024);
});

test("real content validation rejects SVG even when a client could spoof the extension", async () => {
  await assert.rejects(
    normalizeUploadedAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')),
    (error) => error.code === "AVATAR_TYPE_INVALID",
  );
});

test("avatar response metadata is versioned without exposing stored binary data", () => {
  const data = avatarData({ id: 7, avatar: { kind: "UPLOAD", presetId: null, updatedAt: new Date("2026-07-19T12:00:00.000Z"), imageData: Buffer.from("private") } });
  assert.equal(data.avatarKind, "UPLOAD");
  assert.match(data.avatarUrl, /^\/api\/users\/7\/avatar\?v=\d+$/);
  assert.equal("imageData" in data, false);
});
