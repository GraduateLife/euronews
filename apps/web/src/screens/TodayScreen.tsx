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

  const [lead, ...rest] = articles;

  return (
    <section className="screen frontpage">
      <div className="frontpage__intro">
        <p className="kicker">Edição de hoje</p>
        <h1>Três textos para ler devagar</h1>
        <p className="frontpage__progress">
          <b>{done}</b> de <b>{articles.length || 3}</b> concluídos
        </p>
      </div>

      <div className="story-grid">
        {lead ? <StoryTeaser article={lead} index={0} lead /> : null}
      </div>

      <div className="story-grid story-grid--rest">
        {rest.map((article, index) => (
          <StoryTeaser key={article.id} article={article} index={index + 1} />
        ))}
      </div>
    </section>
  );
}

type Teaser = {
  id: string;
  title: string;
  dek: string;
  estimatedMinutes: number;
  completed: boolean;
};

function StoryTeaser({ article, index, lead = false }: { article: Teaser; index: number; lead?: boolean }) {
  return (
    <Link
      className={lead ? "story story--lead" : "story"}
      to="/article/$articleId"
      params={{ articleId: article.id }}
    >
      <div className="story__top">
        <span className="kicker">Nº {String(index + 1).padStart(2, "0")}</span>
        <span className={article.completed ? "story__meta story__meta--done" : "story__meta"}>
          {article.completed ? "✦ Lido" : `${article.estimatedMinutes} min`}
        </span>
      </div>
      <h2 className="story__headline">{article.title}</h2>
      <p className="story__dek">{article.dek}</p>
      <span className="story__more">Ler o texto →</span>
    </Link>
  );
}
