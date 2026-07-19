import { useEffect, useState } from "react";
import FrameIcon from "./FrameIcon";
import { APP_TOAST_EVENT, type AppToastPayload } from "../services/appToast";
import "./AppToast.css";

const iconByTone = { success: "check", info: "spark", warning: "warning", error: "warning" } as const;

export default function AppToast() {
  const [toasts, setToasts] = useState<AppToastPayload[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const payload = (event as CustomEvent<AppToastPayload>).detail;
      if (!payload?.title || !payload?.message) return;
      setToasts((current) => [...current.slice(-2), payload]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== payload.id)), payload.durationMs || 6200);
    };
    window.addEventListener(APP_TOAST_EVENT, handleToast);
    return () => window.removeEventListener(APP_TOAST_EVENT, handleToast);
  }, []);

  if (!toasts.length) return null;
  return (
    <aside className="app-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <section className={`app-toast app-toast--${toast.tone || "info"}`} role={toast.tone === "error" ? "alert" : "status"} key={toast.id}>
          <span className="app-toast__icon"><FrameIcon name={iconByTone[toast.tone || "info"]} /></span>
          <div className="app-toast__copy"><strong>{toast.title}</strong><p>{toast.message}</p></div>
          <button type="button" onClick={() => setToasts((current) => current.filter((entry) => entry.id !== toast.id))} aria-label="Закрыть уведомление">×</button>
          <span className="app-toast__timeline" style={{ animationDuration: `${toast.durationMs || 6200}ms` }} />
        </section>
      ))}
    </aside>
  );
}
