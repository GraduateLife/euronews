import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getToday } from "../services/api";

export function TodayScreen() {
  const today = useQuery({ queryKey: ["today"], queryFn: getToday });
  const articles = today.data ?? [];
  const done = articles.filter((article) => article.completed).length;

  return (
    <section className="screen">
      <header className="page-header">
        <p className="eyebrow">Hoje</p>
        <h1>3 textos para ler devagar</h1>
        <p className="muted">{done}/3 completos</p>
      </header>

      <div className="article-list">
        {articles.map((article, index) => (
          <Link className="article-row" key={article.id} to="/article/$articleId" params={{ articleId: article.id }}>
            <span className="article-index">{index + 1}</span>
            <span>
              <strong>{article.title}</strong>
              <small>{article.dek}</small>
            </span>
            <span className="minutes">{article.estimatedMinutes}m</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
