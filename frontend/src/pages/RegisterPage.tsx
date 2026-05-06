import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import api from "../services/api";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Заполните все поля.");
      return;
    }

    if (form.password.length < 6) {
      setError("Пароль должен быть минимум 6 символов.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setError("Подтвердите, что вы не бот.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/register", {
        name: form.name,
        username: form.name,
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

      navigate("/courses");
    } catch (err: any) {
      console.error("Ошибка регистрации:", err);

      const message =
        err?.response?.data?.message ||
        "Не удалось зарегистрироваться. Проверь backend или email.";

      setError(message);
      setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-info">
          <p className="register-label">Создание аккаунта</p>

          <h1>
            Начните обучение на <span>Birzhan-Edu</span>
          </h1>

          <p>
            Создайте аккаунт, чтобы открыть курсы, проходить уроки, сохранять
            прогресс, получать бонусы и пользоваться возможностями платформы.
          </p>

          <div className="register-benefits">
            <div>
              <span>✓</span>
              Доступ к каталогу курсов
            </div>
            <div>
              <span>✓</span>
              Уроки и практические задания
            </div>
            <div>
              <span>✓</span>
              Бонусы, вебинары и карьерные материалы
            </div>
          </div>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form-head">
            <h2>Регистрация</h2>
            <p>Заполните данные для создания аккаунта.</p>
          </div>

          {error && <div className="register-error">{error}</div>}

          <label>
            Имя
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Ваше имя"
              autoComplete="name"
            />
          </label>

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
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
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

          <label>
            Повторите пароль
            <div className="password-field">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
                }
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {turnstileSiteKey && (
            <div className="register-turnstile">
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={(token: string) => {
                  setCaptchaToken(token);
                  setError("");
                }}
                onExpire={() => setCaptchaToken("")}
                onError={() => setCaptchaToken("")}
              />

              <div className="register-turnstile-note">
                <strong>Защита аккаунта</strong>
                Регистрация защищена от автоматических ботов и спама.
              </div>
            </div>
          )}

          <button className="register-submit" type="submit" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>

          <p className="register-bottom">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
