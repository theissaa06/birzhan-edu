import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import UserAvatar from "../components/UserAvatar";
import AdminVideoReviewPage from "../components/AdminVideoReviewPage";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showToast } from "../services/appToast";
import "./AdminPage.css";

type AdminUser = { id: number; username: string; email: string; roles?: string[]; primaryRole?: string; accountStatus?: string; isPremium?: boolean; premiumUntil?: string | null; paidUntil?: string | null; paidSubscription?: { plan?: string; status?: string; expiresAt?: string | null; provider?: string | null } | null; premiumOverride?: { mode: "FORCE_ENABLED" | "FORCE_DISABLED"; validUntil?: string | null; reason: string; updatedAt?: string } | null; activeBan?: { reason: string; endsAt?: string | null } | null; createdAt?: string };
type Ban = { id: number; status: string; reason: string; startsAt: string; endsAt?: string | null; user: { id: number; username: string; email: string }; actor?: { username: string } };
type Review = { id: number; rating: number; text: string; isHidden?: boolean; createdAt: string; author?: { username?: string; roles?: string[] } | null; officialReply?: { id: number; text: string; label: string } | null; comments?: unknown[] };
type Announcement = { id: number; title: string; message: string; audience: string; activeFrom: string; activeUntil?: string | null };
type SupportMessage = { id: number; text: string; status?: string; createdAt: string; name?: string; email?: string; parentId?: number | null; user?: { username?: string; email?: string; avatarUrl?: string | null }; replies?: SupportMessage[] };
type Stats = Record<string, number>;
type ContentState = { courses: unknown[]; webinars: unknown[]; jobs: unknown[] };

const navigation = [
  ["/admin", "Обзор", "timeline"],
  ["/admin/users", "Пользователи", "all"],
  ["/admin/bans", "Блокировки", "warning"],
  ["/admin/content", "Контент", "folder"],
  ["/admin/reviews", "Отзывы", "frame"],
  ["/admin/ai-reviews", "Проверка видео", "spark"],
  ["/admin/announcements", "Объявления", "premium"],
  ["/admin/support", "Поддержка", "sound"],
] as const;

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : "Операция не выполнена.");
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "без срока";
}

function premiumLabel(entry: AdminUser) {
  if (entry.premiumOverride?.mode === "FORCE_ENABLED") return `вручную включён · до ${date(entry.premiumOverride.validUntil)}`;
  if (entry.premiumOverride?.mode === "FORCE_DISABLED") return `вручную отключён · до ${date(entry.premiumOverride.validUntil)}`;
  if (entry.isPremium) return `активен · до ${date(entry.premiumUntil)}`;
  return "не активен";
}

function localDateTimeAfterDays(days: number) {
  const value = new Date(Date.now() + days * 86400000);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function premiumExpirySummary(value: string) {
  if (!value) return "Без ограничения по сроку";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Дата и время указаны некорректно";
  return `${parsed.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })} · ${Intl.DateTimeFormat().resolvedOptions().timeZone || "локальное время"} · UTC ${parsed.toISOString().replace("T", " ").slice(0, 16)}`;
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
  const [premiumReason, setPremiumReason] = useState("");
  const [premiumValidUntil, setPremiumValidUntil] = useState("");
  const [premiumConfirmed, setPremiumConfirmed] = useState(false);
  const [premiumSaving, setPremiumSaving] = useState(false);
  const [premiumError, setPremiumError] = useState("");
  const [premiumErrorField, setPremiumErrorField] = useState<"reason" | "validUntil" | "confirmation" | "server" | "">("");
  const [announcement, setAnnouncement] = useState({ title: "", message: "", audience: "ALL", activeUntil: "" });
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [pendingReviewDeleteId, setPendingReviewDeleteId] = useState<number | null>(null);
  const [reviewDeleteSaving, setReviewDeleteSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState<SupportMessage | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportReplySaving, setSupportReplySaving] = useState(false);

  const actorRoles = useMemo(() => new Set([...(user?.roles || []), ...(user?.badges || []), user?.role || ""].map((item) => item.toUpperCase())), [user]);
  const canManagePremium = actorRoles.has("OWNER") || actorRoles.has("DEVELOPER");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statsRequest = api.get("/admin/stats").then(({ data }) => setStats(data.stats || {}));
      if (section === "users") {
        await Promise.all([statsRequest, api.get("/admin/users", { params: { q: query || undefined } }).then(({ data }) => {
          const entries = (data.users || data.data || []) as AdminUser[];
          setUsers(entries);
          setSelectedUser((current) => current ? entries.find((entry) => entry.id === current.id) || current : null);
        })]);
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

  async function submitOfficialReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedReview || replySaving) return;
    const text = reply.trim();
    if (text.length < 5 || text.length > 1500) {
      showToast({ tone: "error", title: "Проверьте ответ", message: "Ответ должен содержать от 5 до 1500 символов." });
      return;
    }

    setReplySaving(true);
    try {
      const { data } = await api.put(`/reviews/${selectedReview.id}/official-reply`, { text });
      if (data?.success !== true || !data?.officialReply?.id || data.officialReply.text !== text) {
        throw new Error(data?.message || "Сервер не подтвердил сохранение ответа.");
      }
      showToast({ tone: "success", title: "Официальный ответ", message: data.message || "Ответ опубликован и виден на странице отзывов." });
      setSelectedReview(null);
      setReply("");
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Ответ не сохранён", message: errorMessage(error) });
    } finally {
      setReplySaving(false);
    }
  }

  async function deleteReviewPermanently(review: Review) {
    if (reviewDeleteSaving) return;
    setReviewDeleteSaving(true);
    try {
      const { data } = await api.delete(`/reviews/${review.id}`);
      if (data?.success !== true || Number(data.deletedId) !== review.id) throw new Error(data?.message || "Сервер не подтвердил удаление отзыва.");
      setReviews((current) => current.filter((item) => item.id !== review.id));
      if (selectedReview?.id === review.id) { setSelectedReview(null); setReply(""); }
      setPendingReviewDeleteId(null);
      showToast({ tone: "success", title: "Отзыв удалён", message: data.message || "Отзыв, комментарии и официальный ответ удалены." });
    } catch (error) {
      showToast({ tone: "error", title: "Отзыв не удалён", message: errorMessage(error) });
    } finally {
      setReviewDeleteSaving(false);
    }
  }

  async function submitSupportReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedSupport || supportReplySaving) return;
    const text = supportReply.trim();
    if (text.length < 2 || text.length > 4000) {
      showToast({ tone: "error", title: "Проверьте ответ", message: "Ответ должен содержать от 2 до 4000 символов." });
      return;
    }

    setSupportReplySaving(true);
    try {
      const { data } = await api.post(`/support/${selectedSupport.id}/reply`, { text });
      if (data?.success !== true || !data?.data?.id || data.data.parentId !== selectedSupport.id) {
        throw new Error(data?.message || "Сервер не подтвердил сохранение ответа.");
      }
      showToast({ tone: "success", title: "Ответ поддержки", message: data.message || "Ответ сохранён и доступен пользователю." });
      setSelectedSupport(null);
      setSupportReply("");
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Ответ не сохранён", message: errorMessage(error) });
    } finally {
      setSupportReplySaving(false);
    }
  }

  function openUserEditor(entry: AdminUser) {
    setSelectedUser(entry);
    setReason("");
    setPremiumMode("FORCE_ENABLED");
    setPremiumReason("");
    setPremiumValidUntil(localDateTimeAfterDays(30));
    setPremiumConfirmed(false);
    setPremiumError("");
    setPremiumErrorField("");
  }

  async function submitPremiumOverride(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser || premiumSaving) return;
    const cleanReason = premiumReason.trim();
    if (cleanReason.length < 5) {
      setPremiumError("Укажите понятную причину не короче 5 символов.");
      setPremiumErrorField("reason");
      return;
    }
    let validUntil: string | null = null;
    if (premiumMode !== "CLEAR" && premiumValidUntil) {
      const parsed = new Date(premiumValidUntil);
      if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
        setPremiumError("Дата окончания должна находиться в будущем.");
        setPremiumErrorField("validUntil");
        return;
      }
      validUntil = parsed.toISOString();
    }
    if (!premiumConfirmed) {
      setPremiumError("Подтвердите ручное изменение Premium.");
      setPremiumErrorField("confirmation");
      return;
    }

    setPremiumSaving(true);
    setPremiumError("");
    setPremiumErrorField("");
    try {
      const { data } = await api.post(`/admin/users/${selectedUser.id}/premium-override`, {
        mode: premiumMode,
        reason: cleanReason,
        validUntil,
        confirmed: true,
      });
      if (data?.success !== true) throw new Error(data?.message || "Сервер не подтвердил изменение Premium.");
      showToast({ tone: "success", title: "Premium обновлён", message: data.message || "Пользователь уведомлён об изменении." });
      setPremiumConfirmed(false);
      setPremiumErrorField("");
      await load();
    } catch (error) {
      const message = errorMessage(error);
      setPremiumError(message);
      setPremiumErrorField("server");
      showToast({ tone: "error", title: "Проверьте Premium", message });
    } finally {
      setPremiumSaving(false);
    }
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
          <div className="admin-table-wrap"><table><thead><tr><th>Пользователь</th><th>Роли</th><th>Статус</th><th>Premium</th><th>Действия</th></tr></thead><tbody>{users.map((entry) => <tr key={entry.id}><td><strong>{entry.username}</strong><small>{entry.email}</small></td><td>{(entry.roles || []).join(" / ") || "USER"}</td><td>{entry.activeBan ? `Блокировка: ${entry.activeBan.reason}` : entry.accountStatus || "ACTIVE"}</td><td><strong>{premiumLabel(entry)}</strong>{entry.paidUntil && <small>Оплата до: {date(entry.paidUntil)}</small>}{entry.premiumOverride?.reason && <small>Причина: {entry.premiumOverride.reason}</small>}</td><td><div className="admin-row-actions"><button onClick={() => void perform(() => api.patch(`/admin/users/${entry.id}/roles`, { role: "ADMIN", enabled: !(entry.roles || []).includes("ADMIN") }), "Роли обновлены.")}>{(entry.roles || []).includes("ADMIN") ? "Снять Admin" : "Назначить Admin"}</button><button onClick={() => openUserEditor(entry)}>Управлять</button></div></td></tr>)}</tbody></table>{!users.length && <p className="admin-empty">Пользователи не найдены.</p>}</div>
          {selectedUser && <section className="admin-editor">
            <div><h3>{selectedUser.username}</h3><p>{selectedUser.email}</p></div>
            <section className="admin-control-group" aria-labelledby="ban-control-title">
              <h4 id="ban-control-title">Блокировка</h4>
              <label>Причина блокировки<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Не короче 5 символов" /></label>
              <label>Длительность, минут<input type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
              <div className="admin-editor-actions"><button onClick={() => void perform(() => api.post(`/admin/users/${selectedUser.id}/bans`, { reason, durationMinutes: Number(durationMinutes) }), "Блокировка применена и сессии завершены.")}>Заблокировать</button>{selectedUser.activeBan && <button onClick={() => void perform(() => api.delete(`/admin/users/${selectedUser.id}/bans/active`), "Блокировка снята.")}>Разблокировать</button>}</div>
            </section>
            {canManagePremium && <form className="admin-control-group admin-premium-control" aria-labelledby="premium-control-title" onSubmit={submitPremiumOverride} noValidate>
              <div><h4 id="premium-control-title">Ручной Premium</h4><p>Переопределение доступа не отменяет рекуррентный платёж у провайдера.</p></div>
              <dl className="admin-premium-current">
                <div><dt>Текущий доступ</dt><dd>{premiumLabel(selectedUser)}</dd></div>
                <div><dt>Оплаченный период</dt><dd>{selectedUser.paidUntil ? `${selectedUser.paidSubscription?.plan || "Premium"} · до ${date(selectedUser.paidUntil)}${selectedUser.paidSubscription?.provider ? ` · ${selectedUser.paidSubscription.provider}` : ""}` : "нет активного периода"}</dd></div>
                {selectedUser.premiumOverride && <div><dt>Причина override</dt><dd>{selectedUser.premiumOverride.reason}</dd></div>}
              </dl>
              <fieldset className="admin-premium-fieldset"><legend>1. Выберите действие</legend><div className="admin-premium-modes" role="radiogroup" aria-label="Действие с Premium">
                {[
                  ["FORCE_ENABLED", "Включить", "Разрешить доступ вручную"],
                  ["FORCE_DISABLED", "Отключить", "Запретить доступ вручную"],
                  ["CLEAR", "Снять override", "Вернуть расчёт по оплате"],
                ].map(([value, label, description]) => <button key={value} type="button" role="radio" aria-checked={premiumMode === value} className={premiumMode === value ? "is-active" : ""} onClick={() => { setPremiumMode(value); if (value !== "CLEAR" && !premiumValidUntil) setPremiumValidUntil(localDateTimeAfterDays(30)); setPremiumConfirmed(false); setPremiumError(""); setPremiumErrorField(""); }}>{label}<small>{description}</small></button>)}
              </div></fieldset>
              <label htmlFor="premium-change-reason">2. Причина изменения
                <textarea id="premium-change-reason" rows={3} value={premiumReason} onChange={(event) => { setPremiumReason(event.target.value); setPremiumError(""); setPremiumErrorField(""); }} placeholder="Например: доступ на 30 дней для проверки курса" minLength={5} maxLength={500} required aria-invalid={premiumErrorField === "reason"} aria-describedby={premiumErrorField === "reason" ? "premium-reason-error" : undefined} />
              </label>
              {premiumErrorField === "reason" && <p id="premium-reason-error" className="admin-inline-error" role="alert">{premiumError}</p>}
              {premiumMode !== "CLEAR" && <fieldset className="admin-premium-fieldset"><legend>3. Срок доступа</legend>
                <label htmlFor="premium-valid-until">Дата и время окончания
                  <input id="premium-valid-until" type="datetime-local" value={premiumValidUntil} min={localDateTimeAfterDays(0)} onChange={(event) => { setPremiumValidUntil(event.target.value); setPremiumError(""); setPremiumErrorField(""); }} aria-invalid={premiumErrorField === "validUntil"} aria-describedby="premium-expiry-preview" />
                </label>
                <span className="admin-duration-actions" aria-label="Быстрый выбор срока">
                  {[1, 7, 30, 90].map((days) => <button key={days} type="button" onClick={() => { setPremiumValidUntil(localDateTimeAfterDays(days)); setPremiumError(""); setPremiumErrorField(""); }}>{days} {days === 1 ? "день" : "дней"}</button>)}
                  <button type="button" onClick={() => { setPremiumValidUntil(""); setPremiumError(""); setPremiumErrorField(""); }}>Без срока</button>
                </span>
                <p id="premium-expiry-preview" className="admin-premium-expiry" aria-live="polite"><strong>Выбранный срок:</strong> {premiumExpirySummary(premiumValidUntil)}</p>
                {premiumErrorField === "validUntil" && <p className="admin-inline-error" role="alert">{premiumError}</p>}
              </fieldset>}
              <div className="admin-premium-operation" aria-live="polite"><span>Будет выполнено</span><strong>{premiumMode === "FORCE_ENABLED" ? "Premium включён" : premiumMode === "FORCE_DISABLED" ? "Premium отключён" : "Ручное переопределение снято"}</strong><small>{premiumMode === "CLEAR" ? "Доступ снова будет рассчитан по оплаченной подписке." : premiumExpirySummary(premiumValidUntil)}</small></div>
              <label className="admin-confirm-row"><input type="checkbox" checked={premiumConfirmed} onChange={(event) => { setPremiumConfirmed(event.target.checked); setPremiumError(""); setPremiumErrorField(""); }} /><span>4. Подтверждаю ручное изменение Premium для {selectedUser.username}</span></label>
              {(premiumErrorField === "confirmation" || premiumErrorField === "server") && <p className="admin-inline-error" role="alert">{premiumError}</p>}
              <button type="submit" disabled={premiumSaving}>{premiumSaving ? "Сохраняем…" : premiumMode === "FORCE_ENABLED" ? "Включить Premium" : premiumMode === "FORCE_DISABLED" ? "Отключить Premium" : "Снять переопределение"}</button>
            </form>}
            <button type="button" onClick={() => setSelectedUser(null)}>Закрыть управление</button>
          </section>}
        </>}

        {!loading && section === "bans" && <div className="admin-table-wrap"><table><thead><tr><th>Пользователь</th><th>Причина</th><th>Статус</th><th>Период</th><th>Автор</th></tr></thead><tbody>{bans.map((ban) => <tr key={ban.id}><td>{ban.user.username}<small>{ban.user.email}</small></td><td>{ban.reason}</td><td>{ban.status}</td><td>{date(ban.startsAt)} — {date(ban.endsAt)}</td><td>{ban.actor?.username || "система"}</td></tr>)}</tbody></table>{!bans.length && <p className="admin-empty">История блокировок пуста.</p>}</div>}

        {!loading && section === "content" && <div className="admin-content-grid">{[["Курсы", content.courses, "/courses"], ["Вебинары", content.webinars, "/webinars"], ["Вакансии", content.jobs, "/jobs"]].map(([title, items, link]) => <article key={String(title)}><span className="timecode">SERVER DATA</span><h3>{String(title)}</h3><strong>{(items as unknown[]).length}</strong><NavLink to={String(link)}>Открыть публичный раздел</NavLink></article>)}</div>}

        {!loading && section === "reviews" && <div className="admin-list">
          {reviews.map((review) => <article key={review.id}>
            <header><strong>{review.author?.username || "Пользователь"}</strong><span>{review.rating}/5 · {date(review.createdAt)}</span></header>
            <p>{review.text}</p>
            {review.officialReply && <blockquote><strong>{review.officialReply.label}</strong>{review.officialReply.text}</blockquote>}
            <div className="admin-row-actions">
              <button type="button" className="admin-danger-button" aria-expanded={pendingReviewDeleteId === review.id} onClick={() => setPendingReviewDeleteId((current) => current === review.id ? null : review.id)}>Удалить отзыв</button>
              <button type="button" aria-expanded={selectedReview?.id === review.id} onClick={() => { setSelectedReview(review); setReply(review.officialReply?.text || ""); }}>{review.officialReply ? "Редактировать официальный ответ" : "Официальный ответ"}</button>
            </div>
            {pendingReviewDeleteId === review.id && <div className="admin-delete-confirm" role="alert">
              <strong>Удалить отзыв навсегда?</strong>
              <p>Сам отзыв, комментарии и официальный ответ исчезнут со страницы и не смогут быть восстановлены.</p>
              <div className="admin-row-actions"><button type="button" className="admin-danger-button" disabled={reviewDeleteSaving} onClick={() => void deleteReviewPermanently(review)}>{reviewDeleteSaving ? "Удаляем…" : "Удалить навсегда"}</button><button type="button" disabled={reviewDeleteSaving} onClick={() => setPendingReviewDeleteId(null)}>Отмена</button></div>
            </div>}
          </article>)}
          {!reviews.length && <p className="admin-empty">Отзывов пока нет.</p>}
          {selectedReview && <form className="admin-editor" aria-label="Форма официального ответа" onSubmit={submitOfficialReply}><div><span className="timecode">REVIEW / {selectedReview.id}</span><h3>{selectedReview.officialReply ? "Редактировать официальный ответ" : "Новый официальный ответ"}</h3><p>Метка «Ответ разработчика» или «Ответ администрации» определяется сервером по вашей роли.</p></div><label htmlFor="official-review-reply">Текст ответа<textarea id="official-review-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={5} minLength={5} maxLength={1500} required disabled={replySaving} /></label><small className="admin-editor-count">{reply.length} / 1500</small><div className="admin-editor-actions"><button type="submit" disabled={replySaving}>{replySaving ? "Сохраняем…" : selectedReview.officialReply ? "Сохранить изменения" : "Опубликовать ответ"}</button><button type="button" disabled={replySaving} onClick={() => { setSelectedReview(null); setReply(""); }}>Закрыть</button></div></form>}
        </div>}

        {!loading && section === "ai-reviews" && <AdminVideoReviewPage />}

        {!loading && section === "announcements" && <div className="admin-two-columns"><form className="admin-editor" onSubmit={submitAnnouncement}><h3>Новое объявление</h3><label>Заголовок<input value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} required minLength={3} /></label><label>Сообщение<textarea value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} required minLength={5} rows={5} /></label><label>Аудитория<select value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value })}><option value="ALL">Все</option><option value="USERS">Пользователи</option><option value="PREMIUM">Premium</option><option value="STAFF">Команда</option></select></label><label>Показывать до<input type="datetime-local" value={announcement.activeUntil} onChange={(event) => setAnnouncement({ ...announcement, activeUntil: event.target.value })} /></label><button type="submit">Опубликовать</button></form><div className="admin-list">{announcements.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{item.audience} · {date(item.activeFrom)} — {date(item.activeUntil)}</small><button onClick={() => void perform(() => api.delete(`/announcements/${item.id}`), "Объявление удалено.")}>Удалить</button></article>)}{!announcements.length && <p className="admin-empty">Активных объявлений нет.</p>}</div></div>}

        {!loading && section === "support" && (
          <div className="admin-list">
            {support.map((item) => (
              <article key={item.id}>
                <header>
                  <span className="admin-support-author"><UserAvatar name={item.user?.username || item.name || "Гость"} avatarUrl={item.user?.avatarUrl} size="small" /><strong>{item.user?.username || item.name || item.email || "Гость"}</strong></span>
                  <span>{date(item.createdAt)} · {item.status || "open"}</span>
                </header>
                <p>{item.text}</p>
                {item.replies?.map((threadReply) => (
                  <blockquote key={threadReply.id}>
                    <strong>Ответ поддержки · {date(threadReply.createdAt)}</strong>
                    {threadReply.text}
                  </blockquote>
                ))}
                <button type="button" onClick={() => { setSelectedSupport(item); setSupportReply(""); }}>
                  {item.replies?.length ? "Ответить ещё" : "Ответить"}
                </button>
              </article>
            ))}
            {!support.length && <p className="admin-empty">Обращений пока нет.</p>}
            {selectedSupport && (
              <form className="admin-editor" aria-label="Форма ответа поддержки" onSubmit={submitSupportReply}>
                <h3>Ответ пользователю</h3>
                <label htmlFor="support-admin-reply">
                  Текст ответа
                  <textarea
                    id="support-admin-reply"
                    value={supportReply}
                    onChange={(event) => setSupportReply(event.target.value)}
                    rows={5}
                    minLength={2}
                    maxLength={4000}
                    required
                    disabled={supportReplySaving}
                  />
                </label>
                <div className="admin-editor-actions">
                  <button type="submit" disabled={supportReplySaving}>{supportReplySaving ? "Отправляем…" : "Отправить"}</button>
                  <button type="button" disabled={supportReplySaving} onClick={() => { setSelectedSupport(null); setSupportReply(""); }}>Закрыть</button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
