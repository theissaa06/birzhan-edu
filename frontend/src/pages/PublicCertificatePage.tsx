import { Link, useSearchParams } from "react-router-dom";
import "./PublicCertificatePage.css";

export default function PublicCertificatePage() {
  const [searchParams] = useSearchParams();

  const studentName = searchParams.get("name") || "Student";
  const courseTitle = searchParams.get("course") || "Birzhan-Edu Course";
  const date =
    searchParams.get("date") || new Date().toLocaleDateString("ru-RU");
  const certificateId = searchParams.get("id") || "BEDU-UNKNOWN";

  return (
    <main className="public-certificate-page">
      <section className="public-certificate-card">
        <div className="public-certificate-top">
          <div className="public-certificate-logo">B</div>

          <div>
            <span>Birzhan-Edu Platform</span>
            <p>International Video Editing Education</p>
          </div>
        </div>

        <div className="public-certificate-content">
          <p className="public-certificate-label">Certificate Verification</p>

          <h1>Certificate of Completion</h1>

          <p className="public-certificate-text">This document confirms that</p>

          <h2>{studentName}</h2>

          <p className="public-certificate-text">
            has successfully completed the course
          </p>

          <h3>{courseTitle}</h3>

          <p className="public-certificate-description">
            This certificate confirms successful completion of the training
            program on Birzhan-Edu Platform.
          </p>
        </div>

        <div className="public-certificate-bottom">
          <div>
            <span>Date</span>
            <strong>{date}</strong>
          </div>

          <div>
            <span>Certificate ID</span>
            <strong>{certificateId}</strong>
          </div>

          <div className="public-certificate-sign">
            <span>Verified by</span>
            <strong>Birzhan-Edu</strong>
          </div>
        </div>

        <div className="public-certificate-watermark">BIRZHAN-EDU</div>
      </section>

      <div className="public-certificate-actions">
        <Link to="/courses">← Назад к курсам</Link>
      </div>
    </main>
  );
}
