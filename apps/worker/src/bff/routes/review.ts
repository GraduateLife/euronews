import { Hono } from "hono";
import type { Env } from "../../env";
import { completeArticle, getReviewState } from "../../study/studyRepository";

export const reviewRoute = new Hono<{ Bindings: Env }>();

reviewRoute.get("/review", async (c) =>
  c.json({ review: await getReviewState(c.env.DB) })
);

reviewRoute.post("/articles/:articleId/complete", async (c) => {
  const completedArticleIds = await completeArticle(
    c.env.DB,
    c.req.param("articleId")
  );

  return c.json({
    completedArticleIds,
  });
});
