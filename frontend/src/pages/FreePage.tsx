import { Link } from "react-router-dom";
import "./FreePage.css";

const freeMaterials = [
  {
    icon: "🎬",
    title: "Бесплатный вводный урок",
    text: "Посмотрите, как устроено обучение на платформе и как проходит первый урок по монтажу.",
    link: "/courses",
    button: "Смотреть урок",
  },
  {
    icon: "🧭",
    title: "Профориентационный тест",
    text: "Поможет понять, какое направление вам ближе: CapCut, Premiere Pro, TikTok, VFX или YouTube.",
    link: "/free/career-test",
    button: "Пройти тест",
  },
  {
    icon: "🎙️",
    title: "Бесплатные вебинары",
    text: "Записи и анонсы онлайн-встреч по монтажу, контенту, эффектам и digital-профессиям.",
    link: "/free/webinars",
    button: "Открыть вебинары",
  },
  {
    icon: "🎁",
    title: "Стартовый бонус",
    text: "Получите чек-листы, идеи для первых роликов, мини-гайд по портфолио и материалы для практики.",
    link: "/bonus",
    button: "Получить бонус",
  },
];

const steps = [
  {
    number: "01",
    title: "Попробуйте бесплатно",
    text: "Откройте вводные материалы и посмотрите, подходит ли вам формат обучения.",
  },
  {
    number: "02",
    title: "Выберите направление",
    text: "Определите, что интереснее: монтаж коротких видео, CapCut, Premiere Pro или эффекты.",
  },
  {
    number: "03",
    title: "Начните курс",
    text: "После бесплатного знакомства переходите к полноценному обучению и практике.",
  },
];

export default function FreePage() {
  return (
    <main className="free-page">
      <section className="free-hero">
        <div className="free-hero__content">
          <p className="free-label">Бесплатный старт</p>

          <h1>
            Попробуйте обучение на Frame School <span>бесплатно</span>
          </h1>

          <p>
            Начните с бесплатных материалов: вводного урока, профориентационного
            теста, вебинаров и бонусов для первого монтажа.
          </p>

          <div className="free-actions">
            <Link to="/courses" className="free-btn free-btn--primary">
              🎬 Начать бесплатно
            </Link>

            <Link to="/free/career-test" className="free-btn free-btn--light">
              Пройти тест
            </Link>
          </div>
        </div>

        <div className="free-hero__visual">
          <div className="free-main-icon">✨</div>
          <div className="free-float free-float--one">0 ₸</div>
          <div className="free-float free-float--two">Вводный урок</div>
          <div className="free-float free-float--three">Бонусы 2026</div>
        </div>
      </section>

      <section className="free-materials-section">
        <div className="free-section-head">
          <p className="free-label">Что доступно бесплатно</p>
          <h2>Материалы для первого знакомства с платформой</h2>
          <p className="free-section-text">
            Эта подборка создана, чтобы вы сразу увидели стиль обучения,
            выбрали подходящее направление и сделали первые ролики без оплаты.
          </p>
        </div>

        <div className="free-materials">
          {freeMaterials.map((item) => (
            <article className="free-card" key={item.title}>
              <div className="free-card-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>

              <Link to={item.link} className="free-card-link">
                {item.button} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="free-dark">
        <div>
          <p className="free-label free-label--dark">Для кого</p>
          <h2>Подходит тем, кто хочет попробовать себя в digital</h2>
          <p>
            Бесплатный раздел создан для новичков, школьников, студентов,
            начинающих блогеров и всех, кто хочет понять, нравится ли ему
            видеомонтаж и создание контента.
          </p>
        </div>

        <div className="free-checklist">
          <div>
            <span>✓</span>
            <p>Можно начать без опыта</p>
          </div>
          <div>
            <span>✓</span>
            <p>Не нужно сразу покупать курс</p>
          </div>
          <div>
            <span>✓</span>
            <p>Есть тест для выбора направления</p>
          </div>
          <div>
            <span>✓</span>
            <p>Есть бонусы и материалы для практики</p>
          </div>
        </div>
      </section>

      <section className="free-steps-section">
        <div className="free-section-head">
          <p className="free-label">Как начать</p>
          <h2>3 простых шага</h2>
        </div>

        <div className="free-steps">
          {steps.map((step) => (
            <article className="free-step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="free-final">
        <h2>Готовы попробовать?</h2>
        <p>
          Начните с бесплатного раздела, а потом переходите к курсам и практике.
        </p>

        <Link to="/courses" className="free-btn free-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
