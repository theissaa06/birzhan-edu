import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import { useAuthSession } from "../components/AuthSessionProvider";
import api from "../services/api";
import { showToast } from "../services/appToast";
import "./ReviewsPage.css";

type Author = { id: number; username: string; roles: string[] };
type Comment = { id: number; text: string; createdAt: string; author: Author };
type Review = { id: number; name: string; text: string; rating: number; direction?: string | null; userId: number; createdAt: string; updatedAt: string; author?: Author | null; comments: Comment[]; officialReply?: { id: number; text: string; label: string; createdAt: string; author: Author } | null };
const directions = ["Общее впечатление", "CapCut", "Premiere Pro", "TikTok / Reels", "Цветокоррекция", "Звук", "VFX и эффекты"];

export default function ReviewsPage() {
  const { user, isAuthenticated } = useAuthSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [direction, setDirection] = useState(directions[0]);
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Record<number, string>>({});
  const [sending, setSending] = useState(false);

  const fetchReviews = useCallback(async (cacheBust = false) => {
    const { data } = await api.get("/reviews", cacheBust ? { params: { refresh: Date.now() } } : undefined);
    const next = data.reviews ?? data.data;
    if (data.success === false || !Array.isArray(next)) {
      throw new Error("Сервер вернул некорректный список отзывов.");
    }
    return next as Review[];
  }, []);
  useEffect(() => {
    let active = true;
    void fetchReviews()
      .then((next) => { if (active) setReviews(next); })
      .catch((error) => {
        if (!active) return;
        showToast({ tone: "error", title: "Отзывы", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || (error instanceof Error ? error.message : "Не удалось загрузить отзывы.") });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchReviews]);

  const ownReview = reviews.find((review) => review.userId === user?.id);
  useEffect(() => { if (ownReview) { setRating(ownReview.rating); setDirection(ownReview.direction || directions[0]); setText(ownReview.text); } }, [ownReview?.id]);
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews]);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (text.trim().length < 20) { showToast({ tone: "warning", title: "Отзыв слишком короткий", message: "Напишите не менее 20 символов." }); return; }
    try {
      setSending(true);
      const { data } = await api.post("/reviews", { rating, direction, text: text.trim() });
      const saved = data.review as Review | undefined;
      if (data.success !== true || !saved?.id || saved.userId !== user?.id) {
        throw new Error("Сервер не подтвердил сохранение отзыва.");
      }

      const refreshed = await fetchReviews(true);
      const confirmed = refreshed.find((review) => review.id === saved.id);
      if (!confirmed || confirmed.text !== saved.text || confirmed.rating !== saved.rating) {
        throw new Error("Отзыв сохранён, но не появился в опубликованном списке. Повторите попытку позже.");
      }
      setReviews(refreshed);
      const updated = data.operation === "updated";
      showToast({ tone: "success", title: updated ? "Отзыв обновлён" : "Отзыв опубликован", message: data.message || (updated ? "Изменения сохранены на сервере." : "Отзыв сохранён на сервере.") });
    }
    catch (error) { showToast({ tone: "error", title: "Отзыв не сохранён", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || (error instanceof Error ? error.message : "Повторите позже.") }); }
    finally { setSending(false); }
  }

  async function submitComment(reviewId: number) {
    const value = comments[reviewId]?.trim();
    if (!value) return;
    try {
      const { data } = await api.post(`/reviews/${reviewId}/comments`, { text: value });
      if (data.success !== true || !data.comment?.id) throw new Error("Сервер не подтвердил сохранение комментария.");
      const refreshed = await fetchReviews(true);
      if (!refreshed.find((review) => review.id === reviewId)?.comments?.some((comment) => comment.id === data.comment.id)) {
        throw new Error("Комментарий сохранён, но не появился в списке.");
      }
      setReviews(refreshed);
      setComments((current) => ({ ...current, [reviewId]: "" }));
      showToast({ tone: "success", title: "Комментарий опубликован", message: "Автор отзыва получит уведомление." });
    }
    catch (error) { showToast({ tone: "error", title: "Комментарий не сохранён", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || (error instanceof Error ? error.message : "Повторите позже.") }); }
  }

  return <main className="reviews-page"><header className="reviews-head"><span className="timecode">COMMUNITY / REVIEWS</span><h1>Отзывы студентов</h1><p>Один редактируемый отзыв на аккаунт. Комментарии и официальные ответы хранятся на сервере.</p><dl><div><dt>Опубликовано</dt><dd>{reviews.length}</dd></div><div><dt>Средняя оценка</dt><dd>{average.toFixed(1)} / 5</dd></div></dl></header>
    <section className="reviews-layout"><div className="reviews-list">{loading && <div className="reviews-state">Загружаем отзывы…</div>}{!loading && !reviews.length && <div className="reviews-state"><FrameIcon name="frame" /><h2>Отзывов пока нет</h2><p>Станьте первым автором после входа.</p></div>}{reviews.map((review) => <article key={review.id} className="review-card"><header><div><strong>{review.author?.username || review.name}</strong><span>{review.direction || "Общее впечатление"}</span></div><b>{review.rating} / 5</b></header><p>{review.text}</p><small>{new Date(review.updatedAt || review.createdAt).toLocaleDateString("ru-RU")}</small>{review.officialReply && <blockquote><strong>{review.officialReply.label}</strong><p>{review.officialReply.text}</p></blockquote>}<section className="review-comments" aria-label="Комментарии"><h3>Комментарии · {review.comments?.length || 0}</h3>{review.comments?.map((comment) => <div key={comment.id}><strong>{comment.author?.username || "Пользователь"}</strong><p>{comment.text}</p></div>)}{isAuthenticated ? <form onSubmit={(event) => { event.preventDefault(); void submitComment(review.id); }}><input value={comments[review.id] || ""} onChange={(event) => setComments((current) => ({...current,[review.id]:event.target.value}))} minLength={2} maxLength={1000} placeholder="Добавить комментарий" aria-label={`Комментарий к отзыву ${review.name}`} /><button>Отправить</button></form> : <Link to="/login">Войдите, чтобы комментировать</Link>}</section></article>)}</div>
      <aside className="review-editor"><h2>{ownReview ? "Редактировать отзыв" : "Оставить отзыв"}</h2>{isAuthenticated ? <form onSubmit={submitReview}><fieldset><legend>Оценка</legend><div className="review-rating">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={rating === value ? "active" : ""} aria-pressed={rating === value} onClick={() => setRating(value)}>{value}</button>)}</div></fieldset><label>Направление<select value={direction} onChange={(event) => setDirection(event.target.value)}>{directions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Текст<textarea value={text} onChange={(event) => setText(event.target.value)} minLength={20} maxLength={1500} rows={8} required /></label><button type="submit" disabled={sending}>{sending ? "Сохраняем…" : ownReview ? "Обновить отзыв" : "Опубликовать отзыв"}</button></form> : <div className="reviews-state"><p>Авторизуйтесь, чтобы оставить один редактируемый отзыв.</p><Link to="/login">Войти</Link></div>}</aside></section>
  </main>;
}
