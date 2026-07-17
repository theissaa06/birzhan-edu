import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import OAuthButtons from "../components/OAuthButtons";
import TurnstileBox from "../components/TurnstileBox";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showRegistrationWelcome, showToast } from "../services/appToast";
import "./LoginPage.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const softwareOptions = [{ value: "capcut", label: "CapCut" }, { value: "premiere", label: "Premiere Pro" }, { value: "after-effects", label: "After Effects" }];
const levelOptions = [{ value: "beginner", label: "Новичок" }, { value: "basic", label: "Есть база" }, { value: "advanced", label: "Продвинутый" }];
const goalOptions = [{ value: "personal", label: "Для себя" }, { value: "blog", label: "Для блога" }, { value: "career", label: "Для работы" }];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthSession();
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

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanUsername || !EMAIL_RE.test(cleanEmail) || password.length < 8) {
      setError("Укажите имя, корректный email и пароль не короче 8 символов.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { data } = await api.post("/auth/register", { username: cleanUsername, name: cleanUsername, email: cleanEmail, phone: phone.trim() || undefined, password, turnstileToken: turnstileToken || undefined });
      if (!data?.token || !data?.user) throw new Error("Сервер не вернул данные сессии.");
      const onboarding = { preferredSoftware, experienceLevel, learningGoal };
      localStorage.setItem("frameSchoolOnboardingDraft", JSON.stringify(onboarding));
      signIn(data.token, data.user);
      showRegistrationWelcome(data.user);
      navigate("/profile");
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message || (requestError instanceof Error ? requestError.message : "Не удалось зарегистрироваться.");
      setError(message);
      showToast({ tone: "error", title: "Регистрация не завершена", message });
    } finally {
      setLoading(false);
    }
  }

  const choiceGroup = (legend: string, options: typeof softwareOptions, value: string, setValue: (value: string) => void) => (
    <fieldset><legend>{legend}</legend><div className="auth-choice-grid">{options.map((option) => <button key={option.value} type="button" className={value === option.value ? "auth-choice active" : "auth-choice"} aria-pressed={value === option.value} onClick={() => setValue(option.value)}>{option.label}</button>)}</div></fieldset>
  );

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <section className="auth-info" aria-labelledby="register-heading">
          <p className="auth-kicker">Создание аккаунта</p>
          <h1 id="register-heading">Начните обучение в <span className="auth-brand">Frame School</span></h1>
          <p className="auth-desc">Выберите редактор, уровень и цель — после регистрации вы получите подходящую стартовую траекторию.</p>
          <ul className="auth-benefits">
            <li><span className="auth-benefit-icon"><FrameIcon name="frame" /></span>Практический трек под ваш редактор</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="timeline" /></span>Задания вместо пассивного просмотра</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="folder" /></span>Работы складываются в портфолио</li>
            <li><span className="auth-benefit-icon"><FrameIcon name="certificate" /></span>Проверяемые сертификаты</li>
          </ul>
        </section>

        <section className="auth-card auth-card--wide" aria-labelledby="register-form-heading">
          <h2 id="register-form-heading">Регистрация</h2>
          <p className="auth-card-sub">Заполните данные или выберите сервис для быстрой регистрации.</p>
          <form className="auth-form" onSubmit={handleRegister}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label className="auth-field"><span>Имя пользователя</span><input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Например, Ислам" required /></label>
            <label className="auth-field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-invalid={Boolean(email) && !EMAIL_RE.test(email.trim())} placeholder="name@example.com" required /></label>
            <label className="auth-field"><span>Телефон <em className="auth-optional">необязательно</em></span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="+7 777 000 00 00" /></label>
            <label className="auth-field"><span>Пароль</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} placeholder="От 8 символов" required /><small className={password.length >= 8 ? "auth-field-hint success" : "auth-field-hint"}>{password.length >= 8 ? "Длина пароля подходит." : "Используйте от 8 до 128 символов."}</small></label>
            <div className="auth-onboarding"><div className="auth-onboarding-head"><span>Стартовая траектория</span><strong>Ответы можно изменить позже в профиле.</strong></div>{choiceGroup("Какой редактор хотите освоить?", softwareOptions, preferredSoftware, setPreferredSoftware)}{choiceGroup("Ваш уровень", levelOptions, experienceLevel, setExperienceLevel)}{choiceGroup("Зачем вам монтаж?", goalOptions, learningGoal, setLearningGoal)}</div>
            <TurnstileBox onVerify={setTurnstileToken} />
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Создаём аккаунт…" : "Зарегистрироваться"}</button>
          </form>
          <OAuthButtons action="Зарегистрироваться" />
          <p className="auth-footer-link">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </section>
      </div>
    </main>
  );
}
