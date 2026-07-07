import type {
  ArticleDetail,
  ArticleSummary,
  ParagraphPractice,
  PracticeFeedback,
  ReviewState,
  SavedParagraphPractice,
  WordLookup,
  WordNote,
} from "@euronews/shared";
import { priberamUrlFor } from "@euronews/shared";

import { mockArticles } from "./mockData";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

/** Silent fallbacks hide integration problems; always say why we degraded. */
function warnFallback(what: string, error: unknown) {
  console.warn(
    `[api] ${what} failed (${String(error)}); serving the bundled sample data instead. ` +
      `API base is ${apiBase ? `"${apiBase}"` : "relative (vite proxy -> localhost:8787)"} — ` +
      "set VITE_API_BASE_URL in the repo-root .env and restart vite to target a deployed worker."
  );
}

export async function getToday(): Promise<ArticleSummary[]> {
  try {
    const data = await requestJson<{ articles: ArticleSummary[] }>("/api/today");
    return data.articles;
  } catch (error) {
    warnFallback("GET /api/today", error);
    return mockArticles.map(({ paragraphs: _paragraphs, ...summary }) => summary);
  }
}

export async function getArticle(articleId: string): Promise<ArticleDetail> {
  try {
    const data = await requestJson<{ article: ArticleDetail }>(`/api/articles/${articleId}`);
    return data.article;
  } catch (error) {
    warnFallback(`GET /api/articles/${articleId}`, error);
    const fallback = mockArticles.find((article) => article.id === articleId) ?? mockArticles[0];
    return fallback;
  }
}

export async function lookupWord(word: string): Promise<WordLookup> {
  const term = word.trim();
  try {
    const data = await requestJson<{ lookup: WordLookup }>("/api/words/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: term.toLowerCase() }),
    });

    return data.lookup;
  } catch (error) {
    warnFallback("POST /api/words/lookup", error);
    const headword = term.split(/\s+/)[0] ?? term;
    return {
      word: term,
      lemma: term.toLowerCase(),
      priberamUrl: priberamUrlFor(headword),
      examplePt: `"${term}" aparece com frequência neste tipo de texto noticioso.`,
      image: {
        url: placeholderImage(term),
        alt: term,
        source: "placeholder",
      },
    };
  }
}

function placeholderImage(term: string): string {
  const label = term.replace(/[<>&]/g, "").slice(0, 24);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>
    <rect width='100%' height='100%' fill='#ddcfac'/>
    <rect x='8' y='8' width='304' height='164' fill='none' stroke='#5a4c39' stroke-width='1.5'/>
    <text x='50%' y='52%' text-anchor='middle' dominant-baseline='middle'
      font-family='Georgia, serif' font-style='italic' font-size='26' fill='#7c2d23'>${label}</text>
    <text x='50%' y='80%' text-anchor='middle'
      font-family='Arial, sans-serif' font-size='10' letter-spacing='2' fill='#7a6a52'>IMAGEM INDISPONÍVEL</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export async function saveWordNote(input: {
  lookup: WordLookup;
  meaning: string;
  tags: string;
}): Promise<WordNote> {
  const data = await requestJson<{ note: WordNote }>("/api/words/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return data.note;
}

export async function createParagraphPractice(input: {
  paragraphPt: string;
  selectedText: string;
  targetSentence: string;
}): Promise<ParagraphPractice> {
  const data = await requestJson<{ practice: ParagraphPractice }>("/api/paragraphs/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return data.practice;
}

export async function createParagraphFeedback(input: {
  practice: ParagraphPractice;
  userZhHans: string;
  userPt: string;
}): Promise<{ feedback: PracticeFeedback; practice: SavedParagraphPractice }> {
  return requestJson<{ feedback: PracticeFeedback; practice: SavedParagraphPractice }>(
    "/api/paragraphs/feedback",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input.practice,
        userZhHans: input.userZhHans,
        userPt: input.userPt,
      }),
    }
  );
}

export async function completeArticle(articleId: string): Promise<string[]> {
  const data = await requestJson<{ completedArticleIds: string[] }>(
    `/api/articles/${articleId}/complete`,
    {
      method: "POST",
    }
  );

  return data.completedArticleIds;
}

export async function getReview(): Promise<ReviewState> {
  try {
    const data = await requestJson<{ review: ReviewState }>("/api/review");
    return data.review;
  } catch (error) {
    warnFallback("GET /api/review", error);
    return { completedArticleIds: [], wordNotes: [], paragraphPractices: [] };
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
