import { Link } from "react-router-dom";
import "./OnlineCollegePage.css";

export default function OnlineCollegePage() {
  const directions = [
    {
      title: "Видеомонтаж",
      text: "Научитесь монтировать видео для TikTok, Reels, YouTube и коммерческих проектов.",
      icon: "🎬",
    },
    {
      title: "CapCut и Premiere Pro",
      text: "Освойте популярные программы для монтажа с нуля до уверенного уровня.",
      icon: "✂️",
    },
    {
      title: "Дизайн и контент",
      text: "Создавайте визуальный стиль, обложки, баннеры и digital-контент.",
      icon: "🎨",
    },
    {
      title: "Карьера в digital",
      text: "Соберите портфолио, получите практику и подготовьтесь к первым заказам.",
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

  return (
    <main className="online-college-page">
      <section className="college-hero">
        <div className="college-hero__content">
          <p className="college-label">Онлайн-колледж 2026</p>

          <h1>
            Получи профессию в digital <br />
            не выходя из дома
          </h1>

          <p className="college-hero__text">
            Birzhan-Edu Online College — это современное онлайн-обучение
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
          <div className="college-card-glow"></div>
          <h3>Старт обучения</h3>
          <p>2026 год</p>

          <div className="college-mini-stats">
            <div>
              <strong>40+</strong>
              <span>курсов</span>
            </div>
            <div>
              <strong>15 000+</strong>
              <span>студентов</span>
            </div>
            <div>
              <strong>87%</strong>
              <span>нашли клиентов</span>
            </div>
          </div>
        </div>
      </section>

      <section className="college-section">
        <div className="college-section__header">
          <h2>Обучение после 9-го и 11-го класса</h2>
          <p>
            Учитесь в удобном темпе, смотрите уроки, выполняйте практику и
            постепенно собирайте портфолио.
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

      <section className="college-career">
        <div>
          <p className="college-label">Карьерный трек</p>
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
