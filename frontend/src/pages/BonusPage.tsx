import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./BonusPage.css";

type CourseBonus = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

type BonusItem = {
  id?: number;
  icon: string;
  title: string;
  text: string;
  tag: string;
};

type ApiBonus = {
  id: number;
  title: string;
  description: string;
  status?: string | null;
  requirement?: string | null;
};

const fallbackBonuses: BonusItem[] = [
  {
    icon: "🤖",
    title: "AI-пак для монтажа 2026",
    text: "Готовые промпты для идей, сценариев, хуков, описаний и структуры коротких видео.",
    tag: "NEW 2026",
  },
  {
    icon: "🎬",
    title: "CapCut Presets Pack",
    text: "Набор пресетов для динамичных TikTok, Reels и Shorts: переходы, зум, speed ramp и титры.",
    tag: "Для новичков",
  },
  {
    icon: "🎨",
    title: "LUT-пак для цветокоррекции",
    text: "Кинематографичные цветовые настройки для видео, эдитов, travel-роликов и блогов.",
    tag: "PRO стиль",
  },
  {
    icon: "⚡",
    title: "Shake / Zoom / Flash эффекты",
    text: "Гайд по самым популярным эффектам: shake, blur, flash, zoom, glitch и монтаж под бит.",
    tag: "Эдиты",
  },
  {
    icon: "📋",
    title: "Чек-лист TikTok-эдита",
    text: "Пошаговый список: хук, музыка, нарезка, переходы, текст, цвет, экспорт и публикация.",
    tag: "Практика",
  },
  {
    icon: "📁",
    title: "Шаблон портфолио",
    text: "Структура портфолио для начинающего видеомонтажёра: что показать клиенту и как оформить.",
    tag: "Карьера",
  },
  {
    icon: "🏆",
    title: "Сертификат после прохождения",
    text: "После завершения курса студент получает сертификат Frame School.",
    tag: "Награда",
  },
  {
    icon: "💼",
    title: "Мини-гайд: первые заказы",
    text: "Как найти первых клиентов, что писать заказчику и как оценивать свою работу.",
    tag: "Доход",
  },
];

const bonusIcons = ["🤖", "🎬", "🎨", "⚡", "📋", "📁", "🏆", "💼"];

function mapApiBonus(bonus: ApiBonus, index: number): BonusItem {
  return {
    id: bonus.id,
    icon: bonusIcons[index % bonusIcons.length],
    title: bonus.title,
    text: bonus.description,
    tag: bonus.requirement || bonus.status || "Доступно",
  };
}

export default function BonusPage() {
  const [courseBonus, setCourseBonus] = useState<CourseBonus | null>(null);
  const [claimedBonuses, setClaimedBonuses] = useState<string[]>([]);
  const [bonuses, setBonuses] = useState<BonusItem[]>(fallbackBonuses);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedCourseBonus = localStorage.getItem("last-course-bonus");
    const savedClaimedBonuses = localStorage.getItem("claimed-bonuses");

    if (savedCourseBonus) {
      try {
        setCourseBonus(JSON.parse(savedCourseBonus));
      } catch {
        setCourseBonus(null);
      }
    }

    if (savedClaimedBonuses) {
      try {
        setClaimedBonuses(JSON.parse(savedClaimedBonuses));
      } catch {
        setClaimedBonuses([]);
      }
    }
    loadBonuses().catch((error) => {
      console.error("Ошибка загрузки бонусов:", error);
      setNotice("Бонусы показаны из резервного набора. Backend временно недоступен.");
      setBonuses(fallbackBonuses);
      setLoading(false);
    });
  }, []);

  async function loadBonuses() {
    try {
      setLoading(true);
      const response = await api.get("/bonus");
      const data = response.data.data || response.data.bonuses || [];

      if (Array.isArray(data) && data.length > 0) {
        setBonuses(data.map(mapApiBonus));
      } else {
        setBonuses(fallbackBonuses);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimBonus(bonus: BonusItem) {
    const key = bonus.id ? `db:${bonus.id}` : bonus.title;
    const updatedBonuses = claimedBonuses.includes(key)
      ? claimedBonuses
      : [...claimedBonuses, key];

    setClaimedBonuses(updatedBonuses);
    localStorage.setItem("claimed-bonuses", JSON.stringify(updatedBonuses));
    setNotice(`Бонус “${bonus.title}” добавлен в ваш набор.`);

    if (!bonus.id || !localStorage.getItem("token")) return;

    try {
      await api.post(`/bonus/${bonus.id}/claim`);
      setNotice(`Бонус “${bonus.title}” сохранён в вашем аккаунте.`);
    } catch (error) {
      console.error("Ошибка сохранения бонуса:", error);
      setNotice(
        "Бонус отмечен локально. Войдите заново, если нужно сохранить его в аккаунте.",
      );
    }
  }

  return (
    <main className="bonus-page">
      <section className="bonus-hero">
        <div className="bonus-hero__content">
          <p className="bonus-label">Бонусы Frame School · 2026</p>

          <h1>
            Получите бонусы для быстрого старта в <span>монтаже</span>
          </h1>

          <p>
            Мы подготовили актуальные материалы на 2026 год: AI-инструменты,
            пресеты, LUT-паки, чек-листы, шаблоны портфолио и карьерные гайды.
          </p>

          <div className="bonus-actions">
            <Link to="/register" className="bonus-btn bonus-btn--primary">
              🎁 Забрать бонусы
            </Link>

            <Link to="/courses" className="bonus-btn bonus-btn--light">
              Смотреть курсы
            </Link>
          </div>
        </div>

        <div className="bonus-hero__card">
          <div className="bonus-gift">🎁</div>
          <strong>8+</strong>
          <span>актуальных бонусов 2026</span>
        </div>
      </section>

      {courseBonus && (
        <section className="bonus-unlocked">
          <div className="bonus-unlocked-icon">🏆</div>

          <div>
            <p className="bonus-label">Бонус разблокирован</p>
            <h2>Бонус за курс получен!</h2>
            <p>
              Ты завершил курс <strong>{courseBonus.courseTitle}</strong> и
              получил доступ к бонусным материалам.
            </p>
          </div>

          <div className="bonus-unlocked-actions">
            <Link to="/certificate" className="bonus-btn bonus-btn--primary">
              🏆 Открыть сертификат
            </Link>

            <Link to="/courses" className="bonus-btn bonus-btn--light">
              Продолжить обучение →
            </Link>
          </div>
        </section>
      )}

      <section className="bonus-grid-section">
        <div className="bonus-section-head">
          <p className="bonus-label">Что внутри</p>
          <h2>Бонусные материалы</h2>
          <p>
            Эти бонусы помогают студенту быстрее начать практику, собрать первые
            работы и подготовиться к реальным заказам.
          </p>
          {notice && <p>{notice}</p>}
          {loading && <p>Загружаем бонусы из backend...</p>}
        </div>

        <div className="bonus-grid">
          {bonuses.map((bonus) => {
            const key = bonus.id ? `db:${bonus.id}` : bonus.title;
            const isClaimed = claimedBonuses.includes(key);

            return (
              <article
                className={
                  isClaimed ? "bonus-card bonus-card--claimed" : "bonus-card"
                }
                key={bonus.title}
              >
                <div className="bonus-card__top">
                  <div className="bonus-icon">{bonus.icon}</div>
                  <span>{isClaimed ? "Получено" : bonus.tag}</span>
                </div>

                <h3>{bonus.title}</h3>
                <p>{bonus.text}</p>

                <button
                  className="bonus-card-btn"
                  type="button"
                  onClick={() => handleClaimBonus(bonus)}
                >
                  {isClaimed ? "✅ Получено" : "Получить"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bonus-steps">
        <div>
          <p className="bonus-label">Как получить</p>
          <h2>Всего 3 шага</h2>
        </div>

        <div className="bonus-steps-grid">
          <div>
            <span>01</span>
            <h3>Зарегистрируйтесь</h3>
            <p>Создайте аккаунт на платформе.</p>
          </div>

          <div>
            <span>02</span>
            <h3>Выберите курс</h3>
            <p>Начните обучение по монтажу или эдитам.</p>
          </div>

          <div>
            <span>03</span>
            <h3>Заберите бонус</h3>
            <p>Используйте материалы для практики и портфолио.</p>
          </div>
        </div>
      </section>

      <section className="bonus-final">
        <h2>Готов начать обучение?</h2>
        <p>
          Бонусы помогут быстрее освоиться, но главный результат дают уроки,
          практика и регулярный монтаж.
        </p>

        <Link to="/courses" className="bonus-btn bonus-btn--primary">
          Перейти к курсам →
        </Link>
      </section>
    </main>
  );
}
