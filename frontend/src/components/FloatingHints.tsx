import { useEffect, useState } from "react";
import "./FloatingHints.css";

type Hint = {
  id: number;
  title: string;
  text: string;
  icon: string;
  position: "left" | "right";
};

const hints: Hint[] = [
  {
    id: 1,
    icon: "🤖",
    title: "Frame AI",
    text: "Спроси помощника про учёбу, код, монтаж или идеи.",
    position: "right",
  },
  {
    id: 2,
    icon: "🎁",
    title: "Бонусы",
    text: "Проходи курсы и открывай полезные материалы.",
    position: "left",
  },
  {
    id: 3,
    icon: "🎓",
    title: "Сертификаты",
    text: "Заверши курс на 100% и получи сертификат.",
    position: "right",
  },
  {
    id: 4,
    icon: "💎",
    title: "Premium",
    text: "Открой расширенные возможности платформы.",
    position: "left",
  },
  {
    id: 5,
    icon: "🚀",
    title: "Практика",
    text: "Выполняй задания и прокачивай навыки монтажа.",
    position: "right",
  },
];

export default function FloatingHints() {
  const [activeHint, setActiveHint] = useState<Hint | null>(null);

  useEffect(() => {
    let index = 0;

    const showHint = () => {
      setActiveHint(hints[index]);

      setTimeout(() => {
        setActiveHint(null);
      }, 4500);

      index = (index + 1) % hints.length;
    };

    const firstTimeout = setTimeout(showHint, 1800);
    const interval = setInterval(showHint, 8500);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, []);

  if (!activeHint) return null;

  return (
    <div className={`floating-hint floating-hint--${activeHint.position}`}>
      <div className="floating-hint__icon">{activeHint.icon}</div>

      <div className="floating-hint__content">
        <strong>{activeHint.title}</strong>
        <span>{activeHint.text}</span>
      </div>
    </div>
  );
}
