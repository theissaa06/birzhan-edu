import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showToast } from "../services/appToast";
import "./DirectoryPage.css";

type Bonus = { id: number; title: string; description: string; status: string; requirement?: string | null; claimed?: boolean };

export default function BonusPage() {
  const { isAuthenticated } = useAuthSession();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { try { const { data } = await api.get("/bonus"); setBonuses(data.bonuses || data.data || []); } catch { showToast({ tone: "error", title: "Бонусы", message: "Не удалось загрузить материалы." }); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function claim(bonus: Bonus) { try { const { data } = await api.post(`/bonus/${bonus.id}/claim`); showToast({ tone: "success", title: "Бонус сохранён", message: data.message }); await load(); } catch (error) { showToast({ tone: "error", title: "Бонус не сохранён", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Сначала войдите в аккаунт." }); } }
  return <main className="directory-page"><header className="directory-head"><span className="timecode">BONUS / SERVER LIBRARY</span><h1>Бонусные материалы</h1><p>Здесь отображаются только материалы, опубликованные командой платформы. Получение сохраняется в аккаунте, а не в браузере.</p></header>{loading && <div className="directory-state">Загружаем бонусы…</div>}{!loading && !bonuses.length && <div className="directory-state"><FrameIcon name="premium"/><h2>Бонусы пока не опубликованы</h2><p>Администратор может добавить первый материал через серверный API.</p></div>}<section className="directory-grid">{bonuses.map((bonus) => <article key={bonus.id} className="directory-card"><FrameIcon name="premium"/><div className="directory-meta"><span>{bonus.requirement || bonus.status}</span><span>{bonus.claimed ? "получен" : "доступен"}</span></div><h2>{bonus.title}</h2><p>{bonus.description}</p>{isAuthenticated ? <button type="button" disabled={bonus.claimed} onClick={() => void claim(bonus)}>{bonus.claimed ? "Сохранён" : "Получить"}</button> : <Link to="/login">Войти, чтобы получить</Link>}</article>)}</section></main>;
}
