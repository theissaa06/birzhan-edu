import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import api from "../services/api";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError("Введите email и пароль.");
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setError("Подтвердите, что вы не бот.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
        turnstileToken: captchaToken,
      });

      const data = response.data;
      const token = data.token || data.accessToken || data.data?.token;
      const user = data.user || data.data?.user;

      if (token) {
        localStorage.setItem("token", token);
      }

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      navigate(user?.role === "ADMIN" ? "/admin" : "/courses");
    } catch (err: any) {
      console.error("Ошибка входа:", err);

      const message =
        err?.response?.data?.message ||
        "Не удалось войти. Проверь email, пароль и backend.";

      setError(message);
      setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-info">
          <p className="login-label">Вход в аккаунт</p>

          <h1>
            Добро пожаловать обратно в <span>Birzhan-Edu</span>
          </h1>

          <p>
            Войдите в аккаунт, чтобы продолжить обучение, открыть курсы,
            проходить уроки, получать бонусы и управлять своим прогрессом.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-head">
            <h2>Войти</h2>
            <p>Введите email и пароль от аккаунта.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              autoComplete="email"
            />
          </label>

          <label>
            Пароль
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Введите пароль"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {turnstileSiteKey && (
            <div className="login-turnstile">
              <div className="login-turnstile-title">
                🛡️ Проверка безопасности
              </div>

              <div className="login-turnstile-box">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token: string) => {
                    setCaptchaToken(token);
                    setError("");
                  }}
                  onExpire={() => setCaptchaToken("")}
                  onError={() => setCaptchaToken("")}
                />
              </div>

              <p className="login-turnstile-note">
                Мы защищаем аккаунты от спама и автоматических ботов.
              </p>
            </div>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>

          <p className="login-bottom">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
