import { Link, useNavigate } from "react-router-dom";
import "./ProfilePage.css";

type User = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
};

const progressItems = [
  {
    title: "CapCut с нуля до PRO",
    progress: 72,
    lessons: "4 из 6 уроков",
    icon: "✂️",
  },
  {
    title: "TikTok Edit",
    progress: 45,
    lessons: "2 из 5 уроков",
    icon: "📱",
  },
  {
    title: "Premiere Pro",
    progress: 18,
    lessons: "1 из 8 уроков",
    icon: "🎞️",
  },
];

const bonuses = [
  "AI-пак для монтажа 2026",
  "CapCut Presets Pack",
  "Чек-лист TikTok-эдита",
  "Шаблон портфолио",
];

export default function ProfilePage() {
  const navigate = useNavigate();

  const savedUser = localStorage.getItem("user");
  const user: User | null = savedUser ? JSON.parse(savedUser) : null;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__content">
          <p className="profile-label">Личный кабинет</p>

          <h1>
            Добро пожаловать,{" "}
            <span>{user?.username || user?.name || "студент"}</span>
          </h1>

          <p>
            Здесь отображается ваш прогресс обучения, бонусы, быстрые ссылки и
            информация об аккаунте.
          </p>

          <div className="profile-actions">
            <Link to="/courses" className="profile-btn profile-btn--primary">
              Продолжить обучение
            </Link>

            <button className="profile-btn profile-btn--light" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            {(user?.username || user?.name || "U").slice(0, 1).toUpperCase()}
          </div>

          <strong>{user?.username || user?.name || "Пользователь"}</strong>
          <span>{user?.email || "email не указан"}</span>
          <em>{user?.role || "USER"}</em>
        </div>
      </section>

      <section className="profile-stats">
        <div>
          <strong>3</strong>
          <span>активных курса</span>
        </div>

        <div>
          <strong>7</strong>
          <span>пройденных уроков</span>
        </div>

        <div>
          <strong>{bonuses.length}</strong>
          <span>полученных бонусов</span>
        </div>

        <div>
          <strong>45%</strong>
          <span>общий прогресс</span>
        </div>
      </section>

      <section className="profile-layout">
        <div className="profile-main">
          <section className="profile-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Прогресс</p>
              <h2>Мои курсы</h2>
            </div>

            <div className="profile-course-list">
              {progressItems.map((item) => (
                <article className="profile-course-card" key={item.title}>
                  <div className="profile-course-icon">{item.icon}</div>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.lessons}</p>

                    <div className="profile-progress">
                      <div>
                        <span style={{ width: `${item.progress}%` }}></span>
                      </div>
                      <strong>{item.progress}%</strong>
                    </div>
                  </div>

                  <Link to="/courses">Открыть</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Бонусы</p>
              <h2>Мои материалы</h2>
            </div>

            <div className="profile-bonus-grid">
              {bonuses.map((bonus) => (
                <div className="profile-bonus-card" key={bonus}>
                  <span>🎁</span>
                  <strong>{bonus}</strong>
                  <p>Доступно в личном кабинете</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="profile-sidebar">
          <section className="profile-panel">
            <p className="profile-label">Аккаунт</p>
            <h2>Данные</h2>

            <div className="profile-info-list">
              <div>
                <span>Имя</span>
                <strong>{user?.username || user?.name || "Не указано"}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{user?.email || "Не указано"}</strong>
              </div>

              <div>
                <span>Роль</span>
                <strong>{user?.role || "USER"}</strong>
              </div>
            </div>
          </section>

          <section className="profile-panel profile-quick">
            <p className="profile-label">Быстрые ссылки</p>
            <h2>Навигация</h2>

            <Link to="/courses">🎬 Курсы</Link>
            <Link to="/bonus">🎁 Бонусы</Link>
            <Link to="/free/webinars">🎙️ Вебинары</Link>
            <Link to="/career-center">🚀 Центр карьеры</Link>
            <Link to="/support">💬 Поддержка</Link>
          </section>

          {user?.role === "ADMIN" && (
            <section className="profile-panel profile-admin-box">
              <p className="profile-label">Admin</p>
              <h2>Управление</h2>
              <p>У вас есть доступ к админ-панели.</p>

              <Link to="/admin" className="profile-btn profile-btn--primary">
                Открыть админку
              </Link>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
