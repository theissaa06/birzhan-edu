import { Link } from "react-router-dom";
import "./StudentsPage.css";

const students = [
  {
    avatar: "🎬",
    name: "Алихан",
    role: "Начинающий монтажёр",
    result: "Собрал первые 5 роликов для портфолио",
    progress: 82,
    direction: "CapCut",
  },
  {
    avatar: "📱",
    name: "Аружан",
    role: "TikTok / Reels creator",
    result: "Научилась делать эдиты под бит и короткие ролики",
    progress: 74,
    direction: "TikTok",
  },
  {
    avatar: "🎞️",
    name: "Дамир",
    role: "Premiere Pro student",
    result: "Собрал первый cinematic-проект",
    progress: 68,
    direction: "Premiere Pro",
  },
];

const achievements = [
  {
    icon: "🏆",
    title: "Первые проекты",
    text: "Студенты создают реальные видео уже во время обучения.",
  },
  {
    icon: "📁",
    title: "Портфолио",
    text: "Лучшие работы можно собрать в портфолио для клиентов или комиссии.",
  },
  {
    icon: "🚀",
    title: "Рост навыков",
    text: "От простого монтажа до эффектов, цвета, звука и структуры ролика.",
  },
  {
    icon: "💼",
    title: "Подготовка к заказам",
    text: "Студенты понимают, как презентовать свои работы и искать первые задачи.",
  },
];

const reviews = [
  {
    name: "Мадина",
    text: "Мне понравилось, что уроки понятные и сразу есть практика. Я смогла сделать свой первый эдит.",
  },
  {
    name: "Ислам",
    text: "Курсы помогли разобраться, как работает монтаж под музыку и почему важен ритм.",
  },
  {
    name: "Ерасыл",
    text: "Я начал с CapCut, а потом захотел перейти к Premiere Pro. Теперь понимаю, куда развиваться.",
  },
];

export default function StudentsPage() {
  return (
    <main className="students-page">
      <section className="students-hero">
        <div className="students-hero__content">
          <p className="students-label">Студенты Frame School</p>

          <h1>
            Истории, прогресс и результаты наших <span>студентов</span>
          </h1>

          <p>
            На платформе студенты проходят уроки, выполняют практические
            задания, собирают первые ролики и постепенно формируют портфолио.
          </p>

          <div className="students-actions">
            <Link to="/courses" className="students-btn students-btn--primary">
              Начать обучение
            </Link>

            <Link to="/reviews" className="students-btn students-btn--light">
              Смотреть отзывы
            </Link>
          </div>
        </div>

        <div className="students-hero__visual">
          <div className="students-main-icon">👨‍🎓</div>
          <div className="students-float students-float--one">Портфолио</div>
          <div className="students-float students-float--two">Практика</div>
          <div className="students-float students-float--three">Прогресс</div>
        </div>
      </section>

      <section className="students-stats">
        <div>
          <strong>15 000+</strong>
          <span>студентов обучаются</span>
        </div>
        <div>
          <strong>40+</strong>
          <span>уроков и модулей</span>
        </div>
        <div>
          <strong>87%</strong>
          <span>начали первые проекты</span>
        </div>
        <div>
          <strong>4.9</strong>
          <span>средняя оценка платформы</span>
        </div>
      </section>

      <section className="students-section">
        <div className="students-section-head">
          <p className="students-label">Примеры прогресса</p>
          <h2>Как студенты развиваются во время обучения</h2>
          <p>
            Каждый студент может выбрать своё направление: CapCut, TikTok,
            Premiere Pro, цветокоррекция, звук или VFX.
          </p>
        </div>

        <div className="students-grid">
          {students.map((student) => (
            <article className="student-card" key={student.name}>
              <div className="student-card__top">
                <div className="student-avatar">{student.avatar}</div>
                <span>{student.direction}</span>
              </div>

              <h3>{student.name}</h3>
              <p className="student-role">{student.role}</p>
              <p>{student.result}</p>

              <div className="student-progress">
                <div>
                  <span style={{ width: `${student.progress}%` }}></span>
                </div>
                <strong>{student.progress}%</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="students-dark">
        <div>
          <p className="students-label students-label--dark">Достижения</p>
          <h2>Что получает студент после обучения</h2>
          <p>
            Главная цель — не просто пройти уроки, а получить понятный
            результат: навыки, работы, уверенность и направление развития.
          </p>
        </div>

        <div className="students-achievements">
          {achievements.map((item) => (
            <article key={item.title}>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="students-section">
        <div className="students-section-head">
          <p className="students-label">Отзывы студентов</p>
          <h2>Что говорят после первых уроков</h2>
        </div>

        <div className="students-reviews">
          {reviews.map((review) => (
            <article className="students-review-card" key={review.name}>
              <p>“{review.text}”</p>
              <strong>{review.name}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="students-final">
        <h2>Хотите тоже попасть в число студентов?</h2>
        <p>
          Выберите курс, начните с первого урока и соберите свои первые работы.
        </p>

        <Link to="/courses" className="students-btn students-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
