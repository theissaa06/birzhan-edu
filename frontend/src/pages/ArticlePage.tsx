import { Link, useParams } from "react-router-dom";
import { getArticleBySlug, articles } from "../data/articles";
import "./ArticlePage.css";

export default function ArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <main className="article-page">
        <section className="article-error">
          <span>404</span>
          <h1>Статья не найдена</h1>
          <p>
            Возможно, материал был удалён или ссылка устарела. Вернитесь в медиа
            раздел и выберите другую статью.
          </p>
          <Link to="/free/media">← Вернуться в медиа</Link>
        </section>
      </main>
    );
  }

  const relatedArticles = articles
    .filter(
      (item) =>
        item.slug !== article.slug && item.category === article.category,
    )
    .slice(0, 2);

  return (
    <main className="article-page">
      <section className="article-hero">
        <div className="article-hero-content">
          <Link to="/free/media" className="article-back">
            ← Назад в медиа
          </Link>

          <div className="article-label-row">
            <span className="article-label">{article.category}</span>
            <span className="article-label article-label--time">
              ⏱ {article.readTime}
            </span>
          </div>

          <h1>{article.title}</h1>

          <p>{article.intro}</p>
        </div>

        <div className="article-hero-visual">
          <div>{article.icon}</div>
          <span>{article.tag}</span>
        </div>
      </section>

      <section className="article-layout">
        <article className="article-content">
          {article.sections.map((section) => (
            <section className="article-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}

          <section className="article-tips">
            <span>Практические советы</span>
            <h2>Что запомнить</h2>

            <div className="article-tips-list">
              {article.tips.map((tip) => (
                <div key={tip}>
                  <strong>✓</strong>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="article-sidebar">
          <div className="article-sidebar-card">
            <span>Связанный курс</span>
            <h3>Закрепите материал на практике</h3>
            <p>
              После чтения статьи перейдите к курсам и повторите действия в
              реальном уроке.
            </p>

            <Link to="/courses">Перейти к курсам →</Link>
          </div>

          <div className="article-sidebar-card article-sidebar-card--pro">
            <span>Premium PRO</span>
            <h3>Хотите разбор работ?</h3>
            <p>
              Premium PRO открывает проверку практики, вебинары, бонусы,
              портфолио-пак и карьерные материалы.
            </p>

            <Link to="/premium">Открыть PRO →</Link>
          </div>

          {relatedArticles.length > 0 && (
            <div className="article-sidebar-card">
              <span>Похожие статьи</span>

              <div className="article-related-list">
                {relatedArticles.map((item) => (
                  <Link to={`/free/media/${item.slug}`} key={item.slug}>
                    {item.icon} {item.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="article-final">
        <h2>Готовы перейти от чтения к практике?</h2>
        <p>
          Откройте курсы Birzhan-Edu, проходите уроки, выполняйте задания и
          собирайте свои первые работы.
        </p>

        <div className="article-final-actions">
          <Link to="/courses">Перейти к курсам →</Link>
          <Link to="/free/media">Читать другие статьи</Link>
        </div>
      </section>
    </main>
  );
}
