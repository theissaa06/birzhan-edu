import { Link } from "react-router-dom";
import "./ReviewsPage.css";

const reviews = [
  {
    name: "Алихан",
    direction: "CapCut с нуля",
    avatar: "А",
    rating: 5,
    text: "Я вообще не понимал, как монтировать видео. После первых уроков уже сделал ролик для TikTok и понял, как работает монтаж под музыку.",
    result: "Собрал 5 роликов",
  },
  {
    name: "Аружан",
    direction: "TikTok / Reels",
    avatar: "А",
    rating: 5,
    text: "Очень понравилось, что всё объясняется простым языком. Я научилась делать быстрые склейки, zoom и shake-эффекты.",
    result: "Сделала первый эдит",
  },
  {
    name: "Дамир",
    direction: "Premiere Pro",
    avatar: "Д",
    rating: 5,
    text: "Premiere Pro раньше казался сложным, но после пошаговых уроков стало понятно, где таймлайн, как резать видео и экспортировать.",
    result: "Собрал cinematic-видео",
  },
  {
    name: "Мадина",
    direction: "Цветокоррекция",
    avatar: "М",
    rating: 5,
    text: "Блок по цвету помог сделать видео красивее. Теперь я понимаю контраст, насыщенность, температуру и как создать стиль.",
    result: "Улучшила визуал роликов",
  },
  {
    name: "Ерасыл",
    direction: "Звук в монтаже",
    avatar: "Е",
    rating: 5,
    text: "Я понял, что звук — это половина качества видео. Теперь лучше подбираю музыку и делаю монтаж под бит.",
    result: "Научился работать со звуком",
  },
  {
    name: "Диана",
    direction: "VFX и эффекты",
    avatar: "Д",
    rating: 5,
    text: "Самое интересное — эффекты. Shake, flash, zoom и glitch реально делают видео мощнее и современнее.",
    result: "Сделала эффектный эдит",
  },
];

const stats = [
  { value: "4.9", label: "средняя оценка" },
  { value: "15 000+", label: "студентов" },
  { value: "87%", label: "начали делать проекты" },
  { value: "1 200+", label: "учебных работ" },
];

const highlights = [
  {
    icon: "🎬",
    title: "Понятные уроки",
    text: "Студенты отмечают, что материал объясняется простым языком и без лишней сложности.",
  },
  {
    icon: "📝",
    title: "Практика после уроков",
    text: "После каждого урока есть задание, чтобы сразу закрепить материал.",
  },
  {
    icon: "🚀",
    title: "Быстрый первый результат",
    text: "Многие делают первый ролик уже после стартовых уроков.",
  },
  {
    icon: "🎁",
    title: "Бонусы и материалы",
    text: "Пресеты, чек-листы и гайды помогают быстрее начать практику.",
  },
];

export default function ReviewsPage() {
  return (
    <main className="reviews-page">
      <section className="reviews-hero">
        <div className="reviews-hero__content">
          <p className="reviews-label">Отзывы студентов</p>

          <h1>
            Что говорят ученики о <span>Frame School</span>
          </h1>

          <p>
            Здесь собраны отзывы студентов, которые начали изучать монтаж,
            CapCut, Premiere Pro, TikTok-эдиты, цветокоррекцию, звук и VFX.
          </p>

          <div className="reviews-actions">
            <Link to="/courses" className="reviews-btn reviews-btn--primary">
              Начать обучение
            </Link>

            <Link to="/students" className="reviews-btn reviews-btn--light">
              Истории студентов
            </Link>
          </div>
        </div>

        <div className="reviews-hero__visual">
          <div className="reviews-main-icon">⭐</div>
          <div className="reviews-float reviews-float--one">4.9 рейтинг</div>
          <div className="reviews-float reviews-float--two">Отзывы</div>
          <div className="reviews-float reviews-float--three">Практика</div>
        </div>
      </section>

      <section className="reviews-stats">
        {stats.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="reviews-section">
        <div className="reviews-section-head">
          <p className="reviews-label">Реальные впечатления</p>
          <h2>Отзывы после первых уроков и практики</h2>
          <p>
            Студенты чаще всего отмечают понятную подачу, красивый дизайн,
            практические задания и быстрый первый результат.
          </p>
        </div>

        <div className="reviews-grid">
          {reviews.map((review) => (
            <article
              className="review-card"
              key={`${review.name}-${review.direction}`}
            >
              <div className="review-card__top">
                <div className="review-avatar">{review.avatar}</div>

                <div>
                  <h3>{review.name}</h3>
                  <p>{review.direction}</p>
                </div>
              </div>

              <div className="review-stars">{"★".repeat(review.rating)}</div>

              <p className="review-text">“{review.text}”</p>

              <div className="review-result">
                <span>Результат</span>
                <strong>{review.result}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews-dark">
        <div>
          <p className="reviews-label reviews-label--dark">Что нравится</p>
          <h2>Почему студентам удобно учиться на платформе</h2>
          <p>
            Платформа построена так, чтобы новичок не терялся: есть понятные
            уроки, практика, бонусы и постепенное движение к портфолио.
          </p>
        </div>

        <div className="reviews-highlights">
          {highlights.map((item) => (
            <article key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews-faq-section">
        <div className="reviews-section-head">
          <p className="reviews-label">FAQ</p>
          <h2>Частые вопросы по отзывам</h2>
        </div>

        <div className="reviews-faq">
          <details open>
            <summary>Отзывы настоящие?</summary>
            <p>
              Для демонстрационной версии проекта отзывы оформлены как пример
              пользовательских историй. В реальном запуске их можно заменить на
              отзывы настоящих студентов.
            </p>
          </details>

          <details>
            <summary>Можно ли добавить отзывы из базы данных?</summary>
            <p>
              Да. Позже можно подключить backend-модель Review и выводить отзывы
              через API, как мы уже сделали с курсами.
            </p>
          </details>

          <details>
            <summary>Можно ли сделать форму для нового отзыва?</summary>
            <p>
              Да. Можно добавить форму, где студент оставляет имя, направление,
              оценку и текст отзыва.
            </p>
          </details>
        </div>
      </section>

      <section className="reviews-final">
        <h2>Хотите оставить свой результат здесь?</h2>
        <p>
          Начните обучение, пройдите уроки, сделайте первые ролики и соберите
          портфолио.
        </p>

        <Link to="/courses" className="reviews-btn reviews-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
