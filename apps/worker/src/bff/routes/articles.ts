import { sampleArticles } from "@euronews/shared";
import { Hono } from "hono";
import { getLatestEdition, getStoredArticle } from "../../articles/articleRepository";
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
  const article =
    (await getStoredArticle(c.env.DB, articleId)) ??
    sampleArticles.find((item) => item.id === articleId) ??
    null;

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  return c.json({
    article,
    fetchedAt: new Date().toISOString(),
  });
});

/**
 * Manual trigger for the daily fetch — same pipeline as the 06:00 UTC cron.
 * The full run (fetch + per-paragraph AI translation) takes ~30s, far too
 * long for a synchronous HTTP response, so it runs in the background via
 * waitUntil and this endpoint returns immediately. Poll /api/articles/status
 * (or watch `wrangler tail`) to see the outcome.
 */
articlesRoute.post("/articles/refresh", (c) => {
  c.executionCtx.waitUntil(
    refreshDailyEdition(c.env)
      .then((summary) => console.log(JSON.stringify({ job: "manual-refresh", ok: true, ...summary })))
      .catch((error) => console.log(JSON.stringify({ job: "manual-refresh", ok: false, error: String(error) })))
  );

  return c.json({
    ok: true,
    started: true,
    note: "Fetching and translating in the background (~1 minute). Poll GET /api/articles/status; errors appear in `wrangler tail`.",
  });
});
