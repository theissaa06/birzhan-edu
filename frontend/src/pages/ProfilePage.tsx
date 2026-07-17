import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import { useAuthSession } from "../components/AuthSessionProvider";
import api, { API_BASE_URL } from "../services/api";
import { showToast } from "../services/appToast";
import "./ProfilePage.css";

type Identity = { provider: "GOOGLE" | "APPLE" | "TELEGRAM" | "VK"; createdAt: string };
type Progress = { id: number; completed?: boolean; completedAt?: string | null; courseId: number; lessonId: number };
type Profile = { id: number; username: string; email: string; phone?: string | null; roles?: string[]; primaryRole?: string; isPremium?: boolean; premiumStatus?: string; premiumUntil?: string | null; graceUntil?: string | null; accountStatus?: string; createdAt: string; lessonProgress?: Progress[]; oauthIdentities?: Identity[] };
type ProviderName = "google" | "apple" | "telegram" | "vk";
type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string };

declare global { interface Window { frameSchoolTelegramLink?: (user: TelegramUser) => void } }

const providerLabels: Record<ProviderName, string> = { google: "Google", apple: "Apple ID", telegram: "Telegram", vk: "VK" };

export default function ProfilePage() {
  const { isAuthenticated, checking, signOut, refreshSession } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [certificates, setCertificates] = useState(0);
  const [providers, setProviders] = useState<Record<string, {configured:boolean;botName?:string|null}>>({});
  const [telegramOpen, setTelegramOpen] = useState(false);
  const telegramHost = useRef<HTMLDivElement>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [deactivation, setDeactivation] = useState({ password: "", confirmation: "" });
  const [farewell, setFarewell] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [me, certificateData, providerData] = await Promise.all([api.get("/users/me"), api.get("/certificates/me"), api.get("/auth/oauth/providers")]);
      setProfile(me.data?.data || me.data?.user);
      setCertificates((certificateData.data?.certificates || []).length);
      setProviders(providerData.data?.data || {});
    } catch (error) {
      showToast({ tone: "error", title: "Профиль", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Не удалось загрузить профиль." });
    } finally { setLoading(false); }
  }

  useEffect(() => { if (isAuthenticated) void load(); else setLoading(false); }, [isAuthenticated]);
  const connected = useMemo(() => new Set((profile?.oauthIdentities || []).map((identity) => identity.provider.toLowerCase())), [profile]);
  const completed = (profile?.lessonProgress || []).filter((item) => item.completed).length;

  useEffect(() => {
    const host = telegramHost.current;
    const telegram = providers.telegram;
    if (!telegramOpen || !telegram?.configured || !telegram.botName || !host) return;
    window.frameSchoolTelegramLink = async (user) => {
      try { await api.post("/auth/oauth/telegram/link", user); showToast({ tone: "success", title: "Telegram подключён", message: "Теперь его можно использовать для входа." }); setTelegramOpen(false); await load(); }
      catch (error) { showToast({ tone: "error", title: "Telegram", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Не удалось подключить аккаунт." }); }
    };
    host.replaceChildren();
    const script = document.createElement("script");
    script.async = true; script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", telegram.botName); script.setAttribute("data-size", "large"); script.setAttribute("data-userpic", "false"); script.setAttribute("data-radius", "4"); script.setAttribute("data-request-access", "write"); script.setAttribute("data-onauth", "frameSchoolTelegramLink(user)");
    host.appendChild(script);
    return () => { delete window.frameSchoolTelegramLink; };
  }, [providers.telegram?.botName, providers.telegram?.configured, telegramOpen]);

  function connect(provider: ProviderName) {
    if (!providers[provider]?.configured) { showToast({ tone: "warning", title: `${providerLabels[provider]} не настроен`, message: "Добавьте ключи провайдера в Layero." }); return; }
    if (provider === "telegram") { setTelegramOpen((value) => !value); return; }
    window.location.assign(`${API_BASE_URL}/auth/oauth/${provider}/link`);
  }

  async function disconnect(provider: ProviderName) {
    try { await api.delete(`/auth/oauth/${provider}`); showToast({ tone: "success", title: "Способ входа отключён", message: providerLabels[provider] }); await load(); }
    catch (error) { showToast({ tone: "error", title: "Нельзя отключить", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Сначала добавьте другой способ входа." }); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    try { const { data } = await api.post("/users/me/password", passwordForm); showToast({ tone: "success", title: "Пароль обновлён", message: data.message }); signOut(); }
    catch (error) { showToast({ tone: "error", title: "Пароль не изменён", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Проверьте пароль." }); }
  }

  async function deactivate(event: FormEvent) {
    event.preventDefault();
    try { await api.post("/users/me/deactivate", deactivation); setFarewell(true); signOut(); }
    catch (error) { showToast({ tone: "error", title: "Аккаунт не деактивирован", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Действие не подтверждено." }); }
  }

  if (farewell) return <main className="profile-page"><section className="profile-farewell"><span className="timecode">SESSION CLOSED</span><FrameIcon name="frame" /><h1>До встречи в Frame School</h1><p>Аккаунт деактивирован только после подтверждения сервера. Прогресс и сертификаты сохранены; восстановить доступ можно при следующем входе.</p><Link to="/login">Перейти ко входу</Link></section></main>;
  if (checking || loading) return <main className="profile-page"><div className="profile-state" aria-live="polite">Загружаем профиль…</div></main>;
  if (!isAuthenticated || !profile) return <main className="profile-page"><section className="profile-state"><h1>Войдите в аккаунт</h1><p>Профиль, прогресс и сертификаты хранятся на сервере.</p><Link to="/login">Войти</Link></section></main>;

  return <main className="profile-page"><header className="profile-hero"><div><span className="timecode">USER / {profile.id}</span><h1>{profile.username}</h1><p>{profile.email}</p></div><button type="button" onClick={() => { signOut(); void refreshSession(); }}>Выйти</button></header><section className="profile-metrics"><article><FrameIcon name="lessons"/><span>Завершённые уроки</span><strong>{completed}</strong></article><article><FrameIcon name="certificate"/><span>Сертификаты</span><strong>{certificates}</strong></article><article><FrameIcon name="premium"/><span>Premium</span><strong>{profile.isPremium ? profile.premiumStatus || "active" : "free"}</strong></article><article><FrameIcon name="all"/><span>Роли</span><strong>{(profile.roles || []).join(" / ") || "USER"}</strong></article></section>
    <section className="profile-grid"><article className="profile-panel"><h2>Способы входа</h2><p>Новый сервис не связывается с существующим аккаунтом только по совпавшему email.</p><div className="profile-connections">{(Object.keys(providerLabels) as ProviderName[]).map((provider) => <div key={provider}><strong>{providerLabels[provider]}</strong><span>{connected.has(provider) ? "подключён" : providers[provider]?.configured ? "доступен" : "нужна настройка"}</span>{connected.has(provider) ? <button onClick={() => void disconnect(provider)}>Отключить</button> : <button onClick={() => connect(provider)}>Подключить</button>}</div>)}</div>{telegramOpen && <div className="profile-telegram"><p>Подтвердите аккаунт Telegram.</p><div ref={telegramHost}/></div>}</article>
      <article className="profile-panel"><h2>Пароль</h2><p>{profile.oauthIdentities?.length ? "OAuth-аккаунт может задать пароль после входа." : "После изменения все прежние сессии завершатся."}</p><form onSubmit={changePassword}><label>Текущий пароль<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({...passwordForm,currentPassword:event.target.value})}/></label><label>Новый пароль<input type="password" minLength={8} maxLength={128} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({...passwordForm,newPassword:event.target.value})} required/></label><button>Обновить пароль</button></form></article>
      <article className="profile-panel profile-danger"><h2>Деактивация</h2><p>Профиль станет скрытым, сессии завершатся. Прогресс и сертификаты останутся в базе.</p><form onSubmit={deactivate}><label>Текущий пароль<input type="password" value={deactivation.password} onChange={(event) => setDeactivation({...deactivation,password:event.target.value})}/></label><label>Для OAuth-only аккаунта введите DEACTIVATE<input value={deactivation.confirmation} onChange={(event) => setDeactivation({...deactivation,confirmation:event.target.value})}/></label><button>Деактивировать аккаунт</button></form></article>
      <article className="profile-panel"><h2>Быстрые ссылки</h2><nav><Link to="/courses">Курсы</Link><Link to="/certificates">Сертификаты</Link><Link to="/reviews">Отзывы</Link><Link to="/support">Поддержка</Link></nav></article></section></main>;
}
