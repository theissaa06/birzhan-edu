import { Link } from "react-router-dom";
import "./MediaPage.css";

const categories = [
  "Все",
  "CapCut",
  "Premiere Pro",
  "TikTok",
  "Цветокоррекция",
  "Карьера",
];

const articles = [
  {
    icon: "✂️",
    category: "CapCut",
    title: "Как начать монтаж в CapCut с нуля",
    text: "Разбираем первые шаги: создание проекта, импорт видео, нарезка, музыка, текст и экспорт.",
    readTime: "5 минут",
    tag: "Новичкам",
  },
  {
    icon: "🎞️",
    category: "Premiere Pro",
    title: "Premiere Pro: что нужно знать новичку",
    text: "Интерфейс, таймлайн, инструменты, базовая нарезка и правильный экспорт первого ролика.",
    readTime: "7 минут",
    tag: "Гайд",
  },
  {
    icon: "📱",
    category: "TikTok",
    title: "Как делать TikTok-эдиты под бит",
    text: "Хук, ритм, быстрые склейки, zoom, shake, flash и удержание внимания зрителя.",
    readTime: "6 минут",
    tag: "Практика",
  },
  {
    icon: "🎨",
    category: "Цветокоррекция",
    title: "Базовая цветокоррекция для красивой картинки",
    text: "Контраст, насыщенность, температура, свет, тени и cinematic-настроение видео.",
    readTime: "4 минуты",
    tag: "Стиль",
  },
  {
    icon: "💼",
    category: "Карьера",
    title: "Как собрать первое портфолио монтажёра",
    text: "Что добавить в портфолио, как оформить работы и как показать клиенту свой уровень.",
    readTime: "8 минут",
    tag: "Карьера",
  },
  {
    icon: "🤖",
    category: "AI",
    title: "AI-инструменты для видеомонтажа",
    text: "Как использовать ИИ для сценариев, идей, описаний, хуков и контент-плана.",
    readTime: "5 минут",
    tag: "2026",
  },
];

const popular = [
  "Топ-5 ошибок новичков в монтаже",
  "Как выбрать музыку для эдита",
  "Что такое beat sync",
  "Как сделать красивый zoom-переход",
];

export default function MediaPage() {
  return (
    <main className="media-page">
      <section className="media-hero">
        <div className="media-hero__content">
          <p className="media-label">Медиа Birzhan-Edu</p>

          <h1>
            Гайды, новости и статьи про <span>видеомонтаж</span>
          </h1>

          <p>
            Читайте полезные материалы о CapCut, Premiere Pro, TikTok-эдитах,
            цветокоррекции, звуке, AI-инструментах и карьере в digital.
          </p>

          <div className="media-actions">
            <Link to="/courses" className="media-btn media-btn--primary">
              Смотреть курсы
            </Link>

            <Link to="/free" className="media-btn media-btn--light">
              Бесплатные материалы
            </Link>
          </div>
        </div>

        <div className="media-hero__visual">
          <div className="media-main-icon">📰</div>
          <div className="media-float media-float--one">Гайды</div>
          <div className="media-float media-float--two">Новости</div>
          <div className="media-float media-float--three">Практика</div>
        </div>
      </section>

      <section className="media-categories-section">
        <div className="media-categories">
          {categories.map((category, index) => (
            <button
              className={
                index === 0 ? "media-category active" : "media-category"
              }
              key={category}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="media-content">
        <div className="media-main">
          <div className="media-section-head">
            <p className="media-label">Свежие материалы</p>
            <h2>Полезные статьи для роста</h2>
            <p>
              Материалы помогают закрепить уроки, разобраться в инструментах и
              быстрее перейти к практике.
            </p>
          </div>

          <div className="media-grid">
            {articles.map((article) => (
              <article className="media-card" key={article.title}>
                <div className="media-card__top">
                  <div className="media-card-icon">{article.icon}</div>
                  <span>{article.tag}</span>
                </div>

                <p className="media-card-category">{article.category}</p>
                <h3>{article.title}</h3>
                <p>{article.text}</p>

                <div className="media-card__bottom">
                  <span>⏱ {article.readTime}</span>
                  <Link to="/courses">Читать →</Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="media-sidebar">
          <div className="media-sidebar-card">
            <p className="media-label media-label--dark">Популярное</p>
            <h3>Что читают чаще всего</h3>

            <div className="media-popular-list">
              {popular.map((item, index) => (
                <Link to="/courses" key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="media-sidebar-card media-sidebar-card--bonus">
            <h3>Получите бонусы 2026</h3>
            <p>
              Presets, LUT, чек-листы, AI-паки и шаблоны для первых проектов.
            </p>

            <Link to="/bonus" className="media-btn media-btn--primary">
              Забрать бонус
            </Link>
          </div>
        </aside>
      </section>

      <section className="media-final">
        <h2>Хотите не только читать, но и практиковаться?</h2>
        <p>
          Переходите к курсам, смотрите уроки и создавайте свои первые работы.
        </p>

        <Link to="/courses" className="media-btn media-btn--primary">
          Перейти к обучению →
        </Link>
      </section>
    </main>
  );
}
