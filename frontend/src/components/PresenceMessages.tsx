import { useEffect } from "react";
import { useAuthSession } from "./AuthSessionProvider";
import { showToast } from "../services/appToast";

const RETURN_THRESHOLD_MS = 5 * 60 * 1000;

export default function PresenceMessages() {
  const { user, checking } = useAuthSession();

  useEffect(() => {
    if (checking) return;
    const today = new Date().toISOString().slice(0, 10);
    const identity = user?.id ? `user-${user.id}` : "guest";
    const key = `frame-school-welcome:${identity}`;
    if (localStorage.getItem(key) !== today) {
      localStorage.setItem(key, today);
      window.setTimeout(() => showToast({
        tone: "info",
        title: user?.username ? `С возвращением, ${user.username}!` : "Добро пожаловать во Frame School",
        message: user ? "Продолжим монтаж? Ваш прогресс сохранён." : "Здесь теория сразу превращается в готовые кадры и портфолио.",
      }), 500);
    }
  }, [checking, user]);

  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      if (document.visibilityState === "visible" && hiddenAt && Date.now() - hiddenAt >= RETURN_THRESHOLD_MS) {
        showToast({ tone: "info", title: "С возвращением", message: "Всё на месте — можно продолжать с последнего кадра." });
        hiddenAt = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
