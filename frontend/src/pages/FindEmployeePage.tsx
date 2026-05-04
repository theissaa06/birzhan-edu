import { Link } from "react-router-dom";
import "./FindEmployeePage.css";

const specialists = [
  {
    icon: "🎬",
    title: "Видеомонтажёр",
    text: "Монтаж YouTube, блогов, интервью, обзоров, рекламных роликов и учебного контента.",
    skills: ["Нарезка", "Структура", "Экспорт"],
  },
  {
    icon: "📱",
    title: "Shorts / Reels editor",
    text: "Короткие динамичные ролики для TikTok, Reels и Shorts: хуки, бит, тренды, переходы.",
    skills: ["TikTok", "Reels", "Beat sync"],
  },
  {
    icon: "✂️",
    title: "CapCut специалист",
    text: "Быстрый монтаж, субтитры, эффекты, шаблоны, переходы и контент для соцсетей.",
    skills: ["CapCut", "Субтитры", "Эффекты"],
  },
  {
    icon: "🎞️",
    title: "Premiere Pro монтажёр",
    text: "Профессиональная работа с таймлайном, звуком, цветом, длинными роликами и проектами.",
    skills: ["Premiere Pro", "YouTube", "Звук"],
  },
  {
    icon: "🎨",
    title: "Специалист по цвету",
    text: "Цветокоррекция, cinematic look, LUT, свет, контраст и визуальный стиль видео.",
    skills: ["Color", "LUT", "Style"],
  },
  {
    icon: "⚡",
    title: "VFX / Edit maker",
    text: "Shake, zoom, flash, glitch, visual effects и эффектные эдиты для соцсетей.",
    skills: ["VFX", "Shake", "Zoom"],
  },
];

const reasons = [
  {
    icon: "🎓",
    title: "Подготовленные студенты",
    text: "Студенты проходят уроки, выполняют практику и собирают портфолио из учебных работ.",
  },
  {
    icon: "📁",
    title: "Портфолио",
    text: "Можно оценить примеры работ: короткие видео, эдиты, YouTube-нарезки, цвет и эффекты.",
  },
  {
    icon: "🚀",
    title: "Быстрый старт",
    text: "Можно найти начинающего специалиста для простых задач, соцсетей или тестового проекта.",
  },
  {
    icon: "💼",
    title: "Подбор под задачу",
    text: "Вы выбираете направление: CapCut, TikTok, Premiere Pro, цвет, звук или VFX.",
  },
];

const steps = [
  {
    number: "01",
    title: "Опишите задачу",
    text: "Укажите, какой монтаж нужен: TikTok, YouTube, реклама, блог, эдит или учебный проект.",
  },
  {
    number: "02",
    title: "Выберите специалиста",
    text: "Мы поможем подобрать студента или выпускника по навыкам и направлению.",
  },
  {
    number: "03",
    title: "Запустите тестовый проект",
    text: "Начните с небольшой задачи, чтобы проверить стиль, скорость и качество работы.",
  },
];

export default function FindEmployeePage() {
  return (
    <main className="employee-page">
      <section className="employee-hero">
        <div className="employee-hero__content">
          <p className="employee-label">Найти сотрудника</p>

          <h1>
            Подберите монтажёра или digital-специалиста среди{" "}
            <span>студентов</span>
          </h1>

          <p>
            Birzhan-Edu помогает компаниям, блогерам и проектам находить
            начинающих видеомонтажёров, эдиторов, CapCut-специалистов,
            создателей Reels/Shorts и digital-помощников.
          </p>

          <div className="employee-actions">
            <a href="#request" className="employee-btn employee-btn--primary">
              Оставить заявку
            </a>

            <Link to="/students" className="employee-btn employee-btn--light">
              Смотреть студентов
            </Link>
          </div>
        </div>

        <div className="employee-hero__visual">
          <div className="employee-main-icon">🧑‍💻</div>
          <div className="employee-float employee-float--one">Video editor</div>
          <div className="employee-float employee-float--two">Portfolio</div>
          <div className="employee-float employee-float--three">Remote</div>
        </div>
      </section>

      <section className="employee-stats">
        <div>
          <strong>6</strong>
          <span>типов специалистов</span>
        </div>
        <div>
          <strong>5–10</strong>
          <span>работ в портфолио</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>онлайн-подбор</span>
        </div>
        <div>
          <strong>2026</strong>
          <span>актуальные digital-навыки</span>
        </div>
      </section>

      <section className="employee-section">
        <div className="employee-section-head">
          <p className="employee-label">Кого можно найти</p>
          <h2>Специалисты под разные задачи</h2>
          <p>
            Выберите направление под вашу задачу: быстрые ролики для соцсетей,
            YouTube-монтаж, цветокоррекция, VFX, CapCut или Premiere Pro.
          </p>
        </div>

        <div className="employee-grid">
          {specialists.map((item) => (
            <article className="employee-card" key={item.title}>
              <div className="employee-card__top">
                <div className="employee-card-icon">{item.icon}</div>
                <span>Доступно</span>
              </div>

              <h3>{item.title}</h3>
              <p>{item.text}</p>

              <div className="employee-skills">
                {item.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="employee-dark">
        <div>
          <p className="employee-label employee-label--dark">
            Почему это удобно
          </p>
          <h2>Платформа помогает соединить обучение и реальные задачи</h2>
          <p>
            Студенты получают практику и портфолио, а клиенты могут найти
            начинающих специалистов для конкретных задач по монтажу и контенту.
          </p>
        </div>

        <div className="employee-reasons">
          {reasons.map((item) => (
            <article key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="employee-section">
        <div className="employee-section-head">
          <p className="employee-label">Как это работает</p>
          <h2>3 шага для подбора специалиста</h2>
        </div>

        <div className="employee-steps">
          {steps.map((step) => (
            <article className="employee-step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="employee-request" id="request">
        <div>
          <p className="employee-label">Заявка</p>
          <h2>Опишите, какой специалист вам нужен</h2>
          <p>
            В демонстрационной версии кнопка ведёт на регистрацию. Позже можно
            сделать настоящую форму заявки и отправку в админ-панель.
          </p>
        </div>

        <div className="employee-request-card">
          <h3>Пример заявки</h3>
          <ul>
            <li>Нужен монтажёр для Reels</li>
            <li>3–5 роликов в неделю</li>
            <li>Музыка, субтитры, простые эффекты</li>
            <li>Желательно портфолио из коротких видео</li>
          </ul>

          <Link to="/register" className="employee-btn employee-btn--primary">
            Оставить заявку →
          </Link>
        </div>
      </section>

      <section className="employee-faq-section">
        <div className="employee-section-head">
          <p className="employee-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="employee-faq">
          <details open>
            <summary>Это уже настоящая биржа специалистов?</summary>
            <p>
              Сейчас это демонстрационная страница. Позже можно подключить
              реальные анкеты студентов, портфолио, фильтры и заявки через
              backend.
            </p>
          </details>

          <details>
            <summary>Можно ли подключить заявки в админку?</summary>
            <p>
              Да. У тебя уже есть backend-структура для Application, поэтому
              позже можно сделать форму и вывод заявок в админ-панели.
            </p>
          </details>

          <details>
            <summary>Можно ли показывать реальных студентов?</summary>
            <p>
              Да. Можно создать модель StudentProfile или использовать данные
              пользователей, которые завершили курс и загрузили портфолио.
            </p>
          </details>

          <details>
            <summary>Кому подходит эта страница?</summary>
            <p>
              Блогерам, малому бизнесу, командам, онлайн-школам и всем, кому
              нужен монтаж коротких или длинных видео.
            </p>
          </details>
        </div>
      </section>

      <section className="employee-final">
        <h2>Нужен монтажёр или digital-помощник?</h2>
        <p>
          Оставьте заявку, и платформа сможет подбирать подходящих студентов под
          ваши задачи.
        </p>

        <Link to="/register" className="employee-btn employee-btn--primary">
          Начать подбор →
        </Link>
      </section>
    </main>
  );
}
