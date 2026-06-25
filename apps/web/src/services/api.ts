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

import { mockArticles } from "./mockData";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getToday(): Promise<ArticleSummary[]> {
  try {
    const data = await requestJson<{ articles: ArticleSummary[] }>("/api/today");
    return data.articles;
  } catch {
    // The Worker is offline; keep the UI inspectable with the bundled fallback.
    return mockArticles.map(({ paragraphs: _paragraphs, ...summary }) => summary);
  }
}

export async function getArticle(articleId: string): Promise<ArticleDetail> {
  try {
    const data = await requestJson<{ article: ArticleDetail }>(`/api/articles/${articleId}`);
    return data.article;
  } catch {
    const fallback = mockArticles.find((article) => article.id === articleId) ?? mockArticles[0];
    return fallback;
  }
}

export async function lookupWord(word: string): Promise<WordLookup> {
  const data = await requestJson<{ lookup: WordLookup }>("/api/words/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: word.trim().toLowerCase() }),
  });

  return data.lookup;
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
  } catch {
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
