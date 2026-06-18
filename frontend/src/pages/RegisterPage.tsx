import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TurnstileBox from "../components/TurnstileBox";
import "./RegisterPage.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";
const API_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanEmail || !cleanPassword) {
      setError("Заполни имя, email и пароль.");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("Пароль должен быть минимум 6 символов.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          name: cleanUsername,
          email: cleanEmail,
          phone: cleanPhone || undefined,
          password: cleanPassword,
          turnstileToken: turnstileToken || "bypass",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Не удалось зарегистрироваться.");
      }

      const token = data.token || data.data?.token;
      const user = data.user || data.data?.user;

      if (token) localStorage.setItem("token", token);

      const finalUser = user || {
        username: cleanUsername,
        email: cleanEmail,
        role: "USER",
      };

      localStorage.setItem("user", JSON.stringify(finalUser));
      localStorage.setItem("currentUser", JSON.stringify(finalUser));

      // Диспатчим событие чтобы Header обновился
      window.dispatchEvent(new Event("storage"));

      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        {/* Левая панель — информация */}
        <div className="auth-info">
          <p className="auth-kicker">Создание аккаунта</p>

          <h1>
            Начни обучение на{" "}
            <span className="auth-brand">Birzhan-Edu</span>
          </h1>

          <p className="auth-desc">
            Зарегистрируйся, чтобы сохранять прогресс, получать бонусы и
            открывать сертификаты после завершения курса.
          </p>

          <ul className="auth-benefits">
            <li>
              <span className="auth-benefit-icon">🎬</span>
              Доступ к курсам по монтажу
            </li>
            <li>
              <span className="auth-benefit-icon">📈</span>
              Сохранение прогресса обучения
            </li>
            <li>
              <span className="auth-benefit-icon">🎁</span>
              Бонусы после прохождения курса
            </li>
            <li>
              <span className="auth-benefit-icon">🎓</span>
              Сертификаты в личном кабинете
            </li>
          </ul>
        </div>

        {/* Правая панель — форма */}
        <div className="auth-card">
          <h2>Регистрация</h2>
          <p className="auth-card-sub">Создай аккаунт ученика платформы.</p>

          <form className="auth-form" onSubmit={handleRegister}>
            {error && <div className="auth-error">{error}</div>}

            <label className="auth-field">
              <span>Имя пользователя</span>
              <input
                type="text"
                placeholder="Например: Islam"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

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
              <span>Телефон <em className="auth-optional">(необязательно)</em></span>
              <input
                type="tel"
                placeholder="+7 777 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>

            <label className="auth-field">
              <span>Пароль</span>
              <input
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <TurnstileBox onVerify={setTurnstileToken} />

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </button>
          </form>

          <p className="auth-footer-link">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
