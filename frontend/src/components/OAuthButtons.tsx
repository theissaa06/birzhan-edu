import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../services/api";
import { showLoginWelcome, showToast } from "../services/appToast";
import { useAuthSession } from "./AuthSessionProvider";
import "./OAuthButtons.css";

type ProviderName = "google" | "apple" | "telegram" | "vk";
type ProviderState = { configured: boolean; startUrl?: string | null; botName?: string | null };
type Providers = Record<ProviderName, ProviderState>;
type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string };

declare global {
  interface Window { frameSchoolTelegramAuth?: (user: TelegramUser) => void }
}

const emptyProviders: Providers = {
  google: { configured: false },
  apple: { configured: false },
  telegram: { configured: false },
  vk: { configured: false },
};

const labels: Record<ProviderName, string> = { google: "Google", apple: "Apple ID", telegram: "Telegram", vk: "VK" };
const marks: Record<ProviderName, string> = { google: "G", apple: "A", telegram: "TG", vk: "VK" };

export default function OAuthButtons({ action = "Войти" }: { action?: "Войти" | "Зарегистрироваться" }) {
  const [providers, setProviders] = useState<Providers>(emptyProviders);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [loading, setLoading] = useState<ProviderName | null>(null);
  const telegramHost = useRef<HTMLDivElement>(null);
  const { signIn } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/oauth/providers")
      .then((response) => setProviders({ ...emptyProviders, ...(response.data?.data || {}) }))
      .catch(() => showToast({ tone: "warning", title: "OAuth временно недоступен", message: "Не удалось получить конфигурацию способов входа." }));
  }, []);

  const configuredCount = useMemo(() => Object.values(providers).filter((provider) => provider.configured).length, [providers]);

  useEffect(() => {
    const host = telegramHost.current;
    if (!telegramOpen || !providers.telegram.configured || !providers.telegram.botName || !host) return;

    window.frameSchoolTelegramAuth = async (user) => {
      try {
        setLoading("telegram");
        const verified = await api.post("/auth/oauth/telegram/verify", user);
        const exchanged = await api.post("/auth/oauth/exchange", { code: verified.data?.code });
        if (!exchanged.data?.token || !exchanged.data?.user) throw new Error("Сервер не подтвердил Telegram-сессию.");
        signIn(exchanged.data.token, exchanged.data.user);
        showLoginWelcome(exchanged.data.user);
        navigate("/profile");
      } catch (requestError) {
        const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message || (requestError instanceof Error ? requestError.message : "Не удалось подтвердить вход через Telegram.");
        showToast({ tone: "error", title: "Telegram", message });
      } finally {
        setLoading(null);
      }
    };

    host.replaceChildren();
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", providers.telegram.botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-radius", "4");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "frameSchoolTelegramAuth(user)");
    host.appendChild(script);
    return () => { delete window.frameSchoolTelegramAuth; };
  }, [navigate, providers.telegram.botName, providers.telegram.configured, signIn, telegramOpen]);

  function begin(provider: ProviderName) {
    if (!providers[provider].configured) {
      showToast({ tone: "warning", title: `${labels[provider]} пока недоступен`, message: "Для этого провайдера ещё не добавлены ключи в настройках Layero." });
      return;
    }
    if (provider === "telegram") {
      setTelegramOpen((value) => !value);
      return;
    }
    setLoading(provider);
    window.location.assign(`${API_BASE_URL}/auth/oauth/${provider}/start?redirect=${encodeURIComponent("/profile")}`);
  }

  return (
    <section className="oauth-block" aria-label={`${action} через внешний сервис`}>
      <div className="oauth-divider"><span>или</span></div>
      <div className="oauth-grid">
        {(Object.keys(labels) as ProviderName[]).map((provider) => (
          <button key={provider} type="button" className={`oauth-button oauth-button--${provider}`} onClick={() => begin(provider)} aria-disabled={!providers[provider].configured} aria-describedby={!providers[provider].configured ? "oauth-config-note" : undefined}>
            <span aria-hidden="true">{marks[provider]}</span>
            {loading === provider ? "Подключаем…" : `${action} через ${labels[provider]}`}
            {!providers[provider].configured && <small>нужна настройка</small>}
          </button>
        ))}
      </div>
      {telegramOpen && providers.telegram.configured && <div className="telegram-widget-panel"><p>Подтвердите аккаунт в защищённом окне Telegram.</p><div ref={telegramHost} /></div>}
      {configuredCount === 0 && <p id="oauth-config-note" className="oauth-configuration-note">Все четыре кнопки готовы. Вход включится после добавления OAuth-ключей в Layero.</p>}
    </section>
  );
}
