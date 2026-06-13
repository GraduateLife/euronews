import { priberamUrlFor } from "@euronews/shared";
import { Hono } from "hono";
import type { Env } from "../../env";
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

function exampleForWord(word: string) {
  return `Encontrei "${word}" numa frase curta da noticia.`;
}

function imageForWord(word: string) {
  return `https://source.unsplash.com/600x600/?${encodeURIComponent(word)}`;
}
