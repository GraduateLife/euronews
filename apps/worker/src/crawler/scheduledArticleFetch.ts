import { translatePtToZh } from "../ai/languageAi";
import {
  estimateMinutes,
  fetchDailyEuronewsArticles,
} from "../article-fetchers/euronewsFetcher";
import { listStoredArticleIds, storeArticles } from "../articles/articleRepository";
import type { StorableArticle } from "../articles/articleRepository";
import type { Env } from "../env";

const DAILY_ARTICLE_COUNT = 5;

export async function runScheduledArticleFetch(event: ScheduledEvent, env: Env) {
  const summary = await refreshDailyEdition(env);
  console.log(
    JSON.stringify({
      job: "scheduled-article-fetch",
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      ...summary,
    })
  );
}

/**
 * Fetch today's edition from Euronews, translate each paragraph to Simplified
 * Chinese with Workers AI, and store everything in D1. Reused by the cron job
 * and the manual POST /api/articles/refresh endpoint.
 */
export async function refreshDailyEdition(env: Env) {
  const stored = await listStoredArticleIds(env.DB);
  const fetched = await fetchDailyEuronewsArticles({
    count: DAILY_ARTICLE_COUNT,
    isAlreadyStored: (id) => stored.has(id),
  });
  if (fetched.length === 0) {
    throw new Error(
      "RSS was reachable but no article page could be parsed into paragraphs — " +
        "the page structure may have changed, or article pages are being blocked. Check the worker logs for per-article reasons."
    );
  }

  const editionDate = new Date().toISOString().slice(0, 10);
  const articles: StorableArticle[] = [];
  let translatedParagraphs = 0;

  for (const article of fetched) {
    // Translate the article's paragraphs concurrently — they are independent
    // AI calls and doing them in series made a 5-article run take minutes.
    const translations = await Promise.all(article.paragraphsPt.map((pt) => translatePtToZh(env, pt)));
    const paragraphs = article.paragraphsPt.map((pt, i) => {
      if (translations[i]) translatedParagraphs++;
      return { pt, zhHans: translations[i] };
    });

    articles.push({
      id: article.id,
      title: article.title,
      dek: article.dek,
      sourceUrl: article.sourceUrl,
      publishedAt: article.publishedAt,
      estimatedMinutes: estimateMinutes(article.paragraphsPt),
      completed: false,
      editionDate,
      paragraphs,
    });
  }

  await storeArticles(env.DB, articles);

  return {
    editionDate,
    storedArticles: articles.map((article) => article.id),
    translatedParagraphs,
    aiAvailable: Boolean(env.AI),
  };
}
