import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TurnstileBox from "../components/TurnstileBox";
import "./LoginPage.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";
const API_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Введите email и пароль.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          turnstileToken: turnstileToken || "bypass",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Неверный email или пароль.");
      }

      const token = data.token || data.data?.token;
      const user = data.user || data.data?.user;

      if (token) localStorage.setItem("token", token);

      const finalUser = user || {
        email: cleanEmail,
        username: cleanEmail.split("@")[0],
        role: "USER",
      };

      localStorage.setItem("user", JSON.stringify(finalUser));
      localStorage.setItem("currentUser", JSON.stringify(finalUser));

      // Диспатчим событие чтобы Header обновился
      window.dispatchEvent(new Event("storage"));

      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        {/* Левая панель — информация */}
        <div className="auth-info">
          <p className="auth-kicker">Вход в аккаунт</p>

          <h1>
            Вернись к обучению на{" "}
            <span className="auth-brand">Birzhan-Edu</span>
          </h1>

          <p className="auth-desc">
            Войди, чтобы продолжить курсы, отслеживать прогресс и получать
            сертификаты после завершения обучения.
          </p>

          <ul className="auth-benefits">
            <li>
              <span className="auth-benefit-icon">🎬</span>
              Продолжение уроков с места остановки
            </li>
            <li>
              <span className="auth-benefit-icon">📈</span>
              Прогресс по каждому курсу
            </li>
            <li>
              <span className="auth-benefit-icon">🎁</span>
              Доступ к бонусным материалам
            </li>
            <li>
              <span className="auth-benefit-icon">🎓</span>
              Сертификаты в личном кабинете
            </li>
          </ul>
        </div>

        {/* Правая панель — форма */}
        <div className="auth-card">
          <h2>Войти</h2>
          <p className="auth-card-sub">Введите email и пароль от аккаунта.</p>

          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error">{error}</div>}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>Пароль</span>
              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <TurnstileBox onVerify={setTurnstileToken} />

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>

          <p className="auth-footer-link">
            Нет аккаунта?{" "}
            <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
