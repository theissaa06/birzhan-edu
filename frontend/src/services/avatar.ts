import { API_ORIGIN } from "./api";

export type AvatarReference = {
  avatarUrl?: string | null;
  username?: string | null;
};

export function resolveAvatarUrl(value?: string | null) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

export function presetAvatarUrl(presetId: string) {
  return `${API_ORIGIN}/api/users/avatar-presets/${encodeURIComponent(presetId)}`;
}

export function avatarInitials(name?: string | null) {
  const parts = String(name || "Frame User").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "FS").toUpperCase();
}
