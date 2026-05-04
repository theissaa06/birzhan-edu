import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", form);

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
    } catch (err) {
      console.error("Ошибка входа:", err);
      setError("Не удалось войти. Проверь email, пароль и backend.");
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

          <div className="login-demo">
            <strong>Подсказка для проверки</strong>
            <span>
              Если backend уже настроен, используйте данные созданного
              пользователя или админа.
            </span>
          </div>
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
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
          </label>

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
