import { Hono } from "hono";
import type { Env } from "../../env";
import { completeArticle, getReviewState } from "../../study/studyRepository";

export const reviewRoute = new Hono<{ Bindings: Env }>();

reviewRoute.get("/review", (c) => c.json({ review: getReviewState() }));

reviewRoute.post("/articles/:articleId/complete", (c) => {
  const completedArticleIds = completeArticle(c.req.param("articleId"));

  return c.json({
    completedArticleIds,
  });
});
