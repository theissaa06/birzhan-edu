import { useEffect, useState } from "react";
import api from "../services/api";
import FrameIcon from "./FrameIcon";
import "./PlatformMessages.css";

type Announcement = { id: number; title: string; message: string; audience: string; isRead?: boolean };

export default function AnnouncementStrip() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let active = true;
    api.get("/announcements").then((response) => {
      const next = (response.data?.announcements || []).find((item: Announcement) => !item.isRead) || null;
      if (active) setAnnouncement(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!announcement) return null;
  const dismiss = () => {
    setAnnouncement(null);
    if (localStorage.getItem("token")) api.post(`/announcements/${announcement.id}/read`).catch(() => undefined);
  };
  return (
    <aside className="announcement-strip" role="status" aria-live="polite">
      <FrameIcon name="premium" />
      <div><strong>{announcement.title}</strong><span>{announcement.message}</span></div>
      <button type="button" onClick={dismiss} aria-label="Скрыть объявление">×</button>
    </aside>
  );
}
