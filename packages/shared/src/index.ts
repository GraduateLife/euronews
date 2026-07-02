export type ArticleSummary = {
  id: string;
  title: string;
  dek: string;
  sourceUrl: string;
  publishedAt: string;
  estimatedMinutes: number;
  completed: boolean;
};

export type Paragraph = {
  id: string;
  articleId: string;
  index: number;
  pt: string;
  zhHans: string;
};

export type ArticleDetail = ArticleSummary & {
  paragraphs: Paragraph[];
};

export type WordLookup = {
  word: string;
  lemma: string;
  priberamUrl: string;
  examplePt: string;
  image: {
    url: string;
    alt: string;
    attribution?: string;
    source: "unsplash" | "cloudflare-ai" | "placeholder";
  };
};

export type WordNote = {
  id: string;
  word: string;
  lemma: string;
  meaning: string;
  tags: string[];
  imageUrl: string;
  examplePt: string;
  priberamUrl: string;
  savedAt: string;
};

export type ParagraphPractice = {
  paragraphPt: string;
  targetSentence: string;
  selectedText: string;
  structureLabel: string;
  tenseFocus: string;
  generatedParagraphPt: string;
  promptZhHans: string;
};

export type PracticeFeedback = {
  summary: string;
  diff: Array<{
    kind: "keep" | "missing" | "extra" | "replace";
    user?: string;
    expected?: string;
    note?: string;
  }>;
};

export type SavedParagraphPractice = ParagraphPractice & {
  id: string;
  userZhHans: string;
  userPt: string;
  feedback: PracticeFeedback;
  savedAt: string;
};

export type ReviewState = {
  completedArticleIds: string[];
  wordNotes: WordNote[];
  paragraphPractices: SavedParagraphPractice[];
};

export { sampleArticles } from "./sampleArticles";

export const PRIBERAM_BASE_URL = "https://dicionario.priberam.org";

export function priberamUrlFor(word: string) {
  return `${PRIBERAM_BASE_URL}/${encodeURIComponent(word.trim().toLowerCase())}`;
}
