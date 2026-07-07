import { priberamUrlFor } from "@euronews/shared";
import type { WordLookup } from "@euronews/shared";
import { Hono } from "hono";
import { describeWord } from "../../ai/languageAi";
import type { Env } from "../../env";
import { saveWordNote } from "../../study/studyRepository";
import { readJson } from "../http";

export const wordsRoute = new Hono<{ Bindings: Env }>();

wordsRoute.post("/words/lookup", async (c) => {
  const body = await readJson<{ word?: string }>(c);
  const word = body.word?.trim() || "";

  if (!word) {
    return c.json({ error: "word is required" }, 400);
  }

  // Monolingual Portuguese definition + PT example + an English image query,
  // then an Unsplash photo for that query. Both degrade gracefully.
  const insight = await describeWord(c.env, word);
  const image = await searchUnsplash(c.env, insight?.imageQueryEn || word, word);

  const lookup: WordLookup = {
    word,
    lemma: word.toLowerCase(),
    priberamUrl: priberamUrlFor(firstWord(word)),
    examplePt: insight?.examplePt || `Encontrei "${word}" numa notícia de hoje.`,
    definitionPt: insight?.definitionPt || "",
    image,
  };

  return c.json({ lookup });
});

wordsRoute.post("/words/notes", async (c) => {
  const body = await readJson<{
    lookup?: WordLookup;
    meaning?: string;
    tags?: string;
  }>(c);

  if (!body.lookup) {
    return c.json({ error: "lookup is required" }, 400);
  }

  const note = await saveWordNote(c.env.DB, {
    lookup: body.lookup,
    meaning: body.meaning ?? "",
    tags: body.tags ?? "",
  });

  return c.json({ note });
});

type UnsplashResponse = {
  results?: Array<{
    urls?: { regular?: string; small?: string };
    alt_description?: string | null;
    user?: { name?: string; links?: { html?: string } };
  }>;
};

async function searchUnsplash(env: Env, query: string, word: string): Promise<WordLookup["image"]> {
  if (!env.UNSPLASH_ACCESS_KEY) return placeholderImage(word);
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` },
    });
    if (!response.ok) return placeholderImage(word);

    const data = (await response.json()) as UnsplashResponse;
    const photo = data.results?.[0];
    const photoUrl = photo?.urls?.small || photo?.urls?.regular;
    if (!photoUrl) return placeholderImage(word);

    return {
      url: photoUrl,
      alt: photo?.alt_description || word,
      attribution: photo?.user?.name ? `Foto de ${photo.user.name} · Unsplash` : "Unsplash",
      source: "unsplash",
    };
  } catch (error) {
    console.log(JSON.stringify({ job: "unsplash", query, error: String(error) }));
    return placeholderImage(word);
  }
}

function placeholderImage(word: string): WordLookup["image"] {
  const label = word.replace(/[<>&"]/g, "").slice(0, 24);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='#ddcfac'/><rect x='8' y='8' width='304' height='164' fill='none' stroke='#5a4c39' stroke-width='1.5'/><text x='50%' y='52%' text-anchor='middle' dominant-baseline='middle' font-family='Georgia, serif' font-style='italic' font-size='26' fill='#7c2d23'>${label}</text><text x='50%' y='80%' text-anchor='middle' font-family='Arial, sans-serif' font-size='10' letter-spacing='2' fill='#7a6a52'>IMAGEM INDISPONÍVEL</text></svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    alt: word,
    source: "placeholder",
  };
}

function firstWord(term: string) {
  return term.split(/\s+/)[0] ?? term;
}
