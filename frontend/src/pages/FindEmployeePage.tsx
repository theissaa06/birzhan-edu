import { useEffect, useState } from "react";
import FrameIcon from "../components/FrameIcon";
import api from "../services/api";
import "./DirectoryPage.css";

type PublicUser = { id: number; username: string; roles: string[]; certificateCount: number; publicWorkCount: number; createdAt: string };

export default function FindEmployeePage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/users/public").then(({ data }) => setUsers(data.users || [])).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return <main className="directory-page"><header className="directory-head"><span className="timecode">TALENT / PUBLIC</span><h1>Участники с публичными работами</h1><p>Список строится по реальным аккаунтам. Контакты, навыки и рейтинги не выдумываются; видны только подтверждённые сервером результаты.</p></header>{loading && <div className="directory-state">Загружаем участников…</div>}{!loading && !users.length && <div className="directory-state"><FrameIcon name="all" /><h2>Публичных профилей пока нет</h2><p>Участники появятся после публикации работ или получения сертификатов.</p></div>}<section className="directory-grid">{users.filter((user) => user.publicWorkCount || user.certificateCount).map((user) => <article key={user.id} className="directory-card"><FrameIcon name="all" /><span className="timecode">USER / {user.id}</span><h2>{user.username}</h2><div className="directory-meta"><span>Публичные работы: {user.publicWorkCount}</span><span>Сертификаты: {user.certificateCount}</span></div><p>На платформе с {new Date(user.createdAt).toLocaleDateString("ru-RU")}</p></article>)}</section></main>;
}
