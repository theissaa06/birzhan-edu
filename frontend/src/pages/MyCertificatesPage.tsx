import { useState } from "react";
import { Link } from "react-router-dom";
import "./MyCertificatesPage.css";

type CourseCertificate = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

function readCertificate(): CourseCertificate | null {
  const savedCertificate = localStorage.getItem("last-course-bonus");

  if (!savedCertificate) return null;

  try {
    const parsed = JSON.parse(savedCertificate);
    return parsed?.courseId && parsed?.courseTitle && parsed?.claimedAt
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getStudentName() {
  try {
    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.username || user.name || user.email || "Студент Frame School";
    }
  } catch {
    // Используем запасное имя ниже.
  }

  return localStorage.getItem("user-name") || "Студент Frame School";
}

export default function MyCertificatesPage() {
  const [copied, setCopied] = useState(false);
  const certificate = readCertificate();
  const studentName = getStudentName();

  const date = certificate?.claimedAt
    ? new Date(certificate.claimedAt).toLocaleDateString("ru-RU")
    : new Date().toLocaleDateString("ru-RU");

  const certificateId = certificate
    ? `FRAME-${certificate.courseId}-${date.split(".").join("")}`
    : "";

  const publicCertificateUrl = `${window.location.origin}/certificate/public?name=${encodeURIComponent(
    studentName,
  )}&course=${encodeURIComponent(
    certificate?.courseTitle || "",
  )}&date=${encodeURIComponent(date)}&id=${encodeURIComponent(certificateId)}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    publicCertificateUrl,
  )}`;

  function flashCopied() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopyId() {
    if (!certificateId) return;

    try {
      await navigator.clipboard.writeText(certificateId);
    } finally {
      flashCopied();
    }
  }

  async function handleShare() {
    if (!certificate) return;

    const shareText = `Я получил сертификат Frame School!\n\nКурс: ${certificate.courseTitle}\nID сертификата: ${certificateId}\nДата выдачи: ${date}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Мой сертификат Frame School",
          text: shareText,
          url: publicCertificateUrl,
        });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${publicCertificateUrl}`);
      flashCopied();
    }
  }

  if (!certificate) {
    return (
      <main className="certificate-page">
        <section className="certificate-empty">
          <div className="certificate-empty-icon">🎓</div>

          <h1>Сертификат пока недоступен</h1>

          <p>
            Заверши курс на 100%, нажми "Получить сертификат", и здесь появится
            твой официальный сертификат Frame School.
          </p>

          <Link to="/courses">Перейти к курсам →</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="certificate-page">
      {copied && (
        <div className="certificate-toast">
          <div>✓</div>
          <span>Данные сертификата скопированы</span>
        </div>
      )}

      <section className="certificate-actions">
        <Link to="/my-certificates" className="certificate-back">
          ← Мои сертификаты
        </Link>

        <div className="certificate-action-buttons">
          <button type="button" onClick={handleShare}>
            Поделиться
          </button>

          <button type="button" onClick={handleCopyId}>
            Скопировать ID
          </button>

          <button type="button" onClick={handlePrint}>
            Скачать / распечатать
          </button>
        </div>
      </section>

      <section className="certificate-card">
        <div className="certificate-gold-line"></div>

        <div className="certificate-top">
          <div className="certificate-logo">F</div>

          <div>
            <span>Frame School</span>
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
            Студент прошел все уроки курса, выполнил практические задания и
            получил подтверждение навыков на платформе Frame School.
          </p>
        </div>

        <div className="certificate-bottom">
          <div className="certificate-info-box">
            <span>Дата выдачи</span>
            <strong>{date}</strong>
          </div>

          <div className="certificate-info-box">
            <span>ID сертификата</span>
            <strong>{certificateId}</strong>
          </div>

          <div className="certificate-qr-box">
            <span>QR / Verify</span>
            <img src={qrUrl} alt="QR-код сертификата" />
            <small>Сканируй для проверки сертификата</small>
          </div>

          <div className="certificate-sign">
            <span>Founder</span>
            <strong>Frame School</strong>
          </div>
        </div>

        <div className="certificate-watermark">FRAME SCHOOL</div>
      </section>
    </main>
  );
}
