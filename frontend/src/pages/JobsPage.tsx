import { type FormEvent, useEffect, useState } from "react";
import FrameIcon from "../components/FrameIcon";
import api from "../services/api";
import { showToast } from "../services/appToast";
import "./DirectoryPage.css";

type Job = { id: number; title: string; company: string; description: string; location: string; employmentType: string; salary?: string | null; createdAt: string };

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Job | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  useEffect(() => { api.get("/jobs").then(({ data }) => setJobs(data.jobs || data.data || [])).catch(() => undefined).finally(() => setLoading(false)); }, []);
  async function apply(event: FormEvent) { event.preventDefault(); if (!selected) return; try { const { data } = await api.post(`/jobs/${selected.id}/applications`, form); showToast({ tone: "success", title: "Отклик отправлен", message: data.message || "Работодатель получил отклик." }); setSelected(null); setForm({ name: "", email: "", phone: "", message: "" }); } catch (error) { showToast({ tone: "error", title: "Отклик не отправлен", message: (error as {response?:{data?:{message?:string}}}).response?.data?.message || "Проверьте поля формы." }); } }
  return <main className="directory-page"><header className="directory-head"><span className="timecode">CAREER / JOBS</span><h1>Вакансии</h1><p>Актуальные предложения, опубликованные командой платформы. Тестовые вакансии и выдуманные зарплаты не показываются.</p></header>{loading && <div className="directory-state">Загружаем вакансии…</div>}{!loading && !jobs.length && <div className="directory-state"><FrameIcon name="briefcase" /><h2>Опубликованных вакансий пока нет</h2><p>Раздел готов и покажет первое предложение сразу после модерации.</p></div>}<section className="directory-grid">{jobs.map((job) => <article key={job.id} className="directory-card"><FrameIcon name="briefcase" /><div className="directory-meta"><span>{job.company}</span><span>{job.location}</span><span>{job.employmentType}</span></div><h2>{job.title}</h2><p>{job.description}</p>{job.salary && <strong>{job.salary}</strong>}<button type="button" onClick={() => setSelected(job)}>Откликнуться</button></article>)}</section>{selected && <form className="directory-form" onSubmit={apply}><h2>Отклик: {selected.title}</h2><label>Имя<input value={form.name} onChange={(event) => setForm({...form,name:event.target.value})} required minLength={2}/></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({...form,email:event.target.value})} required/></label><label>Телефон<input value={form.phone} onChange={(event) => setForm({...form,phone:event.target.value})}/></label><label>Сопроводительное сообщение<textarea value={form.message} onChange={(event) => setForm({...form,message:event.target.value})} rows={4}/></label><div className="directory-form-actions"><button type="submit">Отправить</button><button type="button" onClick={() => setSelected(null)}>Отмена</button></div></form>}</main>;
}
