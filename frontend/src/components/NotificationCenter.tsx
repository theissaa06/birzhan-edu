import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuthSession } from "./AuthSessionProvider";
import FrameIcon from "./FrameIcon";
import "./PlatformMessages.css";

type Notification = { id: number; type: string; title: string; message: string; link?: string | null; readAt?: string | null; createdAt: string };

export default function NotificationCenter() {
  const { isAuthenticated } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    api.get("/notifications").then((response) => {
      setItems(response.data?.notifications || []);
      setUnread(Number(response.data?.unread || 0));
    }).catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    if (!isAuthenticated) return;
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, load]);

  if (!isAuthenticated) return null;
  const markRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`).catch(() => undefined);
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnread((value) => Math.max(0, value - 1));
  };

  return (
    <aside className="notification-center">
      <button className="notification-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Уведомления: ${unread} непрочитанных`}>
        <FrameIcon name="timeline" />{unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && <section className="notification-panel" aria-label="Центр уведомлений">
        <header><div><span className="timecode">EVENT LOG</span><h2>Уведомления</h2></div><button type="button" onClick={async () => { await api.post("/notifications/read-all"); setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() }))); setUnread(0); }}>Прочитать все</button></header>
        <div className="notification-list">
          {!items.length && <p className="notification-empty">Новых событий пока нет.</p>}
          {items.map((item) => <article className={item.readAt ? "" : "is-unread"} key={item.id}>
            <span className="notification-keyframe" />
            <div><strong>{item.title}</strong><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString("ru-RU")}</time></div>
            {item.link && <Link to={item.link} onClick={() => { void markRead(item.id); setOpen(false); }}>Открыть</Link>}
          </article>)}
        </div>
      </section>}
    </aside>
  );
}
