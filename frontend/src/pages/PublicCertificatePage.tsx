import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import api, { API_BASE_URL } from "../services/api";
import "./PublicCertificatePage.css";

type Certificate = { code: string; recipientName: string; courseTitle: string; issuedAt: string; status: "ACTIVE" | "REVOKED"; verificationUrl: string };

export default function PublicCertificatePage() {
  const { certificateId = "" } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!certificateId) { setError("Код сертификата не указан."); setLoading(false); return; }
    api.get(`/certificates/${encodeURIComponent(certificateId)}/public`)
      .then(({ data }) => { setCertificate(data.certificate); setValid(Boolean(data.valid)); })
      .catch((requestError) => setError(requestError?.response?.data?.message || "Сертификат не найден."))
      .finally(() => setLoading(false));
  }, [certificateId]);

  if (loading) return <main className="public-certificate-page"><section className="public-certificate-state" aria-live="polite">Проверяем подпись сертификата…</section></main>;
  if (error || !certificate) return <main className="public-certificate-page"><section className="public-certificate-state" role="alert"><FrameIcon name="warning" /><h1>Проверка не пройдена</h1><p>{error}</p><Link to="/courses">К курсам</Link></section></main>;

  const qrUrl = `${API_BASE_URL}/certificates/${encodeURIComponent(certificate.code)}/qr.svg`;
  return (
    <main className="public-certificate-page">
      <section className="public-certificate-card">
        <header><div className="public-certificate-logo">F</div><div><strong>Frame School</strong><span>Server verification record</span></div><div className={valid ? "certificate-valid" : "certificate-invalid"}><FrameIcon name={valid ? "check" : "warning"} />{valid ? "Подлинный" : "Отозван"}</div></header>
        <div className="public-certificate-content"><p className="timecode">CERTIFICATE OF COMPLETION</p><h1>Сертификат об окончании курса</h1><span>Настоящим подтверждается, что</span><h2>{certificate.recipientName}</h2><span>успешно завершил(а) курс</span><h3>{certificate.courseTitle}</h3></div>
        <footer><dl><div><dt>Дата выдачи</dt><dd>{new Date(certificate.issuedAt).toLocaleDateString("ru-RU")}</dd></div><div><dt>Публичный код</dt><dd>{certificate.code}</dd></div><div><dt>Статус</dt><dd>{certificate.status}</dd></div></dl><div className="certificate-qr-box"><img src={qrUrl} alt="QR-код канонической страницы сертификата" /><small>QR создаётся локально на сервере Frame School</small></div></footer>
      </section>
      <nav className="public-certificate-actions"><Link to="/courses">К курсам</Link><button type="button" onClick={() => window.print()}>Печатать / сохранить PDF</button></nav>
    </main>
  );
}
