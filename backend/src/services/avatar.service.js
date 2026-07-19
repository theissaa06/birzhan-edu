const sharp = require("sharp");

const AVATAR_PRESETS = Object.freeze([
  { id: "cyan-cut", label: "Cyan Cut", background: "#101a24", accent: "#35E6FF", detail: "#5C7CFF", variant: 0 },
  { id: "magenta-key", label: "Magenta Key", background: "#211421", accent: "#FF4FD8", detail: "#35E6FF", variant: 1 },
  { id: "amber-frame", label: "Amber Frame", background: "#211910", accent: "#FFB05C", detail: "#35E6FF", variant: 2 },
  { id: "violet-track", label: "Violet Track", background: "#18152A", accent: "#A991FF", detail: "#FF4FD8", variant: 3 },
  { id: "mint-lens", label: "Mint Lens", background: "#10221E", accent: "#54F0BE", detail: "#35E6FF", variant: 4 },
  { id: "blue-marker", label: "Blue Marker", background: "#111D2D", accent: "#64A7FF", detail: "#FFB05C", variant: 5 },
  { id: "coral-scene", label: "Coral Scene", background: "#261716", accent: "#FF7B72", detail: "#FFB05C", variant: 6 },
  { id: "lime-playhead", label: "Lime Playhead", background: "#18210F", accent: "#B7F45D", detail: "#35E6FF", variant: 7 },
  { id: "silver-mono", label: "Silver Mono", background: "#171A20", accent: "#D8E0EA", detail: "#35E6FF", variant: 8 },
  { id: "rose-timeline", label: "Rose Timeline", background: "#27151D", accent: "#FF82AA", detail: "#A991FF", variant: 9 },
  { id: "aqua-sound", label: "Aqua Sound", background: "#102126", accent: "#6CE7E7", detail: "#FF4FD8", variant: 10 },
  { id: "gold-export", label: "Gold Export", background: "#241E10", accent: "#F4CF62", detail: "#64A7FF", variant: 11 },
]);

const presetById = new Map(AVATAR_PRESETS.map((preset) => [preset.id, preset]));
const fallbackPalettes = [
  ["#14212B", "#35E6FF", "#FF4FD8"],
  ["#221727", "#FF4FD8", "#A991FF"],
  ["#211B12", "#FFB05C", "#35E6FF"],
  ["#13221C", "#54F0BE", "#64A7FF"],
];

function escapeXml(value) {
  return String(value || "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

function initials(username) {
  const parts = String(username || "Frame User").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "FS").toUpperCase();
}

function usernamePalette(username) {
  const seed = [...String(username || "")].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return fallbackPalettes[seed % fallbackPalettes.length];
}

function presetDetails(avatar, username) {
  const preset = avatar?.kind === "PRESET" ? presetById.get(avatar.presetId) : null;
  if (preset) return preset;
  const [background, accent, detail] = usernamePalette(username);
  return { id: "initials", label: "Initials", background, accent, detail, variant: 0 };
}

function renderAvatarSvg({ username, avatar, presetId }) {
  const preset = presetId ? presetById.get(presetId) : presetDetails(avatar, username);
  if (!preset) return null;
  const showInitials = !presetId && avatar?.kind !== "PRESET";
  const label = escapeXml(showInitials ? initials(username) : "");
  const diamondX = 22 + (preset.variant % 4) * 28;
  const lineY = 24 + (preset.variant % 3) * 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Аватар ${escapeXml(username || preset.label)}">
  <rect width="128" height="128" rx="18" fill="${preset.background}"/>
  <g opacity=".18" stroke="${preset.detail}" stroke-width="1">
    <path d="M0 24h128M0 48h128M0 72h128M0 96h128"/>
    <path d="M24 0v128M48 0v128M72 0v128M96 0v128"/>
  </g>
  <path d="M${diamondX} ${lineY - 6}l6 6-6 6-6-6z" fill="${preset.detail}" opacity=".92"/>
  <path d="M12 ${lineY}h104" stroke="${preset.detail}" stroke-width="2" opacity=".7"/>
  ${showInitials
    ? `<path d="M64 18l43 46-43 46-43-46z" fill="${preset.accent}" opacity=".15"/><text x="64" y="73" text-anchor="middle" fill="${preset.accent}" font-family="Arial, sans-serif" font-size="32" font-weight="700" letter-spacing="1">${label}</text>`
    : `<circle cx="64" cy="53" r="20" fill="${preset.accent}" opacity=".92"/><path d="M27 112c5-24 19-36 37-36s32 12 37 36" fill="${preset.accent}" opacity=".82"/><path d="M50 52c5 3 9 4 14 4 8 0 14-3 19-9" fill="none" stroke="${preset.background}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`}
  <path d="M64 8v112" stroke="${preset.detail}" stroke-width="1.5" opacity=".38"/>
</svg>`;
}

function avatarPath(user) {
  if (!user?.id) return null;
  const version = user.avatar?.updatedAt ? new Date(user.avatar.updatedAt).getTime() : 0;
  return `/api/users/${user.id}/avatar?v=${version}`;
}

function avatarData(user) {
  return {
    avatarUrl: avatarPath(user),
    avatarKind: user?.avatar?.kind || "INITIALS",
    avatarPreset: user?.avatar?.presetId || null,
  };
}

async function normalizeUploadedAvatar(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error("Выберите файл изображения.");
    error.code = "AVATAR_FILE_REQUIRED";
    throw error;
  }

  const input = sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000, animated: false });
  const metadata = await input.metadata();
  if (!new Set(["jpeg", "png", "webp"]).has(metadata.format)) {
    const error = new Error("Поддерживаются только изображения JPG, PNG и WEBP.");
    error.code = "AVATAR_TYPE_INVALID";
    throw error;
  }

  const imageData = await sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000, animated: false })
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention" })
    .webp({ quality: 82, effort: 4, smartSubsample: true })
    .toBuffer();

  if (imageData.length > 700 * 1024) {
    const error = new Error("Не удалось безопасно оптимизировать изображение. Выберите другое фото.");
    error.code = "AVATAR_OPTIMIZE_FAILED";
    throw error;
  }
  return { imageData, mimeType: "image/webp" };
}

module.exports = {
  AVATAR_PRESETS,
  avatarData,
  avatarPath,
  normalizeUploadedAvatar,
  presetById,
  renderAvatarSvg,
};
