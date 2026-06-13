import type { ArticleDetail, ArticleSummary, SentencePractice, WordLookup } from "@euronews/shared";
import { priberamUrlFor } from "@euronews/shared";
import { mockArticles } from "./mockData";

const apiBase = import.meta.env.VITE_API_BASE_URL;

export async function getToday(): Promise<ArticleSummary[]> {
  if (!apiBase) return mockArticles.map(({ paragraphs: _paragraphs, ...article }) => article);
  const response = await fetch(`${apiBase}/api/today`);
  return response.json();
}

export async function getArticle(articleId: string): Promise<ArticleDetail> {
  if (!apiBase) {
    const article = mockArticles.find((item) => item.id === articleId);
    if (!article) throw new Error("Article not found");
    return article;
  }
  const response = await fetch(`${apiBase}/api/articles/${articleId}`);
  return response.json();
}

export async function lookupWord(word: string): Promise<WordLookup> {
  const clean = word.trim().toLowerCase();
  if (!apiBase) {
    return {
      word: clean,
      lemma: clean,
      priberamUrl: priberamUrlFor(clean),
      examplePt: `A palavra "${clean}" aparece num contexto concreto.`,
      image: {
        url: `https://source.unsplash.com/600x600/?${encodeURIComponent(clean)}`,
        alt: clean,
        source: "placeholder",
      },
    };
  }

  const response = await fetch(`${apiBase}/api/words/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: clean }),
  });
  return response.json();
}

export async function createSentencePractice(sourceSentence: string): Promise<SentencePractice> {
  if (!apiBase) {
    return {
      sourceSentence,
      structureLabel: "Noticia declarativa com complemento temporal",
      tenseFocus: "presente, preterito perfeito, futuro, condicional",
      generatedPt: "O governo apresenta novas medidas antes da reuniao de segunda-feira.",
      promptZhHans: "政府在周一的会议前提出新的措施。",
    };
  }

  const response = await fetch(`${apiBase}/api/sentences/practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceSentence }),
  });
  return response.json();
}
