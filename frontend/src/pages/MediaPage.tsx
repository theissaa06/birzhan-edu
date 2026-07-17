import { useEffect, useState } from "react";
import FrameIcon from "../components/FrameIcon";
import api from "../services/api";
import "./DirectoryPage.css";

type Article = { id: number; title: string; description: string; category: string; type: string; imageUrl?: string | null; content?: string | null; createdAt: string };

export default function MediaPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/media").then(({ data }) => setArticles(data.articles || [])).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return <main className="directory-page"><header className="directory-head"><span className="timecode">MEDIA / LIBRARY</span><h1>Медиа</h1><p>Материалы редакции загружаются из API и обновляются без повторной публикации frontend.</p></header>{loading && <div className="directory-state">Загружаем материалы…</div>}{!loading && !articles.length && <div className="directory-state"><FrameIcon name="folder" /><h2>Материалов пока нет</h2><p>Редакция ещё не опубликовала статьи или разборы.</p></div>}<section className="directory-grid">{articles.map((article) => <article key={article.id} className="directory-card"><FrameIcon name="folder" /><div className="directory-meta"><span>{article.category}</span><span>{article.type}</span><span>{new Date(article.createdAt).toLocaleDateString("ru-RU")}</span></div><h2>{article.title}</h2><p>{article.description}</p>{article.content && <details><summary>Читать</summary><p>{article.content}</p></details>}</article>)}</section></main>;
}
