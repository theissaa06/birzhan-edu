import { useEffect, useState } from "react";
import FrameIcon from "../components/FrameIcon";
import api from "../services/api";
import "./DirectoryPage.css";

type Webinar = { id: number; title: string; description: string; startsAt: string; durationMinutes: number; registrationUrl?: string | null };

export default function WebinarsPage() {
  const [items, setItems] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/webinars").then(({ data }) => setItems(data.webinars || data.data || [])).catch((requestError) => setError(requestError?.response?.data?.message || "Не удалось загрузить вебинары.")).finally(() => setLoading(false)); }, []);
  return <main className="directory-page"><header className="directory-head"><span className="timecode">LIVE / WEBINARS</span><h1>Вебинары Frame School</h1><p>Только опубликованные события из серверного расписания. Время показано в вашем часовом поясе.</p></header>{loading && <div className="directory-state" aria-live="polite">Загружаем расписание…</div>}{error && <div className="directory-state" role="alert"><FrameIcon name="warning" /><p>{error}</p></div>}{!loading && !error && !items.length && <div className="directory-state"><FrameIcon name="webinar" /><h2>Ближайших вебинаров нет</h2><p>Новые события появятся здесь после публикации администратором.</p></div>}<section className="directory-grid">{items.map((item) => <article key={item.id} className="directory-card"><FrameIcon name="webinar" /><div className="directory-meta"><span>{new Date(item.startsAt).toLocaleString("ru-RU",{dateStyle:"medium",timeStyle:"short"})}</span><span>{item.durationMinutes} мин.</span></div><h2>{item.title}</h2><p>{item.description}</p>{item.registrationUrl && <a href={item.registrationUrl} target="_blank" rel="noreferrer">Зарегистрироваться</a>}</article>)}</section></main>;
}
