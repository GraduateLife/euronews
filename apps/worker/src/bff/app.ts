import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../env";
import { articlesRoute } from "./routes/articles";
import { sentencesRoute } from "./routes/sentences";
import { wordsRoute } from "./routes/words";

export const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "euronews-pt-bff",
  })
);

app.route("/api", articlesRoute);
app.route("/api", wordsRoute);
app.route("/api", sentencesRoute);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
    },
    404
  )
);
