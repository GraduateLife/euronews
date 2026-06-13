import { app } from "./bff/app";
import { runScheduledArticleFetch } from "./crawler/scheduledArticleFetch";
import type { Env } from "./env";

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledArticleFetch(event, env));
  },
};
