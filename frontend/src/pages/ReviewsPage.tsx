import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import UserBadges from "../components/UserBadges";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import "./ReviewsPage.css";

type Review = {
  id: number;
  name: string;
  text: string;
  rating: number;
  direction?: string | null;
  badges?: string[];
  createdAt: string;
  updatedAt?: string;
};

const directionOptions = [
  "Общее впечатление",
  "CapCut",
  "Premiere Pro",
  "TikTok / Reels",
  "Цветокоррекция",
  "Звук",
  "VFX и эффекты",
];

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ReviewsPage() {
  const { user, isAuthenticated } = useAuthSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rating, setRating] = useState(5);
  const [direction, setDirection] = useState(directionOptions[0]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        setLoading(true);
        setLoadError("");
        const response = await api.get("/reviews");
        const items = response.data?.reviews;
        if (active) setReviews(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("[Reviews] Не удалось загрузить отзывы.", error);
        if (active) {
          setLoadError("Не удалось загрузить отзывы из базы данных.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReviews();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const count = reviews.length;
    const average = count
      ? reviews.reduce((total, review) => total + review.rating, 0) / count
      : 0;
    const fiveStar = reviews.filter((review) => review.rating === 5).length;
    return { count, average, fiveStar };
  }, [reviews]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();

    if (cleanText.length < 20) {
      setFormError("Напишите минимум 20 символов, чтобы отзыв был полезным.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setFormMessage("");

      const response = await api.post("/reviews", {
        rating,
        direction,
        text: cleanText,
      });
      const savedReview = response.data?.review as Review | undefined;

      if (!savedReview) {
        throw new Error("Backend returned an empty review");
      }

      setReviews((current) => [
        savedReview,
        ...current.filter((review) => review.id !== savedReview.id),
      ]);
      setText("");
      setFormMessage(
        response.data?.message || "Отзыв опубликован и уже виден на странице.",
      );
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      console.error("[Reviews] Не удалось сохранить отзыв.", error);
      setFormError(message || "Не удалось сохранить отзыв. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="reviews-page">
      <section className="reviews-hero">
        <div>
          <p className="reviews-kicker">Отзывы из БД</p>
          <h1>Опыт студентов без демонстрационных карточек</h1>
          <p className="reviews-subtitle">
            Здесь отображаются только отзывы, отправленные авторизованными
            пользователями Frame School. Имя и значки подтверждаются аккаунтом.
          </p>
          <div className="reviews-actions">
            {isAuthenticated ? (
              <a href="#review-form" className="reviews-btn reviews-btn--primary">
                Оставить отзыв
              </a>
            ) : (
              <Link to="/login" className="reviews-btn reviews-btn--primary">
                Войти и оставить отзыв
              </Link>
            )}
            <Link to="/courses" className="reviews-btn reviews-btn--light">
              Перейти к курсам
            </Link>
          </div>
        </div>
        <div className="reviews-hero-mark" aria-hidden="true">
          <FrameIcon name="frame" />
          <span>REC</span>
        </div>
      </section>

      <section className="reviews-summary" aria-label="Статистика отзывов">
        <article>
          <strong>{summary.count ? summary.average.toFixed(1) : "—"}</strong>
          <span>средняя оценка</span>
        </article>
        <article>
          <strong>{summary.count}</strong>
          <span>реальных отзывов</span>
        </article>
        <article>
          <strong>{summary.fiveStar}</strong>
          <span>оценок 5 из 5</span>
        </article>
      </section>

      <section className="reviews-section" aria-labelledby="reviews-list-title">
        <div className="reviews-section-head">
          <p className="reviews-kicker">Лента студентов</p>
          <h2 id="reviews-list-title">Что пишут пользователи платформы</h2>
        </div>

        {loading && <div className="reviews-loading">Загружаем отзывы из базы данных...</div>}
        {!loading && loadError && <div className="reviews-error" role="alert">{loadError}</div>}
        {!loading && !loadError && reviews.length === 0 && (
          <div className="reviews-empty">
            <FrameIcon name="frame" />
            <strong>Отзывов пока нет</strong>
            <p>Первый опубликованный отзыв появится здесь сразу после отправки.</p>
          </div>
        )}

        {!loading && !loadError && reviews.length > 0 && (
          <div className="reviews-grid">
            {reviews.map((review) => (
              <article className="review-card review-card--static" key={review.id}>
                <header className="review-card__top">
                  <div className="review-avatar" aria-hidden="true">
                    {(review.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="review-author-copy">
                    <div className="review-author-line">
                      <h3>{review.name}</h3>
                      <UserBadges badges={review.badges} compact />
                    </div>
                    <p>{review.direction || "Frame School"}</p>
                  </div>
                </header>
                <div className="review-stars" aria-label={`Оценка ${review.rating} из 5`}>
                  {"★".repeat(review.rating)}
                  <span>{"★".repeat(5 - review.rating)}</span>
                </div>
                <p className="review-text">{review.text}</p>
                <time dateTime={review.updatedAt || review.createdAt}>
                  {formatReviewDate(review.updatedAt || review.createdAt)}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="reviews-form-section" id="review-form">
        <div className="reviews-form-copy">
          <p className="reviews-kicker">Ваше мнение</p>
          <h2>Оставить отзыв</h2>
          <p>
            Отзыв связан с вашим аккаунтом. Повторная отправка обновит ранее
            опубликованный текст, а не создаст дубликат.
          </p>
          {isAuthenticated && (
            <div className="reviews-current-user">
              <span>{(user?.username || user?.email || "U").slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user?.username || user?.email || "Пользователь"}</strong>
                <UserBadges
                  role={user?.role}
                  badges={user?.badges}
                  premiumUntil={String(user?.premiumUntil || "") || null}
                  isPremium={user?.isPremium === true}
                />
              </div>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <form className="reviews-form" onSubmit={submitReview}>
            <fieldset>
              <legend>Оценка</legend>
              <div className="reviews-rating-input">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    className={value <= rating ? "is-active" : ""}
                    onClick={() => setRating(value)}
                    aria-label={`Поставить ${value} из 5`}
                    aria-pressed={rating === value}
                    key={value}
                  >
                    ★
                  </button>
                ))}
                <strong>{rating}/5</strong>
              </div>
            </fieldset>

            <label>
              Направление
              <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                {directionOptions.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Отзыв
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 1500))}
                rows={7}
                minLength={20}
                maxLength={1500}
                placeholder="Расскажите, какой курс прошли, что получилось и что можно улучшить..."
                required
              />
              <span className="reviews-character-count">{text.length}/1500</span>
            </label>

            {formError && <div className="reviews-form-message reviews-form-message--error" role="alert">{formError}</div>}
            {formMessage && <div className="reviews-form-message reviews-form-message--success" role="status">{formMessage}</div>}

            <button className="reviews-submit" type="submit" disabled={submitting || text.trim().length < 20}>
              {submitting ? "Публикуем..." : "Опубликовать отзыв"}
            </button>
          </form>
        ) : (
          <div className="reviews-login-prompt">
            <FrameIcon name="lens" />
            <strong>Войдите в аккаунт</strong>
            <p>Так имя и значки в отзыве будут подтверждены данными профиля.</p>
            <Link to="/login" className="reviews-btn reviews-btn--primary">Войти</Link>
          </div>
        )}
      </section>
    </main>
  );
}
