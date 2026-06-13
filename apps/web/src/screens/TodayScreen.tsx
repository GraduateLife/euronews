import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getReview, getToday } from "../services/api";

export function TodayScreen() {
  const today = useQuery({ queryKey: ["today"], queryFn: getToday });
  const review = useQuery({ queryKey: ["review"], queryFn: getReview });
  const completedArticleIds = review.data?.completedArticleIds ?? [];
  const articles = (today.data ?? []).map((article) => ({
    ...article,
    completed: completedArticleIds.includes(article.id),
  }));
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
            <span className="minutes">{article.completed ? "feito" : `${article.estimatedMinutes}m`}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
