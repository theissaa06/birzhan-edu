import { Link } from "react-router-dom";
import "./WebinarsPage.css";

const upcomingWebinars = [
  {
    date: "15 мая 2026",
    time: "19:00",
    title: "Как начать монтаж с нуля в 2026 году",
    text: "Разберём, с чего начать новичку, какие программы выбрать и как собрать первый ролик.",
    tag: "Для новичков",
  },
  {
    date: "22 мая 2026",
    time: "19:00",
    title: "TikTok / Reels эдиты: монтаж под бит",
    text: "Покажем, как делать динамичные короткие видео: музыка, нарезка, zoom, shake и flash.",
    tag: "Практика",
  },
  {
    date: "29 мая 2026",
    time: "19:00",
    title: "Первые заказы на монтаже",
    text: "Обсудим портфолио, поиск клиентов, оформление услуг и первые шаги во фрилансе.",
    tag: "Карьера",
  },
];

const records = [
  {
    icon: "✂️",
    title: "CapCut с нуля",
    text: "Запись вебинара о базовом монтаже, переходах, тексте, музыке и экспорте.",
  },
  {
    icon: "🎞️",
    title: "Premiere Pro для старта",
    text: "Как создать проект, импортировать видео, нарезать материал и экспортировать ролик.",
  },
  {
    icon: "🎨",
    title: "Цветокоррекция для новичков",
    text: "Контраст, насыщенность, температура, cinematic look и базовые LUT-настройки.",
  },
  {
    icon: "🤖",
    title: "AI для видеомонтажа",
    text: "Как использовать AI для идей, сценариев, описаний, хуков и контент-плана.",
  },
];

export default function WebinarsPage() {
  return (
    <main className="webinars-page">
      <section className="webinars-hero">
        <div className="webinars-hero__content">
          <Link to="/free" className="webinars-back">
            ← Назад в бесплатный раздел
          </Link>

          <p className="webinars-label">Бесплатные вебинары</p>

          <h1>
            Онлайн-встречи по монтажу, контенту и <span>digital-навыкам</span>
          </h1>

          <p>
            Участвуйте в бесплатных вебинарах Birzhan-Edu: изучайте монтаж,
            CapCut, Premiere Pro, TikTok-эдиты, карьеру и современные
            AI-инструменты.
          </p>

          <div className="webinars-actions">
            <a href="#upcoming" className="webinars-btn webinars-btn--primary">
              Записаться на вебинар
            </a>

            <Link to="/courses" className="webinars-btn webinars-btn--light">
              Смотреть курсы
            </Link>
          </div>
        </div>

        <div className="webinars-hero__visual">
          <div className="webinars-main-icon">🎙️</div>
          <div className="webinars-float webinars-float--one">Live</div>
          <div className="webinars-float webinars-float--two">Практика</div>
          <div className="webinars-float webinars-float--three">0 ₸</div>
        </div>
      </section>

      <section className="webinars-upcoming" id="upcoming">
        <div className="webinars-section-head">
          <p className="webinars-label">Ближайшие встречи</p>
          <h2>Расписание бесплатных вебинаров</h2>
          <p>
            Выберите интересную тему и оставьте заявку. После регистрации можно
            перейти к курсам и продолжить обучение.
          </p>
        </div>

        <div className="webinars-list">
          {upcomingWebinars.map((webinar) => (
            <article className="webinar-card" key={webinar.title}>
              <div className="webinar-date">
                <strong>{webinar.date}</strong>
                <span>{webinar.time}</span>
              </div>

              <div className="webinar-info">
                <span>{webinar.tag}</span>
                <h3>{webinar.title}</h3>
                <p>{webinar.text}</p>
              </div>

              <Link to="/register" className="webinar-card-btn">
                Записаться →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="webinars-dark">
        <div>
          <p className="webinars-label webinars-label--dark">Что вы получите</p>
          <h2>Не просто теория, а понятный план действий</h2>
          <p>
            На вебинарах мы показываем реальные шаги: как открыть проект, как
            собрать ролик, какие ошибки не делать и как развиваться дальше.
          </p>
        </div>

        <div className="webinars-checklist">
          <div>
            <span>✓</span>
            <p>Понятные объяснения для новичков</p>
          </div>
          <div>
            <span>✓</span>
            <p>Практические примеры и разборы</p>
          </div>
          <div>
            <span>✓</span>
            <p>Советы по программам и инструментам</p>
          </div>
          <div>
            <span>✓</span>
            <p>Путь к курсам, портфолио и первым заказам</p>
          </div>
        </div>
      </section>

      <section className="webinars-records">
        <div className="webinars-section-head">
          <p className="webinars-label">Записи вебинаров</p>
          <h2>Посмотрите полезные материалы в записи</h2>
        </div>

        <div className="webinars-records-grid">
          {records.map((record) => (
            <article className="webinar-record-card" key={record.title}>
              <div>{record.icon}</div>
              <h3>{record.title}</h3>
              <p>{record.text}</p>
              <Link to="/courses">Перейти к теме →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="webinars-faq-section">
        <div className="webinars-section-head">
          <p className="webinars-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="webinars-faq">
          <details open>
            <summary>Вебинары бесплатные?</summary>
            <p>
              Да, этот раздел создан как бесплатный вход в платформу
              Birzhan-Edu. Можно посмотреть материалы и выбрать дальнейший курс.
            </p>
          </details>

          <details>
            <summary>Нужен ли опыт?</summary>
            <p>
              Нет. Темы объясняются с нуля: что такое монтаж, как начать, какие
              программы выбрать и как сделать первый результат.
            </p>
          </details>

          <details>
            <summary>Будут ли записи?</summary>
            <p>
              Да, часть вебинаров можно оформить как записи и использовать для
              повторения материала.
            </p>
          </details>

          <details>
            <summary>Что делать после вебинара?</summary>
            <p>
              Лучше выбрать курс в каталоге, пройти уроки и закрепить материал
              практическими заданиями.
            </p>
          </details>
        </div>
      </section>

      <section className="webinars-final">
        <h2>Готовы перейти от вебинара к практике?</h2>
        <p>
          Выберите курс, начните обучение и соберите первые работы для
          портфолио.
        </p>

        <Link to="/courses" className="webinars-btn webinars-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
