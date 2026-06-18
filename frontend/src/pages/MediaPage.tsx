/* =========================================
   Birzhan_edu — MediaPage 2026
   Файл: frontend/src/pages/MediaPage.jsx
   Тема платформы: видеомонтаж / эдитинг
   Стили подключаются из ./MediaPage.css (без изменений)
   ========================================= */

import { useState } from "react";
import "./MediaPage.css";

const CATEGORIES = ["Все", "Видеомонтаж", "Карьера", "Софт и инструменты", "Истории выпускников"];

const FEATURED_ARTICLE = {
  icon: "🎬",
  title: "Как наши выпускники получают первые заказы на монтаж без портфолио",
  text:
    "Поговорили с пятью выпускниками курса по видеомонтажу Birzhan_edu, которые нашли первых клиентов за 1–3 месяца после обучения. Делимся тем, что сработало: от тестового монтажа до общения с заказчиком.",
  author: "Алина Бекова",
  date: "12 июня 2026",
  readTime: "7 мин",
};

const ARTICLES = [
  {
    id: 1,
    icon: "✂️",
    category: "Видеомонтаж",
    title: "10 переходов, которые делают монтаж динамичным (и не выглядят дешёво)",
    excerpt:
      "Разбираем приёмы, которые держат внимание зрителя, и объясняем, когда переход работает, а когда мешает.",
    date: "15 июня",
    readTime: "5 мин",
    views: "2.1K",
  },
  {
    id: 2,
    icon: "🖥️",
    category: "Софт и инструменты",
    title: "DaVinci Resolve vs Premiere Pro: что выбрать новичку в 2026 году",
    excerpt:
      "Сравниваем два главных монтажных редактора по цене, возможностям цветокоррекции и порогу входа.",
    date: "10 июня",
    readTime: "6 мин",
    views: "3.4K",
  },
  {
    id: 3,
    icon: "💼",
    category: "Карьера",
    title: "Портфолио монтажёра: что показать, если заказов ещё не было",
    excerpt:
      "Как собрать три-четыре сильных ролика для портфолио, не имея ни одного реального проекта.",
    date: "6 июня",
    readTime: "4 мин",
    views: "1.8K",
  },
  {
    id: 4,
    icon: "🌟",
    category: "Истории выпускников",
    title: "От монтажа влогов на телефоне до своей студии: путь Алии",
    excerpt:
      "Алия начала монтировать ролики для себя, а через год собрала команду из трёх человек. Что изменилось по пути.",
    date: "2 июня",
    readTime: "8 мин",
    views: "4.7K",
  },
  {
    id: 5,
    icon: "🎵",
    category: "Видеомонтаж",
    title: "Звук решает половину монтажа: как подобрать музыку и шумы",
    excerpt:
      "Разбираем, почему ролик с плохим звуком теряет зрителя быстрее, чем с плохой картинкой — и как это исправить.",
    date: "28 мая",
    readTime: "6 мин",
    views: "2.9K",
  },
  {
    id: 6,
    icon: "🎯",
    category: "Карьера",
    title: "Сколько брать за монтаж: ценник для новичка и для опытного специалиста",
    excerpt:
      "Честный разговор о расценках на монтаж в 2026 году — от роликов для соцсетей до клипов и рекламы.",
    date: "24 мая",
    readTime: "7 мин",
    views: "3.1K",
  },
];

const POPULAR_ARTICLES = [
  "DaVinci Resolve vs Premiere Pro: что выбрать новичку",
  "Портфолио монтажёра: что показать без реальных заказов",
  "10 переходов, которые делают монтаж динамичным",
  "Сколько брать за монтаж: ценник для новичка",
  "Как монтировать Reels и Shorts, которые смотрят до конца",
];

const CATEGORY_STATS = [
  { name: "Видеомонтаж", icon: "✂️", count: 28 },
  { name: "Карьера", icon: "💼", count: 16 },
  { name: "Софт и инструменты", icon: "🖥️", count: 14 },
  { name: "Истории выпускников", icon: "🌟", count: 11 },
];

export default function MediaPage() {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filteredArticles = ARTICLES.filter((article) => {
    const matchesCategory = activeCategory === "Все" || article.category === activeCategory;
    const matchesQuery =
      query === "" || `${article.title} ${article.excerpt}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="media-page">
      <div className="media-container">
        {/* Hero */}
        <section className="media-hero">
          <div className="media-hero__content">
            <span className="media-kicker">Медиа Birzhan_edu</span>
            <h1 className="media-title">
              Монтируй так, чтобы <span>смотрели до конца</span>
            </h1>
            <p className="media-subtitle">
              Статьи, разборы и истории от выпускников и преподавателей Birzhan_edu — о монтаже,
              софте и работе, которая держит внимание зрителя.
            </p>
          </div>
          <div className="media-hero__visual">
            <div className="media-float media-float--one">✂️ 540+ разборов</div>
            <div className="media-main-icon">🎬</div>
            <div className="media-float media-float--two">🧑‍🎓 13 200 учеников</div>
            <div className="media-float media-float--three">🗓 Новый разбор по средам</div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="media-toolbar">
          <div className="media-filters">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`media-filter${activeCategory === category ? " active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="media-search">
            <input
              type="text"
              className="media-search-input"
              placeholder="Найдите статью по теме, слову или автору"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {/* Featured article */}
        <section className="media-featured">
          <div className="media-featured-content">
            <span className="media-featured-badge">Сейчас читают</span>
            <h2 className="media-featured-title">{FEATURED_ARTICLE.title}</h2>
            <p className="media-featured-text">{FEATURED_ARTICLE.text}</p>
            <div className="media-featured-meta">
              <span>✍️ {FEATURED_ARTICLE.author}</span>
              <span>📅 {FEATURED_ARTICLE.date}</span>
              <span>⏱ {FEATURED_ARTICLE.readTime}</span>
            </div>
            <div className="media-featured-action">
              <a href="#" className="media-btn media-btn--primary">
                Читать историю →
              </a>
            </div>
          </div>
          <div className="media-featured-cover">{FEATURED_ARTICLE.icon}</div>
        </section>

        {/* Main layout: articles + sidebar */}
        <div className="media-layout">
          <div className="media-main">
            <div className="media-section-head">
              <h2>Свежие материалы</h2>
              <p className="media-section-text">
                Подборка статей для тех, кто учится монтажу, ищет первые заказы или растёт в
                профессии.
              </p>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="media-empty">
                Пока нет статей по этому запросу. Попробуйте другую категорию или другое слово в
                поиске.
              </div>
            ) : (
              <div className="media-grid">
                {filteredArticles.map((article) => (
                  <article key={article.id} className="media-card">
                    <div className="media-card-cover">{article.icon}</div>
                    <div className="media-card-body">
                      <span className="media-card-category">{article.category}</span>
                      <h3 className="media-card-title">{article.title}</h3>
                      <p className="media-card-text">{article.excerpt}</p>
                      <div className="media-card-meta">
                        <span>📅 {article.date}</span>
                        <span>⏱ {article.readTime}</span>
                        <span>👁 {article.views}</span>
                      </div>
                      <div className="media-card-action">
                        <a href="#" className="media-link">
                          Читать статью →
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="media-sidebar">
            <div className="media-sidebar-card">
              <h3 className="media-sidebar-title">🔥 Популярное</h3>
              <div className="media-popular-list">
                {POPULAR_ARTICLES.map((title, index) => (
                  <a key={title} href="#" className="media-popular-item">
                    <span className="media-popular-number">{index + 1}</span>
                    <span>{title}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="media-sidebar-card">
              <h3 className="media-sidebar-title">Категории</h3>
              <div className="media-category-list">
                {CATEGORY_STATS.map((category) => (
                  <a
                    key={category.name}
                    href="#"
                    className="media-category-item"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveCategory(category.name);
                    }}
                  >
                    <span className="media-category-icon">{category.icon}</span>
                    <span>{category.name}</span>
                    <span style={{ marginLeft: "auto", color: "#64748b" }}>
                      {category.count}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Final CTA */}
        <section className="media-final">
          <h2>Получайте новые разборы по почте</h2>
          <p>
            Раз в неделю — самое полезное из медиа Birzhan_edu: разборы монтажа, обзоры
            инструментов и истории выпускников. Без спама.
          </p>
          <a href="#" className="media-btn media-btn--primary">
            Подписаться на рассылку
          </a>
        </section>
      </div>
    </div>
  );
}