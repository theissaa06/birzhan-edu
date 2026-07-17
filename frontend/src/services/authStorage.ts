export const AUTH_SESSION_EVENT = "frame-school-auth-session";

export type AuthSessionUser = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  badges?: string[];
  isPremium?: boolean;
  premiumUntil?: string | null;
  [key: string]: unknown;
};

function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function getAuthToken() {
  return localStorage.getItem("token") || "";
}

export function getStoredAuthUser(): AuthSessionUser | null {
  const raw =
    localStorage.getItem("user") || localStorage.getItem("currentUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSessionUser;
  } catch {
    return null;
  }
}

export function persistAuthUser(user: AuthSessionUser) {
  const serialized = JSON.stringify(user);
  localStorage.setItem("user", serialized);
  localStorage.setItem("currentUser", serialized);
}

export function saveAuthSession(token: string, user: AuthSessionUser) {
  localStorage.setItem("token", token);
  persistAuthUser(user);
  notifyAuthSessionChanged();
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  notifyAuthSessionChanged();
}
