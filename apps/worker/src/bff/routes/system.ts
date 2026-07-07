import { Hono } from "hono";
import type { Env } from "../../env";
import { openApiDocument, swaggerHtml } from "../openapi";

export const systemRoute = new Hono<{ Bindings: Env }>();

systemRoute.get("/", (c) =>
  c.text(
    "euronews-pt-bff is running. API lives under /api (try /api/health, /api/today, or /api/docs); " +
      "the reading app itself is the Vite dev server on http://localhost:5173.",
  ),
);

systemRoute.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "euronews-pt-bff",
  }),
);

systemRoute.get("/api/openapi.json", (c) => c.json(openApiDocument));

systemRoute.get("/api/docs", (c) => c.html(swaggerHtml));
