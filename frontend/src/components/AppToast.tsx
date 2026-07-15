import { useEffect, useRef, useState } from "react";
import FrameIcon from "./FrameIcon";
import {
  APP_TOAST_EVENT,
  type AppToastPayload,
} from "../services/appToast";
import "./AppToast.css";

const TOAST_LIFETIME_MS = 6200;

export default function AppToast() {
  const [toast, setToast] = useState<AppToastPayload | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearTimer() {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function handleToast(event: Event) {
      const payload = (event as CustomEvent<AppToastPayload>).detail;
      if (!payload?.title || !payload?.message) return;

      clearTimer();
      setToast(payload);
      timeoutRef.current = window.setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, TOAST_LIFETIME_MS);
    }

    window.addEventListener(APP_TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, handleToast);
      clearTimer();
    };
  }, []);

  if (!toast) return null;

  return (
    <aside
      className={`app-toast app-toast--${toast.tone || "info"}`}
      role="status"
      aria-live="polite"
      key={toast.id}
    >
      <span className="app-toast__icon"><FrameIcon name="check" /></span>
      <div className="app-toast__copy">
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" onClick={() => setToast(null)} aria-label="Закрыть уведомление">×</button>
      <span className="app-toast__timeline" />
    </aside>
  );
}
