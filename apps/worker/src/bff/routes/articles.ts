import { Hono } from "hono";
import { fetchDailyMockArticles } from "../../article-fetchers/mockArticleFetcher";
import type { Env } from "../../env";

export const articlesRoute = new Hono<{ Bindings: Env }>();

articlesRoute.get("/today", (c) => {
  const articles = fetchDailyMockArticles().map(
    ({ paragraphs: _paragraphs, ...summary }) => summary
  );

  return c.json({
    articles,
    source: "mock-fixed",
    fetchedAt: new Date().toISOString(),
  });
});

articlesRoute.get("/articles/:articleId", (c) => {
  const article = fetchDailyMockArticles().find(
    (item) => item.id === c.req.param("articleId")
  );

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  return c.json({
    article,
    source: "mock-fixed",
    fetchedAt: new Date().toISOString(),
  });
});
