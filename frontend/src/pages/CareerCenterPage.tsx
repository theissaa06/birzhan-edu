import { Link } from "react-router-dom";
import "./CareerCenterPage.css";

const paths = [
  {
    icon: "🎬",
    title: "Видеомонтажёр",
    text: "Монтаж роликов для блогеров, YouTube, TikTok, Reels, Shorts и рекламных проектов.",
    income: "от первых заказов до стабильного дохода",
  },
  {
    icon: "📱",
    title: "Shorts / Reels editor",
    text: "Создание коротких динамичных видео: хуки, бит, склейки, тренды и удержание внимания.",
    income: "подходит для быстрого старта",
  },
  {
    icon: "🎞️",
    title: "Premiere Pro специалист",
    text: "Работа с более сложными проектами: блоги, интервью, обзоры, рекламные видео и YouTube.",
    income: "путь к профессиональному монтажу",
  },
  {
    icon: "🎨",
    title: "Специалист по цвету",
    text: "Цветокоррекция, стиль картинки, LUT, свет, контраст и cinematic-настроение.",
    income: "услуга для улучшения качества видео",
  },
];

const skills = [
  "Уметь монтировать короткие и длинные видео",
  "Понимать ритм, структуру ролика и удержание внимания",
  "Работать с музыкой, звуком, текстом и переходами",
  "Собирать портфолио из 5–10 лучших работ",
  "Правильно общаться с клиентом и уточнять задачу",
  "Оценивать свою работу и оформлять услуги",
];

const steps = [
  {
    number: "01",
    title: "Освойте базу",
    text: "Пройдите первые уроки, научитесь резать видео, добавлять музыку, текст и делать экспорт.",
  },
  {
    number: "02",
    title: "Сделайте портфолио",
    text: "Соберите несколько учебных работ: TikTok-эдит, блог, рекламный ролик, cinematic-видео.",
  },
  {
    number: "03",
    title: "Оформите услуги",
    text: "Опишите, что вы умеете: монтаж Shorts, Reels, YouTube, цвет, звук, эффекты.",
  },
  {
    number: "04",
    title: "Найдите первые заказы",
    text: "Начните с знакомых, соцсетей, Telegram-чатов, блогеров и небольших проектов.",
  },
];

export default function CareerCenterPage() {
  return (
    <main className="career-page">
      <section className="career-hero">
        <div className="career-hero__content">
          <p className="career-label">Центр карьеры</p>

          <h1>
            Путь от первого урока до первых <span>заказов</span>
          </h1>

          <p>
            Центр карьеры Birzhan-Edu помогает студентам понять, как превратить
            навыки монтажа в портфолио, услуги, первые заказы и дальнейшее
            развитие в digital.
          </p>

          <div className="career-actions">
            <Link to="/courses" className="career-btn career-btn--primary">
              Начать обучение
            </Link>

            <Link to="/students" className="career-btn career-btn--light">
              Истории студентов
            </Link>
          </div>
        </div>

        <div className="career-hero__visual">
          <div className="career-main-icon">🚀</div>
          <div className="career-float career-float--one">Портфолио</div>
          <div className="career-float career-float--two">Заказы</div>
          <div className="career-float career-float--three">Digital</div>
        </div>
      </section>

      <section className="career-stats">
        <div>
          <strong>5–10</strong>
          <span>работ для стартового портфолио</span>
        </div>
        <div>
          <strong>4</strong>
          <span>основных карьерных пути</span>
        </div>
        <div>
          <strong>87%</strong>
          <span>студентов начинают проекты</span>
        </div>
        <div>
          <strong>2026</strong>
          <span>актуальные digital-навыки</span>
        </div>
      </section>

      <section className="career-section">
        <div className="career-section-head">
          <p className="career-label">Направления</p>
          <h2>Кем можно стать после обучения</h2>
          <p>
            Видеомонтаж открывает разные пути: от коротких роликов до
            профессиональных проектов, YouTube, рекламы, цветокоррекции и VFX.
          </p>
        </div>

        <div className="career-paths">
          {paths.map((path) => (
            <article className="career-path-card" key={path.title}>
              <div className="career-path-icon">{path.icon}</div>
              <h3>{path.title}</h3>
              <p>{path.text}</p>

              <div className="career-income">
                <span>Перспектива</span>
                <strong>{path.income}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="career-dark">
        <div>
          <p className="career-label career-label--dark">Навыки для работы</p>
          <h2>Что нужно, чтобы брать первые заказы</h2>
          <p>
            Клиенту важно не просто “умение нажимать кнопки”, а результат:
            понятный ролик, хорошая структура, звук, картинка и соблюдение
            задачи.
          </p>
        </div>

        <div className="career-skills">
          {skills.map((skill) => (
            <div key={skill}>
              <span>✓</span>
              <p>{skill}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="career-section">
        <div className="career-section-head">
          <p className="career-label">План развития</p>
          <h2>4 шага к первым заказам</h2>
        </div>

        <div className="career-steps">
          {steps.map((step) => (
            <article className="career-step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="career-portfolio">
        <div>
          <p className="career-label">Портфолио</p>
          <h2>Что добавить в портфолио начинающему монтажёру</h2>
          <p>
            Не нужно ждать “идеального момента”. Начните с учебных работ:
            короткий эдит, ролик для Reels, YouTube-нарезка, видео с
            цветокоррекцией и пример монтажа под музыку.
          </p>
        </div>

        <div className="career-portfolio-list">
          <div>🎬 TikTok / Reels эдит</div>
          <div>🎞 YouTube-нарезка</div>
          <div>🎨 Цветокоррекция до/после</div>
          <div>🔊 Монтаж под музыку</div>
          <div>⚡ Видео с эффектами</div>
        </div>
      </section>

      <section className="career-faq-section">
        <div className="career-section-head">
          <p className="career-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="career-faq">
          <details open>
            <summary>Можно ли начать без опыта?</summary>
            <p>
              Да. Начать можно с базовых уроков и простых проектов. Главное —
              делать практику и постепенно собирать работы.
            </p>
          </details>

          <details>
            <summary>Когда можно искать первые заказы?</summary>
            <p>
              Когда у вас есть хотя бы 3–5 работ, которые показывают ваш стиль,
              аккуратность и понимание монтажа.
            </p>
          </details>

          <details>
            <summary>Нужен ли Premiere Pro сразу?</summary>
            <p>
              Не обязательно. Можно стартовать с CapCut, а потом перейти к
              Premiere Pro, когда появится понимание монтажа и задач.
            </p>
          </details>

          <details>
            <summary>Можно ли подключить реальные заявки?</summary>
            <p>
              Да. Позже можно сделать раздел заявок, форму портфолио и
              интеграцию с backend/админ-панелью.
            </p>
          </details>
        </div>
      </section>

      <section className="career-final">
        <h2>Хотите начать карьерный путь?</h2>
        <p>
          Выберите курс, пройдите первые уроки и начните собирать портфолио уже
          сейчас.
        </p>

        <Link to="/courses" className="career-btn career-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
