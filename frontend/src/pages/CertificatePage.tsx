import { Link } from "react-router-dom";
import "./CertificatePage.css";

type CourseCertificate = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

function getCurrentUserName() {
  try {
    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.username || user.name || user.email || "Islam";
    }
  } catch {
    // fallback ниже
  }

  return localStorage.getItem("user-name") || "Islam";
}

function readCertificateFromStorage(): CourseCertificate | null {
  const savedLastCertificate = localStorage.getItem("last-course-bonus");

  if (savedLastCertificate) {
    try {
      const parsed = JSON.parse(savedLastCertificate);

      if (parsed?.courseId && parsed?.courseTitle && parsed?.claimedAt) {
        return parsed;
      }
    } catch {
      // пробуем список сертификатов ниже
    }
  }

  const savedCertificates = localStorage.getItem("my-certificates");

  if (savedCertificates) {
    try {
      const parsed = JSON.parse(savedCertificates);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const certificates = parsed.filter(
          (item) => item?.courseId && item?.courseTitle && item?.claimedAt,
        );

        if (certificates.length > 0) {
          const lastCertificate = certificates[certificates.length - 1];

          localStorage.setItem(
            "last-course-bonus",
            JSON.stringify(lastCertificate),
          );

          return lastCertificate;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

function createDemoCertificate() {
  const demoCertificate: CourseCertificate = {
    courseId: 1,
    courseTitle: "Premiere Pro для начинающих",
    claimedAt: new Date().toISOString(),
  };

  localStorage.setItem("last-course-bonus", JSON.stringify(demoCertificate));
  localStorage.setItem("my-certificates", JSON.stringify([demoCertificate]));

  window.location.reload();
}

export default function CertificatePage() {
  const certificate = readCertificateFromStorage();
  const studentName = getCurrentUserName();

  const date = certificate?.claimedAt
    ? new Date(certificate.claimedAt).toLocaleDateString("ru-RU")
    : new Date().toLocaleDateString("ru-RU");

  function handlePrint() {
    window.print();
  }

  if (!certificate) {
    return (
      <main className="certificate-page">
        <section className="certificate-empty">
          <div className="certificate-empty-badge">Сертификат</div>

          <h1>Сертификат пока недоступен</h1>

          <p>
            Заверши курс на 100%, нажми “Получить сертификат”, и здесь появится
            официальный сертификат Birzhan-Edu Platform. Для проверки на показе
            можно временно создать тестовый сертификат.
          </p>

          <div className="certificate-empty-actions">
            <Link
              to="/courses"
              className="certificate-btn certificate-btn--primary"
            >
              Перейти к курсам →
            </Link>

            <Link
              to="/bonus"
              className="certificate-btn certificate-btn--ghost"
            >
              Проверить бонусы
            </Link>

            <button
              type="button"
              className="certificate-btn certificate-btn--ghost"
              onClick={createDemoCertificate}
            >
              Создать тестовый сертификат
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="certificate-page">
      <section className="certificate-actions">
        <Link to="/courses" className="certificate-back">
          ← Назад к курсам
        </Link>

        <button type="button" onClick={handlePrint}>
          🖨 Скачать / распечатать
        </button>
      </section>

      <section className="certificate-card">
        <div className="certificate-watermark">BIRZHAN-EDU</div>

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
      </section>
    </main>
  );
}
