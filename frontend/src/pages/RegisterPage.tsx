import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
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
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      setError("Не удалось зарегистрироваться. Проверь backend или email.");
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
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Минимум 6 символов"
              autoComplete="new-password"
            />
          </label>

          <label>
            Повторите пароль
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите пароль"
              autoComplete="new-password"
            />
          </label>

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
