import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon, { type FrameIconName } from "../components/FrameIcon";
import { sendSupportMessage } from "../services/support";
import "./SupportPage.css";

const helpCards = [
  {
    icon: "frame",
    title: "Проблема с уроком",
    text: "Если видео не открывается, урок не загружается или не сохраняется прогресс.",
  },
  {
    icon: "lens",
    title: "Аккаунт и вход",
    text: "Помощь со входом, регистрацией, паролем и личным кабинетом.",
  },
  {
    icon: "premium",
    title: "Бонусы",
    text: "Если бонус не открылся, не отображается или вы не можете его получить.",
  },
  {
    icon: "briefcase",
    title: "Курсы и доступ",
    text: "Вопросы по курсам, доступу к материалам, программе обучения и урокам.",
  },
] satisfies Array<{ icon: FrameIconName; title: string; text: string }>;

const faqItems = [
  {
    question: "Почему не открывается урок?",
    answer:
      "Проверьте интернет, обновите страницу и убедитесь, что backend запущен. Если проблема остаётся — отправьте обращение.",
  },
  {
    question: "Как получить бонус?",
    answer:
      "Перейдите на страницу бонусов, нажмите кнопку получения бонуса и проверьте личный кабинет.",
  },
  {
    question: "Что делать, если не получается войти?",
    answer:
      "Проверьте email и пароль. Если backend работает, но вход не проходит, попробуйте зарегистрироваться заново или обратитесь в поддержку.",
  },
  {
    question: "Можно ли написать администратору?",
    answer:
      "Да. Через форму обращения можно описать проблему, и сообщение появится в админ-панели.",
  },
];

export default function SupportPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "lesson",
    message: "",
  });

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      setError("Заполни имя, email и сообщение.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setSent(false);

      const clientRequestId = requestIdRef.current || (
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `support:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`
      );
      requestIdRef.current = clientRequestId;

      const storedMessage = await sendSupportMessage({
        text: form.message,
        name: form.name,
        email: form.email,
        topic: form.topic,
        clientRequestId,
      });
      if (!storedMessage?.id) throw new Error("Сервер не подтвердил сохранение обращения.");

      setSent(true);
      requestIdRef.current = null;

      setForm({
        name: "",
        email: "",
        topic: "lesson",
        message: "",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Не удалось отправить обращение. Проверь backend и попробуй ещё раз.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="support-page">
      <section className="support-hero">
        <div className="support-hero__content">
          <p className="support-label">Центр поддержки</p>

          <h1>
            Поможем решить вопрос по <span>Frame School</span>
          </h1>

          <p>
            Если возникла проблема с уроком, входом, бонусами, курсами или
            личным кабинетом — опишите ситуацию, и поддержка поможет
            разобраться.
          </p>

          <div className="support-actions">
            <a
              href="#support-form"
              className="support-btn support-btn--primary"
            >
              Написать в поддержку
            </a>

            <Link to="/courses" className="support-btn support-btn--light">
              Вернуться к курсам
            </Link>
          </div>
        </div>

        <div className="support-hero__visual">
          <div className="support-main-icon">
            <FrameIcon name="lens" />
          </div>
          <div className="support-float support-float--one">FAQ</div>
          <div className="support-float support-float--two">Помощь</div>
          <div className="support-float support-float--three">24/7</div>
        </div>
      </section>

      <section className="support-stats">
        <div>
          <strong>4</strong>
          <span>раздела помощи</span>
        </div>
        <div>
          <strong>FAQ</strong>
          <span>быстрые ответы</span>
        </div>
        <div>
          <strong>1 мин</strong>
          <span>чтобы отправить вопрос</span>
        </div>
        <div>
          <strong>Admin</strong>
          <span>попадает в панель</span>
        </div>
      </section>

      <section className="support-section">
        <div className="support-section-head">
          <p className="support-label">Темы обращения</p>
          <h2>С чем может помочь поддержка</h2>
          <p>
            Выберите подходящую тему и опишите проблему максимально понятно:
            какая страница, какая кнопка, что именно не работает.
          </p>
        </div>

        <div className="support-grid">
          {helpCards.map((card) => (
            <article className="support-card" key={card.title}>
              <div><FrameIcon name={card.icon} /></div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="support-dark">
        <div>
          <p className="support-label support-label--dark">
            Как описать проблему
          </p>
          <h2>Чтобы быстрее помочь, напишите детали</h2>
          <p>
            Хорошее обращение помогает быстрее найти причину ошибки и исправить
            её без долгих уточнений.
          </p>
        </div>

        <div className="support-checklist">
          <div>
            <span>✓</span>
            <p>Укажите страницу, где возникла проблема</p>
          </div>
          <div>
            <span>✓</span>
            <p>Опишите, какую кнопку нажали</p>
          </div>
          <div>
            <span>✓</span>
            <p>Напишите, что должно было произойти</p>
          </div>
          <div>
            <span>✓</span>
            <p>Добавьте текст ошибки, если он есть</p>
          </div>
        </div>
      </section>

      <section className="support-form-section" id="support-form">
        <div>
          <p className="support-label">Обращение</p>
          <h2>Написать в поддержку</h2>
          <p>
            Обращение отправляется в backend и появляется в админ-панели
            Frame School.
          </p>
        </div>

        <form className="support-form" onSubmit={handleSubmit}>
          {sent && (
            <div className="support-success">
              Сообщение отправлено. Администратор увидит его в панели поддержки.
            </div>
          )}

          {error && <div className="support-error-box">{error}</div>}

          <label>
            Имя
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ваше имя"
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@mail.com"
            />
          </label>

          <label>
            Тема
            <select name="topic" value={form.topic} onChange={handleChange}>
              <option value="lesson">Проблема с уроком</option>
              <option value="account">Аккаунт и вход</option>
              <option value="bonus">Бонусы</option>
              <option value="course">Курсы и доступ</option>
              <option value="other">Другое</option>
            </select>
          </label>

          <label>
            Сообщение
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Опишите проблему..."
            />
          </label>

          <button
            className="support-btn support-btn--primary"
            type="submit"
            disabled={sending}
          >
            {sending ? "Отправляем..." : "Отправить обращение"}
          </button>
        </form>
      </section>

      <section className="support-faq-section">
        <div className="support-section-head">
          <p className="support-label">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>

        <div className="support-faq">
          {faqItems.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="support-final">
        <h2>Нужна помощь прямо сейчас?</h2>
        <p>
          Проверьте FAQ, напишите обращение или используйте плавающую кнопку
          поддержки в правом нижнем углу.
        </p>

        <Link to="/profile" className="support-btn support-btn--primary">
          Вернуться в профиль →
        </Link>
      </section>
    </main>
  );
}
