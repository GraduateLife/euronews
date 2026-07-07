import { sampleArticles } from "@euronews/shared";
import type { ArticleDetail } from "@euronews/shared";
import { Hono } from "hono";
import { translatePtToZh } from "../../ai/languageAi";
import {
  getLatestEdition,
  getStoredArticle,
  saveParagraphTranslation,
} from "../../articles/articleRepository";
import { refreshDailyEdition } from "../../crawler/scheduledArticleFetch";
import type { Env } from "../../env";

export const articlesRoute = new Hono<{ Bindings: Env }>();

articlesRoute.get("/today", async (c) => {
  const stored = await getLatestEdition(c.env.DB);
  const usingStored = stored.length > 0;
  const articles = usingStored
    ? stored
    : sampleArticles.map(({ paragraphs: _paragraphs, ...summary }) => summary);

  return c.json({
    articles,
    source: usingStored ? "euronews-d1" : "sample-fallback",
    fetchedAt: new Date().toISOString(),
  });
});

/** Latest stored edition, for polling after a refresh.
 *  Registered before /articles/:articleId so "status" is not read as an id. */
articlesRoute.get("/articles/status", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT edition_date, COUNT(*) AS article_count, MAX(fetched_at) AS last_fetched_at FROM articles GROUP BY edition_date ORDER BY edition_date DESC LIMIT 1"
  ).first<{ edition_date: string; article_count: number; last_fetched_at: string }>();

  return c.json({
    hasStoredEdition: Boolean(row),
    editionDate: row?.edition_date ?? null,
    articleCount: row?.article_count ?? 0,
    lastFetchedAt: row?.last_fetched_at ?? null,
  });
});

articlesRoute.get("/articles/:articleId", async (c) => {
  const articleId = c.req.param("articleId");
  const stored = await getStoredArticle(c.env.DB, articleId);
  const article = stored
    ? await ensureTranslations(c.env, stored)
    : sampleArticles.find((item) => item.id === articleId) ?? null;

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  return c.json({
    article,
    fetchedAt: new Date().toISOString(),
  });
});

/**
 * Translate any untranslated paragraphs the first time an article is opened
 * (the manual refresh stores articles untranslated) and persist the result so
 * later reads are served straight from D1.
 */
async function ensureTranslations(env: Env, article: ArticleDetail): Promise<ArticleDetail> {
  if (!env.AI) return article;
  const missing = article.paragraphs.filter((paragraph) => !paragraph.zhHans);
  if (missing.length === 0) return article;

  const translations = await Promise.all(missing.map((paragraph) => translatePtToZh(env, paragraph.pt)));
  const translatedById = new Map<string, string>();
  await Promise.all(
    missing.map((paragraph, i) => {
      if (!translations[i]) return Promise.resolve();
      translatedById.set(paragraph.id, translations[i]);
      return saveParagraphTranslation(env.DB, paragraph.id, translations[i]);
    })
  );
  if (translatedById.size === 0) return article;

  return {
    ...article,
    paragraphs: article.paragraphs.map((paragraph) =>
      translatedById.has(paragraph.id) ? { ...paragraph, zhHans: translatedById.get(paragraph.id)! } : paragraph
    ),
  };
}

/**
 * Manual trigger for the daily fetch. Runs synchronously WITHOUT translation
 * (~10-15s, fine for an HTTP response) so the summary comes back in the
 * response body; translations are generated lazily on first read. Deferring
 * the whole pipeline to waitUntil does not work: the platform cancels
 * waitUntil tasks ~30s after the response, long before translation finishes.
 * The daily cron, which has minutes of wall time, still translates inline.
 */
articlesRoute.post("/articles/refresh", async (c) => {
  try {
    const summary = await refreshDailyEdition(c.env, { translate: false });
    return c.json({
      ok: true,
      ...summary,
      note: "Paragraphs are translated the first time each article is opened (the nightly cron translates upfront).",
    });
  } catch (error) {
    return c.json({ ok: false, error: String(error) }, 502);
  }
});
