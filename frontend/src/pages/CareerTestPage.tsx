import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CareerTestPage.css";

type Direction = "capcut" | "premiere" | "tiktok" | "vfx" | "color" | "sound";

type Answer = {
  text: string;
  points: Direction[];
};

type Question = {
  title: string;
  answers: Answer[];
};

const questions: Question[] = [
  {
    title: "Какие видео тебе больше всего интересно создавать?",
    answers: [
      {
        text: "Короткие ролики для TikTok, Reels и Shorts",
        points: ["tiktok", "capcut"],
      },
      {
        text: "Красивые cinematic-видео и блоги",
        points: ["premiere", "color"],
      },
      {
        text: "Эдиты с эффектами, shake, zoom и flash",
        points: ["vfx", "tiktok"],
      },
      {
        text: "Видео с чистым звуком, музыкой и атмосферой",
        points: ["sound", "premiere"],
      },
    ],
  },
  {
    title: "С чем тебе комфортнее работать сейчас?",
    answers: [
      {
        text: "С телефоном или простым редактором",
        points: ["capcut", "tiktok"],
      },
      {
        text: "С компьютером и профессиональными программами",
        points: ["premiere", "color"],
      },
      {
        text: "С эффектами, анимацией и визуальными фишками",
        points: ["vfx", "tiktok"],
      },
      {
        text: "С музыкой, битом и настройкой звука",
        points: ["sound", "capcut"],
      },
    ],
  },
  {
    title: "Что тебе больше нравится в монтаже?",
    answers: [
      {
        text: "Быстро собрать ролик и красиво опубликовать",
        points: ["capcut", "tiktok"],
      },
      {
        text: "Долго и аккуратно собирать профессиональный проект",
        points: ["premiere", "color"],
      },
      {
        text: "Добавлять яркие эффекты и необычные переходы",
        points: ["vfx", "tiktok"],
      },
      {
        text: "Подбирать музыку, атмосферу и звук",
        points: ["sound", "premiere"],
      },
    ],
  },
  {
    title: "Какая цель тебе ближе?",
    answers: [
      {
        text: "Научиться делать ролики для себя и соцсетей",
        points: ["capcut", "tiktok"],
      },
      {
        text: "Стать профессиональным видеомонтажёром",
        points: ["premiere", "color"],
      },
      {
        text: "Делать мощные эдиты и визуальные эффекты",
        points: ["vfx", "tiktok"],
      },
      {
        text: "Разбираться в музыке, голосе и качестве звука",
        points: ["sound", "premiere"],
      },
    ],
  },
];

const results: Record<
  Direction,
  {
    icon: string;
    title: string;
    text: string;
    courseCategory: string;
  }
> = {
  capcut: {
    icon: "✂️",
    title: "Тебе подходит CapCut",
    text: "Тебе лучше начать с простого и быстрого монтажа. CapCut поможет быстро создавать ролики, эдиты, переходы и видео для соцсетей.",
    courseCategory: "CapCut",
  },
  premiere: {
    icon: "🎞️",
    title: "Тебе подходит Premiere Pro",
    text: "Тебе ближе профессиональный подход: таймлайн, крупные проекты, аккуратная сборка, работа с видео, звуком и экспортом.",
    courseCategory: "Premiere Pro",
  },
  tiktok: {
    icon: "📱",
    title: "Тебе подходит TikTok / Reels монтаж",
    text: "Тебе нравится быстрый, трендовый и динамичный контент. Твой путь — короткие ролики, хуки, бит, переходы и удержание внимания.",
    courseCategory: "TikTok / Reels",
  },
  vfx: {
    icon: "⚡",
    title: "Тебе подходит VFX и эффекты",
    text: "Тебе интересны визуальные фишки: shake, zoom, flash, glitch, particles и эффектные эдиты.",
    courseCategory: "VFX",
  },
  color: {
    icon: "🎨",
    title: "Тебе подходит цветокоррекция",
    text: "Тебе важен стиль картинки, настроение, cinematic look, LUT, свет, контраст и визуальная атмосфера видео.",
    courseCategory: "Цветокоррекция",
  },
  sound: {
    icon: "🔊",
    title: "Тебе подходит звук в монтаже",
    text: "Тебе важно, чтобы видео звучало чисто и мощно: музыка, голос, бит, атмосфера, эффекты и баланс громкости.",
    courseCategory: "Звук",
  },
};

export default function CareerTestPage() {
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const currentIndex = answers.length;
  const currentQuestion = questions[currentIndex];

  const resultKey = useMemo<Direction>(() => {
    const score: Record<Direction, number> = {
      capcut: 0,
      premiere: 0,
      tiktok: 0,
      vfx: 0,
      color: 0,
      sound: 0,
    };

    answers.forEach((answerIndex, questionIndex) => {
      const answer = questions[questionIndex].answers[answerIndex];

      answer.points.forEach((direction) => {
        score[direction] += 1;
      });
    });

    return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0] as Direction;
  }, [answers]);

  const result = results[resultKey];

  function chooseAnswer(answerIndex: number) {
    const nextAnswers = [...answers, answerIndex];

    setAnswers(nextAnswers);

    if (nextAnswers.length === questions.length) {
      setFinished(true);
    }
  }

  function restartTest() {
    setAnswers([]);
    setFinished(false);
  }

  const progress = Math.round((answers.length / questions.length) * 100);

  return (
    <main className="career-test-page">
      <section className="career-test-hero">
        <div>
          <Link to="/free" className="career-test-back">
            ← Назад в бесплатный раздел
          </Link>

          <p className="career-test-label">Профориентационный тест</p>

          <h1>
            Узнайте, какое направление в монтаже подходит{" "}
            <span>именно вам</span>
          </h1>

          <p>
            Ответьте на несколько вопросов, и платформа подскажет, с чего лучше
            начать: CapCut, Premiere Pro, TikTok-монтаж, VFX, цвет или звук.
          </p>
        </div>

        <div className="career-test-visual">
          <div>🧭</div>
          <strong>{finished ? "Готово" : `${progress}%`}</strong>
          <span>результат за 1 минуту</span>
        </div>
      </section>

      {!finished && currentQuestion && (
        <section className="career-test-card">
          <div className="career-test-progress">
            <div>
              <span style={{ width: `${progress}%` }}></span>
            </div>
            <p>
              Вопрос {currentIndex + 1} из {questions.length}
            </p>
          </div>

          <h2>{currentQuestion.title}</h2>

          <div className="career-test-answers">
            {currentQuestion.answers.map((answer, index) => (
              <button key={answer.text} onClick={() => chooseAnswer(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {answer.text}
              </button>
            ))}
          </div>
        </section>
      )}

      {finished && (
        <section className="career-result">
          <div className="career-result-icon">{result.icon}</div>

          <p className="career-test-label">Ваш результат</p>

          <h2>{result.title}</h2>

          <p>{result.text}</p>

          <div className="career-result-box">
            <span>Рекомендуемое направление</span>
            <strong>{result.courseCategory}</strong>
          </div>

          <div className="career-result-actions">
            <Link
              to="/courses"
              className="career-test-btn career-test-btn--primary"
            >
              Смотреть подходящие курсы
            </Link>

            <button onClick={restartTest} className="career-test-btn">
              Пройти тест заново
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
