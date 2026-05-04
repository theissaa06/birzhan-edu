import { Link } from "react-router-dom";

interface Course {
  id: number;
  title: string;
  category: string;
  level: string;
  duration: string;
  description: string;
  imageUrl?: string;
  lessons?: unknown[];
}

const categoryColors: Record<string, string> = {
  capcut: "#7C3AED",
  "premiere-pro": "#2563EB",
  tiktok: "#EC4899",
  "color-correction": "#F59E0B",
  sound: "#10B981",
  vfx: "#EF4444",
};

export default function CourseCard({ course }: { course: Course }) {
  const color = categoryColors[course.category] || "#7C3AED";
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: 180,
          background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        ) : (
          "🎬"
        )}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span className="tag" style={{ background: `${color}22`, color }}>
            {course.category}
          </span>
        </div>
      </div>
      <div
        style={{
          padding: "20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          {course.title}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--gray)",
            marginBottom: 16,
            flex: 1,
            lineHeight: 1.5,
          }}
        >
          {course.description?.slice(0, 80)}...
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--gray)",
          }}
        >
          <span>🎓 {course.level}</span>
          <span>⏱ {course.duration}</span>
          <span>📹 {course.lessons?.length || 0} уроков</span>
        </div>
        <Link
          to={`/courses/${course.id}`}
          className="btn btn-primary"
          style={{
            textAlign: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          Перейти к курсу
        </Link>
      </div>
    </div>
  );
}
