import { translatePtToZh } from "../ai/languageAi";
import {
  estimateMinutes,
  fetchDailyEuronewsArticles,
} from "../article-fetchers/euronews";
import { deleteEdition, listStoredArticleIds, storeArticles } from "../articles/articleRepository";
import type { StorableArticle } from "../articles/articleRepository";
import type { Env } from "../env";

const DAILY_ARTICLE_COUNT = 5;

export async function runScheduledArticleFetch(event: ScheduledEvent, env: Env) {
  // The cron defers translation to first read, same as the manual refresh:
  // with 5 articles x 10 paragraphs, inline translation would exceed the
  // 50-subrequests-per-invocation budget of the Workers free plan.
  const summary = await refreshDailyEdition(env, { translate: false });
  console.log(
    JSON.stringify({
      job: "scheduled-article-fetch",
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      ...summary,
    })
  );
}

/**
 * Fetch today's edition from Euronews and store it in D1. With
 * `translate: true` every paragraph is translated to Simplified Chinese
 * inline (cron path); otherwise paragraphs are stored untranslated and are
 * translated lazily the first time an article is opened.
 */
export async function refreshDailyEdition(env: Env, options: { translate?: boolean } = {}) {
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
    // Concurrent per-article translation (cron path only) — the calls are
    // independent, and in series a 5-article run took minutes.
    const translations = options.translate
      ? await Promise.all(article.paragraphsPt.map((pt) => translatePtToZh(env, pt)))
      : article.paragraphsPt.map(() => "");
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

  // Replace today's edition atomically-enough: re-running refresh swaps the
  // day's articles instead of piling more onto the same edition_date.
  await deleteEdition(env.DB, editionDate);
  await storeArticles(env.DB, articles);

  return {
    editionDate,
    storedArticles: articles.map((article) => article.id),
    translatedParagraphs,
    translationMode: options.translate ? "inline" : "on-first-read",
    aiAvailable: Boolean(env.AI),
  };
}
