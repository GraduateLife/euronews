import { priberamUrlFor } from "@euronews/shared";

export interface Env {
  UNSPLASH_ACCESS_KEY?: string;
  AI?: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/words/lookup" && request.method === "POST") {
      const body = (await request.json()) as { word?: string };
      const word = body.word?.trim().toLowerCase() || "";

      return json({
        word,
        lemma: word,
        priberamUrl: priberamUrlFor(word),
        examplePt: `Vi a palavra "${word}" numa noticia curta.`,
        image: {
          url: await imageForWord(word, env),
          alt: word,
          source: "placeholder",
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },

  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext) {
    // Later: fetch 3 fresh Euronews PT articles and persist them.
  },
};

async function imageForWord(word: string, _env: Env) {
  return `https://source.unsplash.com/600x600/?${encodeURIComponent(word)}`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
