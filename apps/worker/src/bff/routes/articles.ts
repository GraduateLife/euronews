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
 * Useful for first-time setup and local testing: curl -X POST /api/articles/refresh
 */
articlesRoute.post("/articles/refresh", async (c) => {
  try {
    const summary = await refreshDailyEdition(c.env);
    return c.json({ ok: true, ...summary });
  } catch (error) {
    return c.json({ ok: false, error: String(error) }, 502);
  }
});
