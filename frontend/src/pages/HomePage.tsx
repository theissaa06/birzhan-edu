import { Link } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  const stats = [
    { number: "15 000+", label: "студентов обучаются" },
    { number: "40+", label: "курсов по монтажу" },
    { number: "87%", label: "нашли первых клиентов" },
    { number: "4.9", label: "средняя оценка платформы" },
  ];

  const directions = [
    {
      icon: "🎬",
      title: "Видеомонтаж",
      text: "Научитесь монтировать видео для TikTok, YouTube, Reels и коммерческих проектов.",
    },
    {
      icon: "✂️",
      title: "CapCut",
      text: "Освойте CapCut с нуля: нарезка, переходы, эффекты, музыка и экспорт.",
    },
    {
      icon: "🎞️",
      title: "Premiere Pro",
      text: "Профессиональный монтаж: таймлайн, цвет, звук, титры и финальный экспорт.",
    },
    {
      icon: "⚡",
      title: "VFX и эдиты",
      text: "Делайте shake, zoom, flash, glitch, speed ramp и эффектные эдиты.",
    },
  ];

  const benefits = [
    {
      title: "Видеоуроки с практикой",
      text: "Каждый урок показывает, что делать шаг за шагом: от простого монтажа до сложных эффектов.",
    },
    {
      title: "Прогресс обучения",
      text: "Студент видит, какие уроки уже пройдены, а какие ещё нужно закончить.",
    },
    {
      title: "Бонусы 2026",
      text: "Пресеты, чек-листы, шаблоны, эффекты, LUT-паки и материалы для портфолио.",
    },
    {
      title: "Помощь и поддержка",
      text: "Техподдержка и кураторы помогают, если возникли вопросы по урокам или платформе.",
    },
  ];

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-label">Frame School · 2026</p>

          <h1>
            Обучение монтажу <br />с нуля до уверенного{" "}
            <span>digital-специалиста</span>
          </h1>

          <p className="home-hero__text">
            Образовательная платформа, где урок начинается с практического
            задания: CapCut, Premiere Pro, цветокоррекция, звук, VFX и контент
            для TikTok, YouTube и Reels.
          </p>

          <div className="home-hero__buttons">
            <Link to="/courses" className="home-btn home-btn--primary">
              🎬 Выбрать курс
            </Link>

            <Link to="/free" className="home-btn home-btn--light">
              Бесплатная профориентация
            </Link>

            <Link to="/bonus" className="home-btn home-btn--bonus">
              🎁 Получить бонус
            </Link>
          </div>
        </div>

        <div className="home-hero__visual">
          <div className="home-video-card">
            <div className="home-video-top">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="home-video-screen">
              <div className="play-circle">▶</div>
              <p>Практика: монтаж эдита</p>
            </div>

            <div className="home-timeline">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>

          <div className="floating-card floating-card--one">CapCut PRO</div>

          <div className="floating-card floating-card--two">Premiere Pro</div>

          <div className="floating-card floating-card--three">TikTok Edit</div>
        </div>
      </section>

      <section className="home-stats">
        {stats.map((item) => (
          <div className="home-stat-card" key={item.label}>
            <strong>{item.number}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <p className="home-label">Направления</p>
          <h2>Выберите, чему хотите научиться</h2>
          <p>
            Курсы сделаны для новичков: можно начать без опыта и постепенно
            выйти на уровень, где уже можно брать первые заказы.
          </p>
        </div>

        <div className="home-directions">
          {directions.map((item) => (
            <article className="home-direction-card" key={item.title}>
              <div className="home-direction-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link to="/courses">Смотреть курсы →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-dark-section">
        <div className="home-dark-content">
          <p className="home-label">Как проходит обучение</p>
          <h2>Задания, видео-подсказки, прогресс и портфолио в одной платформе</h2>
          <p>
            Студент получает задачу, смотрит короткие видео-подсказки,
            выполняет монтаж в реальном редакторе и постепенно собирает
            собственные работы.
          </p>

          <Link to="/courses" className="home-btn home-btn--primary">
            Начать обучение
          </Link>
        </div>

        <div className="home-learning-steps">
          <div>
            <span>01</span>
            <h3>Получаете задачу</h3>
            <p>Каждый урок начинается с понятного результата.</p>
          </div>

          <div>
            <span>02</span>
            <h3>Смотрите подсказки</h3>
            <p>Видео помогает выполнить конкретный прием в редакторе.</p>
          </div>

          <div>
            <span>03</span>
            <h3>Выполняете задание</h3>
            <p>После урока есть практика для закрепления.</p>
          </div>

          <div>
            <span>04</span>
            <h3>Собираете портфолио</h3>
            <p>Готовые работы можно показывать клиентам.</p>
          </div>
        </div>
      </section>

      <section className="home-audience">
        <div className="home-section__head">
          <p className="home-label">Кому подходит</p>
          <h2>Платформа для тех, кто хочет создавать сильный контент</h2>
          <p>
            Frame School подходит новичкам, школьникам, блогерам и будущим
            digital-специалистам, которые хотят освоить монтаж и собрать первые
            работы.
          </p>
        </div>

        <div className="home-audience-grid">
          <article>
            <span>🎓</span>
            <h3>Новичкам</h3>
            <p>Можно начать с нуля, без опыта в монтаже и сложных программ.</p>
          </article>

          <article>
            <span>📱</span>
            <h3>Блогерам</h3>
            <p>Для TikTok, Reels, Shorts, YouTube и личного бренда.</p>
          </article>

          <article>
            <span>👨‍💻</span>
            <h3>Будущим специалистам</h3>
            <p>Чтобы собрать портфолио и подготовиться к первым заказам.</p>
          </article>
        </div>
      </section>

      <section className="home-results">
        <div>
          <p className="home-label">Результат обучения</p>
          <h2>Что студент получает после прохождения курса</h2>
          <p>
            После завершения курса студент получает не только знания, но и
            понятный результат: прогресс, практику, бонусы, сертификат и основу
            для портфолио.
          </p>
        </div>

        <div className="home-results-list">
          <article>
            <strong>01</strong>
            <span>Готовые практические работы</span>
          </article>

          <article>
            <strong>02</strong>
            <span>Бонусы: пресеты, LUT, чек-листы</span>
          </article>

          <article>
            <strong>03</strong>
            <span>Сертификат об окончании курса</span>
          </article>

          <article>
            <strong>04</strong>
            <span>Понимание, как брать первые заказы</span>
          </article>
        </div>
      </section>
      <section className="home-section">
        <div className="home-section__head">
          <p className="home-label">Преимущества</p>
          <h2>Почему выбирают Frame School</h2>
        </div>

        <div className="home-benefits">
          {benefits.map((item, index) => (
            <article className="home-benefit-card" key={item.title}>
              <span>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div>
          <p className="home-label">Начните бесплатно</p>
          <h2>Сделайте первый шаг к профессии видеомонтажёра</h2>
          <p>
            Пройдите бесплатную профориентацию, выберите направление и получите
            бонусные материалы для старта.
          </p>
        </div>

        <div className="home-cta__buttons">
          <Link to="/register" className="home-btn home-btn--primary">
            Зарегистрироваться
          </Link>

          <Link to="/bonus" className="home-btn home-btn--light">
            Получить бонус
          </Link>
        </div>
      </section>
    </main>
  );
}
