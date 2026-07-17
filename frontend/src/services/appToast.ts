import type { AuthSessionUser } from "./authStorage";

export const APP_TOAST_EVENT = "frame-school-app-toast";
export type AppToastTone = "success" | "info" | "warning" | "error";
export type AppToastPayload = { id: string; title: string; message: string; tone?: AppToastTone; durationMs?: number };

export function showToast(payload: Omit<AppToastPayload, "id">) {
  window.dispatchEvent(new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, {
    detail: { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
  }));
}

export function showRegistrationWelcome(user: AuthSessionUser) {
  showToast({
    tone: "success",
    title: `Добро пожаловать, ${user.username || user.name || "студент"}!`,
    message: "Аккаунт готов. Выберите курс и соберите первую работу для портфолио.",
  });
}

export function showLoginWelcome(user: AuthSessionUser) {
  const roles = (user.roles || user.badges || []).map((role) => String(role).toUpperCase());
  const name = user.username || user.name || "пользователь";
  let message = "Ваш прогресс, курсы и практические работы доступны.";
  if (roles.includes("OWNER")) message = "Доступ Owner подтверждён. Управление платформой доступно.";
  else if (roles.includes("DEVELOPER")) message = "Доступ Developer подтверждён. Технические инструменты доступны.";
  else if (roles.includes("ADMIN")) message = "Доступ администратора подтверждён. Панель модерации доступна.";
  else if (user.isPremium) message = "Premium-доступ подтверждён. Продолжайте обучение без ограничений.";
  showToast({ tone: "success", title: `С возвращением, ${name}!`, message });
}
