import type { AuthSessionUser } from "./authStorage";

export const APP_TOAST_EVENT = "frame-school-app-toast";

export type AppToastPayload = {
  id: number;
  title: string;
  message: string;
  tone?: "success" | "info";
};

function emitToast(payload: Omit<AppToastPayload, "id">) {
  window.dispatchEvent(
    new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, {
      detail: { ...payload, id: Date.now() },
    }),
  );
}

function normalizedBadges(user: AuthSessionUser) {
  return (user.badges || []).map((badge) => String(badge).toUpperCase());
}

export function showRegistrationWelcome(user: AuthSessionUser) {
  const name = user.username || user.name || "студент";
  emitToast({
    tone: "success",
    title: `Добро пожаловать, ${name}!`,
    message:
      "Спасибо, что зарегистрировались в Frame School. Аккаунт готов: выберите курс и соберите первую работу для портфолио.",
  });
}

export function showLoginWelcome(user: AuthSessionUser) {
  const name = user.username || user.name || "пользователь";
  const badges = normalizedBadges(user);
  const premiumUntil = user.premiumUntil
    ? new Date(String(user.premiumUntil)).getTime()
    : 0;

  let accessMessage = "Ваш прогресс, курсы и практические работы уже доступны.";
  if (badges.includes("OWNER")) {
    accessMessage = "Вход владельца подтверждён. Защищённый аккаунт и управление платформой доступны.";
  } else if (badges.includes("DEVELOPER")) {
    accessMessage = "Вход разработчика подтверждён. Инструменты администрирования доступны.";
  } else if (user.role === "ADMIN" || badges.includes("ADMIN")) {
    accessMessage = "Вход администратора подтверждён. Панель управления доступна.";
  } else if (user.isPremium === true || premiumUntil > Date.now()) {
    accessMessage = "Premium-доступ подтверждён. Продолжайте обучение без ограничений.";
  }

  emitToast({
    tone: "success",
    title: `С возвращением, ${name}!`,
    message: accessMessage,
  });
}
