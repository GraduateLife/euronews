import type { ArticleDetail, ArticleSummary, SentencePractice, WordLookup } from "@euronews/shared";
import { priberamUrlFor } from "@euronews/shared";
import { mockArticles } from "./mockData";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getToday(): Promise<ArticleSummary[]> {
  const fallback = () =>
    mockArticles.map(({ paragraphs: _paragraphs, ...article }) => article);

  try {
    const data = await requestJson<{ articles: ArticleSummary[] }>("/api/today");
    return data.articles;
  } catch {
    return fallback();
  }
}

export async function getArticle(articleId: string): Promise<ArticleDetail> {
  try {
    const data = await requestJson<{ article: ArticleDetail }>(`/api/articles/${articleId}`);
    return data.article;
  } catch {
    const article = mockArticles.find((item) => item.id === articleId);
    if (!article) throw new Error("Article not found");
    return article;
  }
}

export async function lookupWord(word: string): Promise<WordLookup> {
  const clean = word.trim().toLowerCase();

  try {
    const data = await requestJson<{ lookup: WordLookup }>("/api/words/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: clean }),
    });
    return data.lookup;
  } catch {
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
}

export async function createSentencePractice(sourceSentence: string): Promise<SentencePractice> {
  try {
    const data = await requestJson<{ practice: SentencePractice }>("/api/sentences/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceSentence }),
    });
    return data.practice;
  } catch {
    return {
      sourceSentence,
      structureLabel: "Noticia declarativa com complemento temporal",
      tenseFocus: "presente, preterito perfeito, futuro, condicional",
      generatedPt: "O governo apresenta novas medidas antes da reuniao de segunda-feira.",
      promptZhHans: "政府在周一的会议前提出新的措施。",
    };
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
