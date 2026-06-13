import { fetchDailyMockArticles } from "../article-fetchers/mockArticleFetcher";
import type { Env } from "../env";

export async function runScheduledArticleFetch(
  event: ScheduledEvent,
  _env: Env
) {
  const articles = fetchDailyMockArticles();

  console.log(
    JSON.stringify({
      job: "scheduled-article-fetch",
      mode: "mock",
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      articles: articles.map((article) => article.id),
    })
  );
}
