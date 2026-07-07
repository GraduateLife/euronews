import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../env";
import { articlesRoute } from "./routes/articles";
import { reviewRoute } from "./routes/review";
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

app.get("/", (c) =>
  c.text(
    "euronews-pt-bff is running. API lives under /api (try /api/health or /api/today); " +
      "the reading app itself is the Vite dev server on http://localhost:5173."
  )
);

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "euronews-pt-bff",
  })
);

/**
 * Diagnostic: runs the translation model directly with both language-code
 * conventions and returns the raw results/errors, since production translate
 * failures are otherwise only visible in `wrangler tail`.
 * Usage: GET /api/debug/translate?text=Bom%20dia
 */
app.get("/api/debug/translate", async (c) => {
  const text = c.req.query("text") ?? "A Europa está a mudar rapidamente.";
  if (!c.env.AI) return c.json({ aiAvailable: false, note: "AI binding missing" });

  const attempts = [];
  for (const [source_lang, target_lang] of [
    ["portuguese", "chinese"],
    ["pt", "zh"],
  ]) {
    try {
      const result = await c.env.AI.run("@cf/meta/m2m100-1.2b" as never, { text, source_lang, target_lang } as never);
      attempts.push({ source_lang, target_lang, result });
    } catch (error) {
      attempts.push({ source_lang, target_lang, error: String(error) });
    }
  }
  return c.json({ aiAvailable: true, text, attempts });
});

app.route("/api", articlesRoute);
app.route("/api", wordsRoute);
app.route("/api", sentencesRoute);
app.route("/api", reviewRoute);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
    },
    404
  )
);
