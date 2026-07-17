import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showToast } from "../services/appToast";
import "./AdminPage.css";

type AdminUser = { id: number; username: string; email: string; roles?: string[]; primaryRole?: string; accountStatus?: string; isPremium?: boolean; premiumUntil?: string | null; activeBan?: { reason: string; endsAt?: string | null } | null; createdAt?: string };
type Ban = { id: number; status: string; reason: string; startsAt: string; endsAt?: string | null; user: { id: number; username: string; email: string }; actor?: { username: string } };
type Review = { id: number; rating: number; text: string; isHidden?: boolean; createdAt: string; user?: { username?: string; email?: string }; officialReply?: { text: string; label: string } | null; comments?: unknown[] };
type Announcement = { id: number; title: string; message: string; audience: string; activeFrom: string; activeUntil?: string | null };
type SupportMessage = { id: number; message: string; text?: string; status?: string; createdAt: string; username?: string; email?: string; user?: { username?: string; email?: string }; replies?: SupportMessage[] };
type Stats = Record<string, number>;
type ContentState = { courses: unknown[]; webinars: unknown[]; jobs: unknown[] };

const navigation = [
  ["/admin", "Обзор", "timeline"],
  ["/admin/users", "Пользователи", "all"],
  ["/admin/bans", "Блокировки", "warning"],
  ["/admin/content", "Контент", "folder"],
  ["/admin/reviews", "Отзывы", "frame"],
  ["/admin/announcements", "Объявления", "premium"],
  ["/admin/support", "Поддержка", "sound"],
] as const;

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : "Операция не выполнена.");
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "без срока";
}

export default function AdminPage() {
  const location = useLocation();
  const { user } = useAuthSession();
  const section = location.pathname.split("/")[2] || "overview";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [support, setSupport] = useState<SupportMessage[]>([]);
  const [content, setContent] = useState<ContentState>({ courses: [], webinars: [], jobs: [] });
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("1440");
  const [premiumMode, setPremiumMode] = useState("FORCE_ENABLED");
  const [announcement, setAnnouncement] = useState({ title: "", message: "", audience: "ALL", activeUntil: "" });
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reply, setReply] = useState("");
  const [selectedSupport, setSelectedSupport] = useState<SupportMessage | null>(null);
  const [supportReply, setSupportReply] = useState("");

  const actorRoles = useMemo(() => new Set([...(user?.roles || []), ...(user?.badges || []), user?.role || ""].map((item) => item.toUpperCase())), [user]);
  const canManagePremium = actorRoles.has("OWNER") || actorRoles.has("DEVELOPER");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statsRequest = api.get("/admin/stats").then(({ data }) => setStats(data.stats || {}));
      if (section === "users") {
        await Promise.all([statsRequest, api.get("/admin/users", { params: { q: query || undefined } }).then(({ data }) => setUsers(data.users || data.data || []))]);
      } else if (section === "bans") {
        await Promise.all([statsRequest, api.get("/admin/bans").then(({ data }) => setBans(data.bans || []))]);
      } else if (section === "content") {
        await Promise.all([statsRequest, api.get("/courses"), api.get("/webinars"), api.get("/jobs")]).then(([, courses, webinars, jobs]) => setContent({ courses: courses.data?.courses || courses.data?.data || [], webinars: webinars.data?.webinars || webinars.data?.data || [], jobs: jobs.data?.jobs || jobs.data?.data || [] }));
      } else if (section === "reviews") {
        await Promise.all([statsRequest, api.get("/reviews", { params: { includeHidden: true } }).then(({ data }) => setReviews(data.reviews || data.data || []))]);
      } else if (section === "announcements") {
        await Promise.all([statsRequest, api.get("/announcements").then(({ data }) => setAnnouncements(data.announcements || []))]);
      } else if (section === "support") {
        await Promise.all([statsRequest, api.get("/support").then(({ data }) => setSupport(data.data || []))]);
      } else {
        await statsRequest;
      }
    } catch (error) {
      showToast({ tone: "error", title: "Админка", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [query, section]);

  useEffect(() => { void load(); }, [load]);

  async function perform(request: () => Promise<unknown>, success: string) {
    try {
      await request();
      showToast({ tone: "success", title: "Готово", message: success });
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Операция отклонена", message: errorMessage(error) });
    }
  }

  async function submitAnnouncement(event: FormEvent) {
    event.preventDefault();
    await perform(() => api.post("/announcements", { ...announcement, activeUntil: announcement.activeUntil || null }), "Объявление опубликовано.");
    setAnnouncement({ title: "", message: "", audience: "ALL", activeUntil: "" });
  }

  const overview = (
    <div className="admin-metrics">
      {[
        ["Пользователи", stats.users, "all"], ["Активны за 7 дней", stats.activeUsers, "timeline"], ["Premium", stats.premiumUsers, "premium"],
        ["Активные блокировки", stats.activeBans, "warning"], ["Сертификаты", stats.certificates, "certificate"], ["Открытая поддержка", stats.openSupport, "sound"],
      ].map(([label, value, icon]) => <article key={String(label)}><FrameIcon name={icon as "all"} /><span>{label}</span><strong>{Number(value || 0).toLocaleString("ru-RU")}</strong></article>)}
    </div>
  );

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <p className="admin-kicker">CONTROL / FRAME</p>
        <h1>Управление</h1>
        <nav aria-label="Разделы админки">{navigation.map(([path, label, icon]) => <NavLink key={path} to={path} end={path === "/admin"}><FrameIcon name={icon} />{label}</NavLink>)}</nav>
        <p className="admin-role">Ваши роли: {[...actorRoles].filter(Boolean).join(" / ") || "ADMIN"}</p>
      </aside>

      <section className="admin-workspace">
        <header className="admin-section-head"><div><span className="timecode">LIVE / UTC</span><h2>{navigation.find(([path]) => path === location.pathname)?.[1] || "Обзор"}</h2></div><button type="button" onClick={() => void load()} disabled={loading}>Обновить</button></header>
        {loading && <div className="admin-loading" aria-live="polite">Загружаем актуальные данные…</div>}
        {!loading && section === "overview" && overview}

        {!loading && section === "users" && <>
          <form className="admin-search" onSubmit={(event) => { event.preventDefault(); void load(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или email" aria-label="Поиск пользователей" /><button>Найти</button></form>
          <div className="admin-table-wrap"><table><thead><tr><th>Пользователь</th><th>Роли</th><th>Статус</th><th>Premium</th><th>Действия</th></tr></thead><tbody>{users.map((entry) => <tr key={entry.id}><td><strong>{entry.username}</strong><small>{entry.email}</small></td><td>{(entry.roles || []).join(" / ") || "USER"}</td><td>{entry.activeBan ? `Блокировка: ${entry.activeBan.reason}` : entry.accountStatus || "ACTIVE"}</td><td>{entry.isPremium ? `до ${date(entry.premiumUntil)}` : "нет"}</td><td><div className="admin-row-actions"><button onClick={() => void perform(() => api.patch(`/admin/users/${entry.id}/roles`, { role: "ADMIN", enabled: !(entry.roles || []).includes("ADMIN") }), "Роли обновлены.")}>{(entry.roles || []).includes("ADMIN") ? "Снять Admin" : "Назначить Admin"}</button><button onClick={() => setSelectedUser(entry)}>Управлять</button></div></td></tr>)}</tbody></table>{!users.length && <p className="admin-empty">Пользователи не найдены.</p>}</div>
          {selectedUser && <section className="admin-editor"><div><h3>{selectedUser.username}</h3><p>{selectedUser.email}</p></div><label>Причина<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Не короче 5 символов" /></label><label>Блокировка, минут<input type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label><div className="admin-editor-actions"><button onClick={() => void perform(() => api.post(`/admin/users/${selectedUser.id}/bans`, { reason, durationMinutes: Number(durationMinutes) }), "Блокировка применена и сессии завершены.")}>Заблокировать</button>{selectedUser.activeBan && <button onClick={() => void perform(() => api.delete(`/admin/users/${selectedUser.id}/bans/active`), "Блокировка снята.")}>Разблокировать</button>}<button onClick={() => setSelectedUser(null)}>Закрыть</button></div>{canManagePremium && <><label>Ручной Premium<select value={premiumMode} onChange={(event) => setPremiumMode(event.target.value)}><option value="FORCE_ENABLED">Включить</option><option value="FORCE_DISABLED">Отключить</option><option value="CLEAR">Убрать переопределение</option></select></label><button onClick={() => void perform(() => api.post(`/admin/users/${selectedUser.id}/premium-override`, { mode: premiumMode, reason }), "Настройка Premium обновлена; пользователь уведомлён.")}>Подтвердить Premium</button></>}</section>}
        </>}

        {!loading && section === "bans" && <div className="admin-table-wrap"><table><thead><tr><th>Пользователь</th><th>Причина</th><th>Статус</th><th>Период</th><th>Автор</th></tr></thead><tbody>{bans.map((ban) => <tr key={ban.id}><td>{ban.user.username}<small>{ban.user.email}</small></td><td>{ban.reason}</td><td>{ban.status}</td><td>{date(ban.startsAt)} — {date(ban.endsAt)}</td><td>{ban.actor?.username || "система"}</td></tr>)}</tbody></table>{!bans.length && <p className="admin-empty">История блокировок пуста.</p>}</div>}

        {!loading && section === "content" && <div className="admin-content-grid">{[["Курсы", content.courses, "/courses"], ["Вебинары", content.webinars, "/webinars"], ["Вакансии", content.jobs, "/jobs"]].map(([title, items, link]) => <article key={String(title)}><span className="timecode">SERVER DATA</span><h3>{String(title)}</h3><strong>{(items as unknown[]).length}</strong><NavLink to={String(link)}>Открыть публичный раздел</NavLink></article>)}</div>}

        {!loading && section === "reviews" && <div className="admin-list">{reviews.map((review) => <article key={review.id}><header><strong>{review.user?.username || review.user?.email || "Пользователь"}</strong><span>{review.rating}/5 · {date(review.createdAt)}</span></header><p>{review.text}</p>{review.officialReply && <blockquote><strong>{review.officialReply.label}</strong>{review.officialReply.text}</blockquote>}<div className="admin-row-actions"><button onClick={() => void perform(() => api.patch(`/reviews/${review.id}/moderation`, { isHidden: !review.isHidden }), review.isHidden ? "Отзыв опубликован." : "Отзыв скрыт.")}>{review.isHidden ? "Опубликовать" : "Скрыть"}</button><button onClick={() => { setSelectedReview(review); setReply(review.officialReply?.text || ""); }}>Официальный ответ</button></div></article>)}{!reviews.length && <p className="admin-empty">Отзывов пока нет.</p>}{selectedReview && <section className="admin-editor"><h3>Официальный ответ</h3><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={5} /><div className="admin-editor-actions"><button onClick={() => void perform(() => api.put(`/reviews/${selectedReview.id}/official-reply`, { text: reply }), "Официальный ответ сохранён.")}>Сохранить</button><button onClick={() => setSelectedReview(null)}>Закрыть</button></div></section>}</div>}

        {!loading && section === "announcements" && <div className="admin-two-columns"><form className="admin-editor" onSubmit={submitAnnouncement}><h3>Новое объявление</h3><label>Заголовок<input value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} required minLength={3} /></label><label>Сообщение<textarea value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} required minLength={5} rows={5} /></label><label>Аудитория<select value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value })}><option value="ALL">Все</option><option value="USERS">Пользователи</option><option value="PREMIUM">Premium</option><option value="STAFF">Команда</option></select></label><label>Показывать до<input type="datetime-local" value={announcement.activeUntil} onChange={(event) => setAnnouncement({ ...announcement, activeUntil: event.target.value })} /></label><button type="submit">Опубликовать</button></form><div className="admin-list">{announcements.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{item.audience} · {date(item.activeFrom)} — {date(item.activeUntil)}</small><button onClick={() => void perform(() => api.delete(`/announcements/${item.id}`), "Объявление удалено.")}>Удалить</button></article>)}{!announcements.length && <p className="admin-empty">Активных объявлений нет.</p>}</div></div>}

        {!loading && section === "support" && <div className="admin-list">{support.map((item) => <article key={item.id}><header><strong>{item.user?.username || item.username || item.email || "Гость"}</strong><span>{date(item.createdAt)} · {item.status || "open"}</span></header><p>{item.message || item.text}</p><button onClick={() => setSelectedSupport(item)}>Ответить</button></article>)}{!support.length && <p className="admin-empty">Открытых обращений нет.</p>}{selectedSupport && <section className="admin-editor"><h3>Ответ пользователю</h3><textarea value={supportReply} onChange={(event) => setSupportReply(event.target.value)} rows={5} /><div className="admin-editor-actions"><button onClick={() => void perform(() => api.post(`/support/${selectedSupport.id}/reply`, { text: supportReply }), "Ответ отправлен.")}>Отправить</button><button onClick={() => setSelectedSupport(null)}>Закрыть</button></div></section>}</div>}
      </section>
    </main>
  );
}
