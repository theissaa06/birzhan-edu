import { Link } from "react-router-dom";
import "./CertificatePage.css";

type CourseBonus = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

export default function CertificatePage() {
  const savedBonus = localStorage.getItem("last-course-bonus");

  let certificate: CourseBonus | null = null;

  if (savedBonus) {
    try {
      certificate = JSON.parse(savedBonus);
    } catch {
      certificate = null;
    }
  }

  const studentName = localStorage.getItem("user-name") || "Islam";
  const date = certificate?.claimedAt
    ? new Date(certificate.claimedAt).toLocaleDateString("ru-RU")
    : new Date().toLocaleDateString("ru-RU");

  if (!certificate) {
    return (
      <main className="certificate-page">
        <section className="certificate-empty">
          <h1>Сертификат пока недоступен</h1>
          <p>
            Заверши курс на 100%, получи бонус, и здесь появится твой
            сертификат.
          </p>

          <Link to="/courses">Перейти к курсам →</Link>
        </section>
      </main>
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main className="certificate-page">
      <section className="certificate-actions">
        <Link to="/courses">← Назад к курсам</Link>

        <button type="button" onClick={handlePrint}>
          🖨 Скачать / распечатать
        </button>
      </section>

      <section className="certificate-card">
        <div className="certificate-top">
          <div className="certificate-logo">B</div>
          <div>
            <span>Birzhan-Edu Platform</span>
            <p>International Video Editing Education</p>
          </div>
        </div>

        <div className="certificate-content">
          <p className="certificate-label">Сертификат об окончании курса</p>

          <h1>Certificate of Completion</h1>

          <p className="certificate-text">Настоящим подтверждается, что</p>

          <h2>{studentName}</h2>

          <p className="certificate-text">
            успешно завершил образовательный курс
          </p>

          <h3>{certificate.courseTitle}</h3>

          <p className="certificate-description">
            Студент прошёл все уроки курса, выполнил практические задания и
            получил доступ к бонусным материалам Birzhan-Edu Platform.
          </p>
        </div>

        <div className="certificate-bottom">
          <div>
            <span>Дата выдачи</span>
            <strong>{date}</strong>
          </div>

          <div>
            <span>ID сертификата</span>
            <strong>
              BEDU-{certificate.courseId}-{date.split(".").join("")}
            </strong>
          </div>

          <div className="certificate-sign">
            <span>Founder</span>
            <strong>Birzhan-Edu</strong>
          </div>
        </div>

        <div className="certificate-watermark">BIRZHAN-EDU</div>
      </section>
    </main>
  );
}
