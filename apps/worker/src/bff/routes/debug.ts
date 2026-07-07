import { Hono } from "hono";
import type { Env } from "../../env";

export const debugRoute = new Hono<{ Bindings: Env }>();

/**
 * Diagnostic: runs the translation model directly with both language-code
 * conventions and returns the raw results/errors, since production translate
 * failures are otherwise only visible in `wrangler tail`.
 * Usage: GET /api/debug/translate?text=Bom%20dia
 */
debugRoute.get("/debug/translate", async (c) => {
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
