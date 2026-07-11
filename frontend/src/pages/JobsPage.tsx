import { Link } from "react-router-dom";
import "./JobsPage.css";

const jobs = [
  {
    icon: "🎬",
    title: "Преподаватель по видеомонтажу",
    type: "Удалённо",
    level: "Middle / Senior",
    text: "Создание уроков, запись обучающих видео, разбор домашних заданий и помощь студентам.",
  },
  {
    icon: "✂️",
    title: "Наставник по CapCut",
    type: "Part-time",
    level: "Junior / Middle",
    text: "Помощь новичкам, проверка практических работ и объяснение базового монтажа простым языком.",
  },
  {
    icon: "🎞️",
    title: "Куратор Premiere Pro",
    type: "Удалённо",
    level: "Middle",
    text: "Поддержка студентов на курсе Premiere Pro: таймлайн, экспорт, звук, цвет и структура проекта.",
  },
  {
    icon: "🎨",
    title: "Дизайнер учебных материалов",
    type: "Проектная работа",
    level: "Middle",
    text: "Создание презентаций, карточек, чек-листов, визуалов и материалов для образовательных модулей.",
  },
  {
    icon: "📱",
    title: "Контент-мейкер TikTok / Reels",
    type: "Гибкий график",
    level: "Junior / Middle",
    text: "Создание коротких роликов для соцсетей платформы: хуки, эдиты, тренды, монтаж под бит.",
  },
  {
    icon: "💬",
    title: "Специалист поддержки студентов",
    type: "Удалённо",
    level: "Junior",
    text: "Ответы на вопросы студентов, помощь с навигацией по платформе и передача сложных вопросов команде.",
  },
];

const benefits = [
  {
    icon: "🌍",
    title: "Удалённая работа",
    text: "Можно работать из любого города и совмещать с учёбой, проектами или фрилансом.",
  },
  {
    icon: "🚀",
    title: "Рост вместе с платформой",
    text: "Frame School развивается как полноценная EdTech-платформа, поэтому команде есть куда расти.",
  },
  {
    icon: "🎓",
    title: "Образовательная миссия",
    text: "Мы помогаем новичкам освоить digital-навыки и сделать первые шаги в профессии.",
  },
  {
    icon: "🎁",
    title: "Творческая среда",
    text: "Монтаж, дизайн, контент, AI-инструменты, курсы и реальные образовательные продукты.",
  },
];

const steps = [
  {
    number: "01",
    title: "Выберите роль",
    text: "Посмотрите список вакансий и выберите направление, где ваши навыки подходят лучше всего.",
  },
  {
    number: "02",
    title: "Подготовьте портфолио",
    text: "Добавьте примеры работ: видео, уроки, дизайн, тексты, кейсы или ссылки на проекты.",
  },
  {
    number: "03",
    title: "Отправьте заявку",
    text: "Напишите нам, расскажите о себе и покажите, чем можете быть полезны платформе.",
  },
];

export default function JobsPage() {
  return (
    <main className="jobs-page">
      <section className="jobs-hero">
        <div className="jobs-hero__content">
          <p className="jobs-label">Работа у нас</p>

          <h1>
            Присоединяйтесь к команде <span>Frame School</span>
          </h1>

          <p>
            Мы создаём образовательную платформу для обучения видеомонтажу,
            digital-навыкам, контенту и современным инструментам. Если вам
            нравится обучение, монтаж и креатив — нам по пути.
          </p>

          <div className="jobs-actions">
            <a href="#jobs-list" className="jobs-btn jobs-btn--primary">
              Смотреть вакансии
            </a>

            <Link to="/about" className="jobs-btn jobs-btn--light">
              О платформе
            </Link>
          </div>
        </div>

        <div className="jobs-hero__visual">
          <div className="jobs-main-icon">💼</div>
          <div className="jobs-float jobs-float--one">Remote</div>
          <div className="jobs-float jobs-float--two">EdTech</div>
          <div className="jobs-float jobs-float--three">Creative</div>
        </div>
      </section>

      <section className="jobs-stats">
        <div>
          <strong>6</strong>
          <span>открытых ролей</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>онлайн-формат</span>
        </div>
        <div>
          <strong>40+</strong>
          <span>уроков и модулей</span>
        </div>
        <div>
          <strong>2026</strong>
          <span>год развития платформы</span>
        </div>
      </section>

      <section className="jobs-section" id="jobs-list">
        <div className="jobs-section-head">
          <p className="jobs-label">Вакансии</p>
          <h2>Открытые роли в команде</h2>
          <p>
            Сейчас можно оформить эти позиции как демонстрационные вакансии для
            проекта. Позже их можно подключить к backend и управлять из админки.
          </p>
        </div>

        <div className="jobs-grid">
          {jobs.map((job) => (
            <article className="job-card" key={job.title}>
              <div className="job-card__top">
                <div className="job-icon">{job.icon}</div>
                <span>{job.type}</span>
              </div>

              <h3>{job.title}</h3>

              <p>{job.text}</p>

              <div className="job-meta">
                <span>Уровень</span>
                <strong>{job.level}</strong>
              </div>

              <Link to="/register" className="job-card-btn">
                Откликнуться →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="jobs-dark">
        <div>
          <p className="jobs-label jobs-label--dark">Почему с нами</p>
          <h2>Работа в проекте, который помогает людям учиться</h2>
          <p>
            Frame School объединяет обучение, практику, поддержку, бонусы,
            карьерное развитие и современный digital-контент.
          </p>
        </div>

        <div className="jobs-benefits">
          {benefits.map((item) => (
            <article key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jobs-section">
        <div className="jobs-section-head">
          <p className="jobs-label">Как откликнуться</p>
          <h2>3 простых шага</h2>
        </div>

        <div className="jobs-steps">
          {steps.map((step) => (
            <article className="jobs-step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jobs-faq-section">
        <div className="jobs-section-head">
          <p className="jobs-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="jobs-faq">
          <details open>
            <summary>Можно ли работать удалённо?</summary>
            <p>
              Да. Большинство ролей можно выполнять онлайн: запись уроков,
              поддержка студентов, дизайн материалов, проверка заданий и
              создание контента.
            </p>
          </details>

          <details>
            <summary>Нужно ли иметь опыт преподавания?</summary>
            <p>
              Для преподавателей и наставников опыт желателен, но главное —
              уметь понятно объяснять и показывать действия пошагово.
            </p>
          </details>

          <details>
            <summary>Можно ли откликнуться без большого портфолио?</summary>
            <p>
              Да, если есть сильная мотивация и примеры работ. Для некоторых
              ролей достаточно показать 2–3 качественных проекта.
            </p>
          </details>

          <details>
            <summary>Можно ли добавить настоящую форму отклика?</summary>
            <p>
              Да. Позже можно сделать backend-модель Application и отправлять
              заявки в админ-панель.
            </p>
          </details>
        </div>
      </section>

      <section className="jobs-final">
        <h2>Хотите стать частью Frame School?</h2>
        <p>
          Выберите роль, подготовьте портфолио и отправьте заявку. Платформа
          растёт, и ей нужны сильные креативные люди.
        </p>

        <Link to="/register" className="jobs-btn jobs-btn--primary">
          Откликнуться →
        </Link>
      </section>
    </main>
  );
}
