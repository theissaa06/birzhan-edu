import { useState } from "react";
import { Link } from "react-router-dom";
import "./CertificatePage.css";

type CourseBonus = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

export default function CertificatePage() {
  const [copied, setCopied] = useState(false);

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

  const certificateId = certificate
    ? `BEDU-${certificate.courseId}-${date.split(".").join("")}`
    : "";
  const publicCertificateUrl = `${window.location.origin}/certificate/public?name=${encodeURIComponent(
    studentName,
  )}&course=${encodeURIComponent(
    certificate?.courseTitle || "",
  )}&date=${encodeURIComponent(date)}&id=${encodeURIComponent(certificateId)}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    publicCertificateUrl,
  )}`;

  function handlePrint() {
    window.print();
  }

  async function handleCopyId() {
    if (!certificateId) return;

    try {
      await navigator.clipboard.writeText(certificateId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    }
  }

  async function handleShare() {
    if (!certificate) return;

    const shareText = `🎓 Я получил сертификат Birzhan-Edu Platform!

Курс: ${certificate.courseTitle}
ID сертификата: ${certificateId}
Дата выдачи: ${date}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Мой сертификат Birzhan-Edu",
          text: shareText,
        });
      } catch {
        console.log("Пользователь отменил отправку");
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    }
  }

  if (!certificate) {
    return (
      <main className="certificate-page">
        <section className="certificate-empty">
          <div className="certificate-empty-icon">🎓</div>

          <h1>Сертификат пока недоступен</h1>

          <p>
            Заверши курс на 100%, нажми “Получить сертификат”, и здесь появится
            твой официальный сертификат Birzhan-Edu Platform.
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
          <div>✅</div>
          <span>Данные сертификата скопированы</span>
        </div>
      )}

      <section className="certificate-actions">
        <Link to="/my-certificates" className="certificate-back">
          ← Мои сертификаты
        </Link>

        <div className="certificate-action-buttons">
          <button type="button" onClick={handleShare}>
            📤 Поделиться
          </button>

          <button type="button" onClick={handleCopyId}>
            🔗 Скопировать ID
          </button>

          <button type="button" onClick={handlePrint}>
            🖨 Скачать / распечатать
          </button>
        </div>
      </section>

      <section className="certificate-card">
        <div className="certificate-gold-line"></div>

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
            получил подтверждение навыков на платформе Birzhan-Edu.
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

            <small>Сканируй для проверки данных</small>
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
