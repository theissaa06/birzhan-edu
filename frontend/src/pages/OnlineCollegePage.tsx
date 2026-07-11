import { Link } from "react-router-dom";
import "./OnlineCollegePage.css";

export default function OnlineCollegePage() {
  const directions = [
    {
      title: "Видеомонтаж",
      text: "Монтаж для TikTok, Reels, YouTube Shorts, рекламы и портфолио.",
      icon: "🎬",
    },
    {
      title: "CapCut и Premiere Pro",
      text: "Популярные инструменты монтажа: от первого видео до уверенного уровня.",
      icon: "✂️",
    },
    {
      title: "Дизайн и контент",
      text: "Обложки, визуальный стиль, оформление роликов и digital-контент.",
      icon: "🎨",
    },
    {
      title: "Карьера в digital",
      text: "Портфолио, первые заказы, фриланс и подготовка к работе с клиентами.",
      icon: "🚀",
    },
  ];

  const benefits = [
    "Поступление без ОГЭ, ЕГЭ и сложных экзаменов",
    "Обучение онлайн из любой точки мира",
    "Видеоуроки, практика, домашние задания и поддержка",
    "Портфолио уже во время обучения",
    "Помощь с карьерой и первыми заказами",
  ];

  const stages = [
    {
      step: "01",
      title: "Смотри уроки",
      text: "Изучай материал в удобном темпе и возвращайся к урокам в любое время.",
    },
    {
      step: "02",
      title: "Делай практику",
      text: "Повторяй действия в редакторе и закрепляй навык на реальных заданиях.",
    },
    {
      step: "03",
      title: "Собирай портфолио",
      text: "Каждая работа может стать частью будущего портфолио для клиентов.",
    },
    {
      step: "04",
      title: "Выходи в digital",
      text: "Понимай, куда двигаться дальше: фриланс, контент, монтаж или дизайн.",
    },
  ];

  return (
    <main className="online-college-page">
      <section className="college-hero">
        <div className="college-hero__content">
          <p className="college-label">Онлайн-колледж 2026</p>

          <h1>
            Получи профессию в <span>digital</span> не выходя из дома
          </h1>

          <p className="college-hero__text">
            Frame School Online College — современное онлайн-обучение
            видеомонтажу, дизайну, контенту и digital-профессиям после 9-го или
            11-го класса.
          </p>

          <div className="college-hero__buttons">
            <Link to="/register" className="college-btn college-btn--primary">
              Поступить
            </Link>

            <Link to="/courses" className="college-btn college-btn--ghost">
              Смотреть направления
            </Link>
          </div>
        </div>

        <div className="college-hero__card">
          <div className="college-card-badge">2026</div>
          <div className="college-main-icon">🎓</div>

          <h3>Старт обучения</h3>
          <p>Онлайн-формат, практика и портфолио</p>

          <div className="college-mini-stats">
            <div>
              <strong>40+</strong>
              <span>курсов</span>
            </div>

            <div>
              <strong>15K+</strong>
              <span>студентов</span>
            </div>

            <div>
              <strong>87%</strong>
              <span>нашли клиентов</span>
            </div>
          </div>
        </div>
      </section>

      <section className="college-stats">
        <div>
          <strong>9–11</strong>
          <span>классы</span>
        </div>

        <div>
          <strong>100%</strong>
          <span>онлайн</span>
        </div>

        <div>
          <strong>4</strong>
          <span>направления</span>
        </div>

        <div>
          <strong>PRO</strong>
          <span>портфолио</span>
        </div>
      </section>

      <section className="college-section">
        <div className="college-section__header">
          <p className="college-label">Формат обучения</p>
          <h2>Обучение после 9-го и 11-го класса</h2>
          <p>
            Учитесь в удобном темпе, смотрите уроки, выполняйте практику и
            постепенно собирайте портфолио для digital-профессии.
          </p>
        </div>

        <div className="college-info-card">
          <div className="college-diploma">🎓</div>

          <div>
            <h3>Что получает студент</h3>

            <ul>
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <Link to="/free" className="college-btn college-btn--primary">
              Получить консультацию
            </Link>
          </div>
        </div>
      </section>

      <section className="college-section">
        <div className="college-section__header">
          <p className="college-label">Направления</p>
          <h2>Выбери направление обучения</h2>
          <p>
            Направления сделаны для новичков: можно начать без опыта и
            постепенно выйти на уровень специалиста.
          </p>
        </div>

        <div className="college-directions">
          {directions.map((item) => (
            <article className="college-direction-card" key={item.title}>
              <div className="college-direction-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link to="/courses">Подробнее →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="college-section">
        <div className="college-section__header">
          <p className="college-label">Путь студента</p>
          <h2>Как проходит обучение</h2>
          <p>
            От первого урока до портфолио: студент проходит понятный путь и
            видит свой прогресс.
          </p>
        </div>

        <div className="college-stages">
          {stages.map((stage) => (
            <article className="college-stage-card" key={stage.step}>
              <span>{stage.step}</span>
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="college-career">
        <div>
          <p className="college-label college-label--dark">Карьерный трек</p>
          <h2>После обучения студент понимает, как двигаться дальше</h2>
          <p>
            Онлайн-колледж помогает не только изучить инструменты, но и
            подготовиться к реальной практике: оформить портфолио, выбрать
            направление, понять первые шаги во фрилансе или digital-команде.
          </p>
        </div>

        <Link to="/career-center" className="college-btn college-btn--primary">
          Перейти в центр карьеры →
        </Link>
      </section>

      <section className="college-section">
        <div className="college-section__header">
          <p className="college-label">FAQ</p>
          <h2>Часто задаваемые вопросы</h2>
        </div>

        <div className="college-faq">
          <details open>
            <summary>Можно ли учиться без опыта?</summary>
            <p>
              Да. Обучение начинается с базовых уроков: как открыть программу,
              как нарезать видео, добавить музыку, текст, эффекты и экспорт.
            </p>
          </details>

          <details>
            <summary>Подойдёт ли онлайн-колледж после 9 класса?</summary>
            <p>
              Да. Страница рассчитана на школьников после 9-го и 11-го класса, а
              также на новичков, которые хотят освоить digital-профессию.
            </p>
          </details>

          <details>
            <summary>Будут ли видеоуроки по монтажу?</summary>
            <p>
              Да. В уроках должны быть видео по CapCut, Premiere Pro,
              TikTok-эдитам, переходам, цветокоррекции, звуку и VFX.
            </p>
          </details>

          <details>
            <summary>Что будет после обучения?</summary>
            <p>
              Студент получает портфолио, сертификат, практические работы и
              понимание, как искать первые заказы.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
