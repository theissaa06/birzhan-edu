import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import api from "../services/api";
import "./MyCertificatesPage.css";

type Certificate = { code: string; recipientName: string; courseTitle: string; issuedAt: string; status: "ACTIVE" | "REVOKED"; verificationUrl: string };

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/certificates/me")
      .then(({ data }) => setCertificates(data.certificates || []))
      .catch((requestError) => setError(requestError?.response?.status === 401 ? "Войдите, чтобы увидеть сертификаты." : requestError?.response?.data?.message || "Не удалось загрузить сертификаты."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="certificate-page">
      <header className="certificate-heading"><span className="timecode">CERTIFICATE REGISTRY</span><h1>Мои сертификаты</h1><p>Сертификаты выдаются сервером после завершения всех опубликованных уроков курса.</p></header>
      {loading && <div className="certificate-empty" aria-live="polite">Загружаем реестр…</div>}
      {error && <section className="certificate-empty" role="alert"><FrameIcon name="warning" /><h2>Доступ к реестру</h2><p>{error}</p><Link to="/login">Войти</Link></section>}
      {!loading && !error && !certificates.length && <section className="certificate-empty"><FrameIcon name="certificate" /><h2>Сертификатов пока нет</h2><p>Завершите курс — сертификат появится здесь автоматически и получит непрозрачный публичный код.</p><Link to="/courses">Перейти к курсам</Link></section>}
      <section className="certificate-grid">{certificates.map((certificate) => <article key={certificate.code} className={certificate.status === "ACTIVE" ? "" : "certificate-record--revoked"}><div className="certificate-record-icon"><FrameIcon name="certificate" /></div><span className="timecode">{certificate.status}</span><h2>{certificate.courseTitle}</h2><p>{certificate.recipientName}</p><dl><div><dt>Выдан</dt><dd>{new Date(certificate.issuedAt).toLocaleDateString("ru-RU")}</dd></div><div><dt>Публичный код</dt><dd>{certificate.code}</dd></div></dl><Link to={`/certificate/${encodeURIComponent(certificate.code)}`}>Открыть и проверить</Link></article>)}</section>
    </main>
  );
}
