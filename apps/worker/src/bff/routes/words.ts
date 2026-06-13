import { priberamUrlFor } from "@euronews/shared";
import { Hono } from "hono";
import type { Env } from "../../env";
import { saveWordNote } from "../../study/studyRepository";
import { readJson } from "../http";

export const wordsRoute = new Hono<{ Bindings: Env }>();

wordsRoute.post("/words/lookup", async (c) => {
  const body = await readJson<{ word?: string }>(c);
  const word = body.word?.trim().toLowerCase() || "";

  if (!word) {
    return c.json({ error: "word is required" }, 400);
  }

  return c.json({
    lookup: {
      word,
      lemma: word,
      priberamUrl: priberamUrlFor(word),
      examplePt: exampleForWord(word),
      image: {
        url: imageForWord(word),
        alt: word,
        source: "placeholder",
      },
    },
  });
});

wordsRoute.post("/words/notes", async (c) => {
  const body = await readJson<{
    lookup?: {
      word: string;
      lemma: string;
      priberamUrl: string;
      examplePt: string;
      image: {
        url: string;
        alt: string;
        source: "unsplash" | "cloudflare-ai" | "placeholder";
        attribution?: string;
      };
    };
    meaning?: string;
    tags?: string;
  }>(c);

  if (!body.lookup) {
    return c.json({ error: "lookup is required" }, 400);
  }

  const note = saveWordNote({
    lookup: body.lookup,
    meaning: body.meaning ?? "",
    tags: body.tags ?? "",
  });

  return c.json({ note });
});

function exampleForWord(word: string) {
  return `Encontrei "${word}" numa frase curta da noticia.`;
}

function imageForWord(word: string) {
  return `https://source.unsplash.com/600x600/?${encodeURIComponent(word)}`;
}
