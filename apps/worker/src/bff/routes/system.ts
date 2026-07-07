import { Hono } from "hono";
import type { Env } from "../../env";
import { openApiDocument, swaggerHtml } from "../openapi";

export const systemRoute = new Hono<{ Bindings: Env }>();

systemRoute.get("/", (c) =>
  c.text(
    `euronews-pt-bff is running. API lives under /api (try /api/health or /api/today${isLocalRequest(c.req.url) ? ", local docs at /api/docs" : ""}); ` +
      "the reading app itself is the Vite dev server on http://localhost:5173.",
  ),
);

systemRoute.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "euronews-pt-bff",
  }),
);

systemRoute.get("/api/openapi.json", (c) => {
  if (!isLocalRequest(c.req.url)) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(openApiDocument);
});

systemRoute.get("/api/docs", (c) => {
  if (!isLocalRequest(c.req.url)) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.html(swaggerHtml);
});

function isLocalRequest(url: string) {
  const { hostname } = new URL(url);
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(
    hostname,
  );
}
