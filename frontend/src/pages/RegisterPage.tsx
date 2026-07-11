import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TurnstileBox from "../components/TurnstileBox";
import "./RegisterPage.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";
const API_URL = RAW_API_URL.replace(/\/api\/?$/, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const softwareOptions = [
  { value: "capcut", label: "CapCut" },
  { value: "premiere", label: "Premiere Pro" },
  { value: "after-effects", label: "After Effects" },
];

const levelOptions = [
  { value: "beginner", label: "Новичок" },
  { value: "basic", label: "Что-то умею" },
  { value: "advanced", label: "Хочу сильный уровень" },
];

const goalOptions = [
  { value: "personal", label: "Для себя" },
  { value: "blog", label: "Для блога" },
  { value: "career", label: "Для работы" },
];

function getRecommendedTrack(software: string, level: string, goal: string) {
  const tool =
    softwareOptions.find((item) => item.value === software)?.label || "CapCut";

  if (goal === "career") {
    return `Профессия: видеомонтажёр — старт с ${tool}`;
  }

  if (level === "beginner") {
    return `Первый монтаж за 10 минут в ${tool}`;
  }

  return `Практический трек ${tool}: портфолио и разборы`;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [preferredSoftware, setPreferredSoftware] = useState("capcut");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [learningGoal, setLearningGoal] = useState("blog");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailIsFilled = email.trim().length > 0;
  const emailLooksValid = !emailIsFilled || EMAIL_RE.test(email.trim());
  const passwordIsStrongEnough = password.length >= 6;
  const recommendedTrack = getRecommendedTrack(
    preferredSoftware,
    experienceLevel,
    learningGoal,
  );

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

    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Введи корректный email.");
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

      const onboarding = {
        preferredSoftware,
        experienceLevel,
        learningGoal,
        recommendedTrack,
      };

      localStorage.setItem("user", JSON.stringify(finalUser));
      localStorage.setItem("currentUser", JSON.stringify(finalUser));
      localStorage.setItem("frameSchoolOnboarding", JSON.stringify(onboarding));

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
            <span className="auth-brand">Frame School</span>
          </h1>

          <p className="auth-desc">
            Регистрация сразу подбирает первый практический трек: выбери софт,
            уровень и цель, а платформа покажет, с какого задания начать.
          </p>

          <div className="auth-progress" aria-label="Прогресс регистрации">
            <span className="active">1. Аккаунт</span>
            <span className="active">2. Цель</span>
            <span>3. Первый урок</span>
          </div>

          <ul className="auth-benefits">
            <li>
              <span className="auth-benefit-icon">🎬</span>
              Первый трек под твой редактор
            </li>
            <li>
              <span className="auth-benefit-icon">📈</span>
              Практические задания вместо пассивного просмотра
            </li>
            <li>
              <span className="auth-benefit-icon">🎁</span>
              Работы постепенно складываются в портфолио
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
          <p className="auth-card-sub">
            Создай аккаунт и выбери стартовую траекторию.
          </p>

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
                aria-invalid={!emailLooksValid}
                required
              />
              {!emailLooksValid && (
                <small className="auth-field-hint error">
                  Email должен быть в формате name@example.com.
                </small>
              )}
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
              <small
                className={
                  passwordIsStrongEnough
                    ? "auth-field-hint success"
                    : "auth-field-hint"
                }
              >
                {passwordIsStrongEnough
                  ? "Пароль подходит."
                  : "Минимум 6 символов для безопасного входа."}
              </small>
            </label>

            <div className="auth-onboarding">
              <div className="auth-onboarding-head">
                <span>Мини-опрос</span>
                <strong>{recommendedTrack}</strong>
              </div>

              <fieldset>
                <legend>Какой софт хочешь освоить?</legend>
                <div className="auth-choice-grid">
                  {softwareOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        preferredSoftware === option.value
                          ? "auth-choice active"
                          : "auth-choice"
                      }
                      onClick={() => setPreferredSoftware(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Твой уровень</legend>
                <div className="auth-choice-grid">
                  {levelOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        experienceLevel === option.value
                          ? "auth-choice active"
                          : "auth-choice"
                      }
                      onClick={() => setExperienceLevel(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Зачем тебе монтаж?</legend>
                <div className="auth-choice-grid">
                  {goalOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        learningGoal === option.value
                          ? "auth-choice active"
                          : "auth-choice"
                      }
                      onClick={() => setLearningGoal(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

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
