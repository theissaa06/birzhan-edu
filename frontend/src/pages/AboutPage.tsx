import { Link } from "react-router-dom";
import "./AboutPage.css";

const values = [
  {
    icon: "🎬",
    title: "Обучение через практику",
    text: "Каждый урок построен так, чтобы студент не просто смотрел, а сразу повторял действия и создавал свои работы.",
  },
  {
    icon: "🌍",
    title: "Международный подход",
    text: "Платформа создаётся как современная EdTech-система для обучения видеомонтажу, digital-навыкам и контенту.",
  },
  {
    icon: "🚀",
    title: "Рост до профессии",
    text: "Наша цель — помочь новичку пройти путь от первого видео до портфолио и первых заказов.",
  },
  {
    icon: "💬",
    title: "Поддержка студентов",
    text: "Пользователь может получать помощь, задавать вопросы и двигаться по обучению без ощущения, что он один.",
  },
];

const features = [
  "Курсы по CapCut, Premiere Pro, TikTok, Reels, YouTube и VFX",
  "Видеоуроки с пошаговыми объяснениями",
  "Практические задания после уроков",
  "Прогресс обучения и отметка пройденных уроков",
  "Бонусы 2026: пресеты, LUT, чек-листы, AI-паки",
  "Карьерное развитие и подготовка портфолио",
];

const stats = [
  { value: "40+", label: "курсов и уроков" },
  { value: "15 000+", label: "потенциальных студентов" },
  { value: "8+", label: "бонусов 2026" },
  { value: "4.9", label: "целевая оценка платформы" },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero__content">
          <p className="about-label">О Frame School</p>

          <h1>
            Международная платформа для обучения <span>видеомонтажу</span>
          </h1>

          <p>
            Frame School — это образовательная онлайн-платформа нового
            поколения, где студенты изучают монтаж, эдиты, CapCut, Premiere Pro,
            цветокоррекцию, звук, VFX и создание контента для TikTok, YouTube,
            Reels и Shorts.
          </p>

          <div className="about-actions">
            <Link to="/courses" className="about-btn about-btn--primary">
              Смотреть курсы
            </Link>

            <Link to="/bonus" className="about-btn about-btn--light">
              Получить бонус
            </Link>
          </div>
        </div>

        <div className="about-hero__visual">
          <div className="about-big-icon">🎥</div>
          <div className="about-floating-card about-floating-card--one">
            CapCut PRO
          </div>
          <div className="about-floating-card about-floating-card--two">
            Premiere Pro
          </div>
          <div className="about-floating-card about-floating-card--three">
            TikTok Edit
          </div>
        </div>
      </section>

      <section className="about-stats">
        {stats.map((item) => (
          <div className="about-stat-card" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="about-section">
        <div className="about-section__head">
          <p className="about-label">Наша миссия</p>
          <h2>Помочь новичкам освоить монтаж и выйти на реальный результат</h2>
          <p>
            Мы делаем обучение понятным, современным и практичным. Студент
            должен не просто прочитать теорию, а научиться создавать видео,
            выполнять задания, собирать портфолио и развиваться как
            digital-специалист.
          </p>
        </div>

        <div className="about-values">
          {values.map((item) => (
            <article className="about-value-card" key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-dark">
        <div>
          <p className="about-label about-label--dark">Что внутри платформы</p>
          <h2>
            Не просто сайт с курсами, а полноценная образовательная система
          </h2>
          <p>
            Платформа объединяет каталог курсов, уроки, видео, практику, бонусы,
            поддержку, карьерные разделы и личный прогресс студента.
          </p>
        </div>

        <div className="about-feature-list">
          {features.map((feature) => (
            <div key={feature}>
              <span>✓</span>
              <p>{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-roadmap">
        <div className="about-section__head">
          <p className="about-label">Развитие</p>
          <h2>Куда будет развиваться Frame School</h2>
        </div>

        <div className="about-roadmap-grid">
          <article>
            <span>01</span>
            <h3>Больше курсов</h3>
            <p>
              Добавление новых направлений: After Effects, Motion Design,
              YouTube-монтаж, рекламные ролики и монтаж для блогеров.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>Личный кабинет</h3>
            <p>
              Прогресс, сохранённые уроки, полученные бонусы, сертификаты и
              история обучения.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>Комьюнити</h3>
            <p>
              Сообщество студентов, челленджи, разборы работ, совместные проекты
              и поддержка.
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>Карьера</h3>
            <p>
              Помощь с портфолио, первыми заказами, поиском клиентов и выходом
              на доход через монтаж.
            </p>
          </article>
        </div>
      </section>

      <section className="about-final">
        <h2>
          Frame School — платформа для тех, кто хочет создавать сильный контент
        </h2>
        <p>
          Начните с первого курса, пройдите уроки, выполните практику и соберите
          первые работы для портфолио.
        </p>

        <Link to="/courses" className="about-btn about-btn--primary">
          Начать обучение →
        </Link>
      </section>
    </main>
  );
}
