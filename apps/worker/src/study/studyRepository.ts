import type {
  PracticeFeedback,
  ReviewState,
  SavedParagraphPractice,
  WordLookup,
  WordNote,
} from "@euronews/shared";

const reviewState: ReviewState = {
  completedArticleIds: [],
  wordNotes: [],
  paragraphPractices: [],
};

export function getReviewState() {
  return reviewState;
}

export function saveWordNote(input: {
  lookup: WordLookup;
  meaning: string;
  tags: string;
}) {
  const note: WordNote = {
    id: crypto.randomUUID(),
    word: input.lookup.word,
    lemma: input.lookup.lemma,
    meaning: input.meaning.trim(),
    tags: input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    imageUrl: input.lookup.image.url,
    examplePt: input.lookup.examplePt,
    priberamUrl: input.lookup.priberamUrl,
    savedAt: new Date().toISOString(),
  };

  reviewState.wordNotes.unshift(note);
  return note;
}

export function saveParagraphPractice(
  input: Omit<SavedParagraphPractice, "id" | "savedAt">
) {
  const practice: SavedParagraphPractice = {
    ...input,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  reviewState.paragraphPractices.unshift(practice);
  return practice;
}

export function completeArticle(articleId: string) {
  if (!reviewState.completedArticleIds.includes(articleId)) {
    reviewState.completedArticleIds.unshift(articleId);
  }

  return reviewState.completedArticleIds;
}

export function createMockFeedback(input: {
  userPt: string;
  expectedPt: string;
}): PracticeFeedback {
  return {
    summary:
      "A ideia geral esta clara; compara o tempo verbal, a ordem dos complementos e as preposicoes.",
    diff: [
      {
        kind: "replace",
        user: input.userPt,
        expected: input.expectedPt,
        note: "Mantem a estrutura da frase-modelo dentro do paragrafo.",
      },
    ],
  };
}
