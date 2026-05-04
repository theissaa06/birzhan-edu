import { Link } from "react-router-dom";
import "./KidsPage.css";

const kidsCourses = [
  {
    icon: "🎬",
    title: "Монтаж для школьников",
    text: "Простые уроки по созданию первых роликов: нарезка, музыка, текст и экспорт.",
    age: "10+",
  },
  {
    icon: "📱",
    title: "TikTok / Reels безопасно",
    text: "Учимся делать короткие видео, понимать ритм, тренды и не копировать опасный контент.",
    age: "12+",
  },
  {
    icon: "✂️",
    title: "CapCut для начинающих",
    text: "Понятный старт в CapCut: как открыть проект, добавить видео, музыку и эффекты.",
    age: "10+",
  },
  {
    icon: "🎨",
    title: "Креатив и дизайн видео",
    text: "Цвет, шрифты, оформление, обложки и аккуратный визуальный стиль.",
    age: "11+",
  },
];

const safety = [
  {
    icon: "🛡️",
    title: "Безопасный подход",
    text: "Обучение построено без сложных и вредных тем. Акцент на творчестве и навыках.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Понятно родителям",
    text: "Родители видят, чему ребёнок учится и какие проекты создаёт.",
  },
  {
    icon: "🧠",
    title: "Развитие мышления",
    text: "Монтаж развивает внимание, вкус, структуру, креативность и цифровые навыки.",
  },
  {
    icon: "🎯",
    title: "Практика вместо скуки",
    text: "Ребёнок сразу делает мини-проекты: ролики, обложки, эдиты и простые презентации.",
  },
];

const steps = [
  {
    number: "01",
    title: "Смотрит короткий урок",
    text: "Уроки объясняются простым языком, без перегруза и сложных терминов.",
  },
  {
    number: "02",
    title: "Повторяет действия",
    text: "Ребёнок повторяет шаги в CapCut или другом простом редакторе.",
  },
  {
    number: "03",
    title: "Делает мини-проект",
    text: "После урока создаёт короткий ролик, обложку или монтаж под музыку.",
  },
  {
    number: "04",
    title: "Собирает портфолио",
    text: "Лучшие работы можно сохранить как первые творческие проекты.",
  },
];

export default function KidsPage() {
  return (
    <main className="kids-page">
      <section className="kids-hero">
        <div className="kids-hero__content">
          <p className="kids-label">Для детей и школьников</p>

          <h1>
            Безопасное обучение монтажу для <span>юных креаторов</span>
          </h1>

          <p>
            Birzhan-Edu помогает детям и школьникам изучать видеомонтаж,
            развивать креативность, делать первые ролики и понимать digital-мир
            в безопасном формате.
          </p>

          <div className="kids-actions">
            <Link to="/courses" className="kids-btn kids-btn--primary">
              Смотреть курсы
            </Link>

            <Link to="/free" className="kids-btn kids-btn--light">
              Попробовать бесплатно
            </Link>
          </div>
        </div>

        <div className="kids-hero__visual">
          <div className="kids-main-icon">🧒</div>
          <div className="kids-float kids-float--one">10+</div>
          <div className="kids-float kids-float--two">Безопасно</div>
          <div className="kids-float kids-float--three">Практика</div>
        </div>
      </section>

      <section className="kids-stats">
        <div>
          <strong>10+</strong>
          <span>возраст старта</span>
        </div>
        <div>
          <strong>4</strong>
          <span>направления для детей</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>понятный формат</span>
        </div>
        <div>
          <strong>0</strong>
          <span>сложной теории</span>
        </div>
      </section>

      <section className="kids-section">
        <div className="kids-section-head">
          <p className="kids-label">Направления</p>
          <h2>Что может изучать ребёнок</h2>
          <p>
            Обучение построено через простые творческие задачи: короткие видео,
            монтаж под музыку, оформление роликов и первые digital-проекты.
          </p>
        </div>

        <div className="kids-grid">
          {kidsCourses.map((course) => (
            <article className="kids-card" key={course.title}>
              <div className="kids-card__top">
                <div className="kids-card-icon">{course.icon}</div>
                <span>{course.age}</span>
              </div>

              <h3>{course.title}</h3>
              <p>{course.text}</p>

              <Link to="/courses">Смотреть направление →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="kids-dark">
        <div>
          <p className="kids-label kids-label--dark">Для родителей</p>
          <h2>Почему это полезно и безопасно</h2>
          <p>
            Мы делаем акцент не на бесконечном просмотре контента, а на создании
            собственных проектов, развитии вкуса и цифровой грамотности.
          </p>
        </div>

        <div className="kids-safety">
          {safety.map((item) => (
            <article key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="kids-section">
        <div className="kids-section-head">
          <p className="kids-label">Как проходит обучение</p>
          <h2>Пошаговый формат без перегруза</h2>
        </div>

        <div className="kids-steps">
          {steps.map((step) => (
            <article className="kids-step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="kids-parent-block">
        <div>
          <p className="kids-label">Родительский контроль</p>
          <h2>Родители могут видеть смысл обучения</h2>
          <p>
            Ребёнок не просто “сидит за видео”, а учится создавать: собирает
            ролики, оформляет идеи, развивает внимание к деталям и делает первые
            работы для портфолио.
          </p>
        </div>

        <div className="kids-parent-card">
          <h3>Что получает ребёнок</h3>
          <ul>
            <li>Первые навыки видеомонтажа</li>
            <li>Понимание музыки, ритма и структуры</li>
            <li>Креативное мышление</li>
            <li>Мини-проекты и первые работы</li>
          </ul>
        </div>
      </section>

      <section className="kids-faq-section">
        <div className="kids-section-head">
          <p className="kids-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="kids-faq">
          <details open>
            <summary>С какого возраста можно начинать?</summary>
            <p>
              Лучше всего начинать примерно с 10 лет, когда ребёнок уже может
              повторять действия по уроку и работать с простыми программами.
            </p>
          </details>

          <details>
            <summary>Нужен ли мощный компьютер?</summary>
            <p>
              Для старта можно использовать простой компьютер или телефон с
              CapCut. Сложные программы можно изучать позже.
            </p>
          </details>

          <details>
            <summary>Это безопасно?</summary>
            <p>
              Да, если обучение построено вокруг творчества, практики и понятных
              заданий, а не вокруг бесконтрольного просмотра контента.
            </p>
          </details>

          <details>
            <summary>Можно ли добавить отдельный детский курс?</summary>
            <p>
              Да. Позже можно создать отдельную категорию “Для детей” и вывести
              детские курсы в каталоге.
            </p>
          </details>
        </div>
      </section>

      <section className="kids-final">
        <h2>Хотите, чтобы ребёнок учился создавать, а не только смотреть?</h2>
        <p>
          Начните с простого курса, бесплатных материалов или вводного урока.
        </p>

        <Link to="/courses" className="kids-btn kids-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
