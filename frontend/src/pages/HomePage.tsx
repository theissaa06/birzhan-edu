import { Link } from "react-router-dom";
import { useAuthSession } from "../components/AuthSessionProvider";
import "./HomePage.css";

export default function HomePage() {
  const { isAuthenticated } = useAuthSession();
  const stats = [
    { number: "15 000+", label: "студентов обучаются" },
    { number: "40+", label: "курсов по монтажу" },
    { number: "87%", label: "нашли первых клиентов" },
    { number: "4.9", label: "средняя оценка платформы" },
  ];

  const directions = [
    {
      icon: "frame",
      title: "Видеомонтаж",
      text: "Собирайте историю из кадров: ритм, смысл, паузы, акценты и чистый финальный экспорт.",
    },
    {
      icon: "cut",
      title: "CapCut",
      text: "Быстрый мобильный монтаж без хаоса: нарезка, звук, переходы, титры и готовый ролик.",
    },
    {
      icon: "timeline",
      title: "Premiere Pro",
      text: "Профессиональный таймлайн: цвет, звук, титры, структура проекта и аккуратная сдача.",
    },
    {
      icon: "spark",
      title: "VFX и эдиты",
      text: "Эффекты, которые работают на кадр: speed ramp, flash, shake, glow и выразительный темп.",
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
      <section className="home-hero" data-frame-reveal="iris">
        <div className="home-hero__content">
          <p className="home-label">Frame School · монтажная студия обучения</p>

          <h1>
            Учим видеть кадр, <br />собирать ритм и делать{" "}
            <span>монтаж уверенно</span>
          </h1>

          <p className="home-hero__text">
            Здесь урок начинается не с теории ради теории, а с понятного
            результата: открыть редактор, собрать сцену, поправить звук,
            показать работу и увидеть прогресс.
          </p>

          <div className="home-hero__buttons">
            <Link to="/courses" className="home-btn home-btn--primary">
              <span className="fs-icon fs-icon--frame" aria-hidden="true" />
              Выбрать курс
            </Link>

            <Link to="/free" className="home-btn home-btn--light">
              Бесплатная профориентация
            </Link>

            <Link to="/bonus" className="home-btn home-btn--bonus">
              <span className="fs-icon fs-icon--premium" aria-hidden="true" />
              Получить стартовый пак
            </Link>
          </div>
        </div>

        <div className="home-hero__visual" aria-label="Объектив Frame School и монтажная шкала">
          <div className="home-lens-stage">
            <div className="home-viewfinder">
              <span className="home-viewfinder__corner home-viewfinder__corner--tl" />
              <span className="home-viewfinder__corner home-viewfinder__corner--tr" />
              <span className="home-viewfinder__corner home-viewfinder__corner--bl" />
              <span className="home-viewfinder__corner home-viewfinder__corner--br" />
              <span className="home-viewfinder__line home-viewfinder__line--v1" />
              <span className="home-viewfinder__line home-viewfinder__line--v2" />
              <span className="home-viewfinder__line home-viewfinder__line--h1" />
              <span className="home-viewfinder__line home-viewfinder__line--h2" />
            </div>

            <div className="home-lens">
              <span className="home-lens__ring home-lens__ring--outer" />
              <span className="home-lens__ring home-lens__ring--middle" />
              <span className="home-lens__ring home-lens__ring--inner" />
              <span className="home-lens__blade home-lens__blade--one" />
              <span className="home-lens__blade home-lens__blade--two" />
              <span className="home-lens__blade home-lens__blade--three" />
              <span className="home-lens__flare" />
            </div>

            <div className="home-edit-panel">
              <div className="home-edit-panel__top">
                <span>Scene 04</span>
                <strong>RHYTHM LOCK</strong>
              </div>
              <div className="home-edit-panel__timeline">
                <span />
                <span />
                <span />
                <span />
              </div>
              <p>кадр, звук, цвет, экспорт</p>
            </div>
          </div>

          <div className="floating-card floating-card--one">CapCut workflow</div>
          <div className="floating-card floating-card--two">Premiere timeline</div>
          <div className="floating-card floating-card--three">Portfolio shot</div>
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
              <div className="home-direction-icon">
                <span className={`fs-icon fs-icon--${item.icon}`} aria-hidden="true" />
              </div>
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
            <span className="fs-icon fs-icon--lens" aria-hidden="true" />
            <h3>Новичкам</h3>
            <p>Можно начать с нуля, без опыта в монтаже и сложных программ.</p>
          </article>

          <article>
            <span className="fs-icon fs-icon--frame" aria-hidden="true" />
            <h3>Блогерам</h3>
            <p>Для TikTok, Reels, Shorts, YouTube и личного бренда.</p>
          </article>

          <article>
            <span className="fs-icon fs-icon--timeline" aria-hidden="true" />
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
          <p className="home-label">
            {isAuthenticated ? "Продолжите обучение" : "Начните бесплатно"}
          </p>
          <h2>
            {isAuthenticated
              ? "Вернитесь к следующему практическому заданию"
              : "Сделайте первый шаг к профессии видеомонтажёра"}
          </h2>
          <p>
            {isAuthenticated
              ? "Откройте каталог, продолжите урок с места остановки или проверьте прогресс в личном кабинете."
              : "Пройдите бесплатную профориентацию, выберите направление и получите бонусные материалы для старта."}
          </p>
        </div>

        <div className="home-cta__buttons">
          {isAuthenticated ? (
            <>
              <Link to="/courses" className="home-btn home-btn--primary">
                Продолжить обучение
              </Link>
              <Link to="/profile" className="home-btn home-btn--light">
                Открыть профиль
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="home-btn home-btn--primary">
                Зарегистрироваться
              </Link>
              <Link to="/bonus" className="home-btn home-btn--light">
                Получить бонус
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
