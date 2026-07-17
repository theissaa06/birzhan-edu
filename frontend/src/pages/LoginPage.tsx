import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import OAuthButtons from "../components/OAuthButtons";
import TurnstileBox from "../components/TurnstileBox";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showLoginWelcome, showToast } from "../services/appToast";
import "./LoginPage.css";

type AuthResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  token?: string;
  user?: Record<string, unknown>;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [deactivated, setDeactivated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("oauth_code");
    const oauthError = searchParams.get("oauth_error");

    if (oauthError) {
      const message = oauthError === "link_required"
        ? "Этот email уже принадлежит аккаунту. Войдите обычным способом и подключите сервис в профиле."
        : "Внешний сервис не подтвердил вход. Попробуйте ещё раз.";
      setError(message);
      showToast({ tone: "error", title: "OAuth-вход", message });
      setSearchParams({}, { replace: true });
      return;
    }

    if (!code) return;
    let active = true;
    setLoading(true);
    api.post<AuthResponse>("/auth/oauth/exchange", { code })
      .then(({ data }) => {
        if (!active || !data.token || !data.user) throw new Error("Сервер не подтвердил OAuth-сессию.");
        signIn(data.token, data.user);
        showLoginWelcome(data.user);
        navigate("/profile", { replace: true });
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError?.response?.data?.message || requestError?.message || "Одноразовый код входа недействителен.";
        setError(message);
        showToast({ tone: "error", title: "OAuth-вход", message });
        setSearchParams({}, { replace: true });
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [navigate, searchParams, setSearchParams, signIn]);

  async function submit(endpoint: "/auth/login" | "/auth/reactivate") {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Введите email и пароль.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { data } = await api.post<AuthResponse>(endpoint, {
        email: cleanEmail,
        password,
        turnstileToken: turnstileToken || undefined,
      });
      if (!data.token || !data.user) throw new Error("Сервер не вернул данные сессии.");
      signIn(data.token, data.user);
      showLoginWelcome(data.user);
      if (endpoint === "/auth/reactivate") {
        showToast({ tone: "success", title: "Аккаунт восстановлен", message: "Прогресс и сертификаты снова доступны." });
      }
      navigate("/profile");
    } catch (requestError) {
      const response = requestError as { response?: { data?: AuthResponse } };
      const code = response.response?.data?.code;
      const message = response.response?.data?.message || (requestError instanceof Error ? requestError.message : "Ошибка входа.");
      setDeactivated(code === "ACCOUNT_DEACTIVATED");
      setError(message);
      showToast({ tone: "error", title: code === "ACCOUNT_DEACTIVATED" ? "Аккаунт деактивирован" : "Не удалось войти", message });
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("/auth/login");
  }

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <section className="auth-info" aria-labelledby="login-heading">
          <p className="auth-kicker">Вход в аккаунт</p>
          <h1 id="login-heading">Вернитесь к обучению в <span className="auth-brand">Frame School</span></h1>
          <p className="auth-desc">Продолжайте практику с сохранённого места, отслеживайте прогресс и собирайте портфолио.</p>
          <ul className="auth-benefits">
            <li><span className="auth-benefit-icon"><FrameIcon name="timeline" /></span>Уроки продолжаются с места остановки</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="lessons" /></span>Прогресс хранится на сервере</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="premium" /></span>Premium-материалы привязаны к аккаунту</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="certificate" /></span>Сертификаты доступны в профиле</li>
          </ul>
        </section>

        <section className="auth-card" aria-labelledby="login-form-heading">
          <h2 id="login-form-heading">Войти</h2>
          <p className="auth-card-sub">Введите email и пароль или выберите подключённый сервис.</p>
          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label className="auth-field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" required /></label>
            <label className="auth-field"><span>Пароль</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Введите пароль" required /></label>
            <TurnstileBox onVerify={setTurnstileToken} />
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Проверяем…" : "Войти"}</button>
            {deactivated && <button type="button" className="auth-secondary" disabled={loading} onClick={() => void submit("/auth/reactivate")}>Восстановить аккаунт</button>}
          </form>
          <OAuthButtons action="Войти" />
          <p className="auth-footer-link"><Link to="/forgot-password">Забыли пароль?</Link></p>
          <p className="auth-footer-link">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </section>
      </div>
    </main>
  );
}
