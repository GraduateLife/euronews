import type {
  PracticeFeedback,
  ReviewState,
  SavedParagraphPractice,
  WordLookup,
  WordNote,
} from "@euronews/shared";

type WordNoteRow = {
  id: string;
  word: string;
  lemma: string;
  meaning: string;
  tags_json: string;
  image_url: string;
  example_pt: string;
  priberam_url: string;
  saved_at: string;
};

type ParagraphPracticeRow = {
  id: string;
  paragraph_pt: string;
  selected_text: string;
  target_sentence: string;
  structure_label: string;
  tense_focus: string;
  generated_paragraph_pt: string;
  prompt_zh_hans: string;
  user_zh_hans: string;
  user_pt: string;
  feedback_json: string;
  saved_at: string;
};

type CompletedArticleRow = {
  article_id: string;
};

export async function getReviewState(db: D1Database): Promise<ReviewState> {
  const [completedArticles, wordNotes, paragraphPractices] = await Promise.all([
    db
      .prepare("SELECT article_id FROM completed_articles ORDER BY completed_at DESC")
      .all<CompletedArticleRow>(),
    db
      .prepare("SELECT * FROM word_notes ORDER BY saved_at DESC")
      .all<WordNoteRow>(),
    db
      .prepare("SELECT * FROM paragraph_practices ORDER BY saved_at DESC")
      .all<ParagraphPracticeRow>(),
  ]);

  return {
    completedArticleIds: completedArticles.results.map((row) => row.article_id),
    wordNotes: wordNotes.results.map(mapWordNote),
    paragraphPractices: paragraphPractices.results.map(mapParagraphPractice),
  };
}

export async function saveWordNote(
  db: D1Database,
  input: {
    lookup: WordLookup;
    meaning: string;
    tags: string;
  }
): Promise<WordNote> {
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

  await db
    .prepare(
      `INSERT INTO word_notes (
        id,
        word,
        lemma,
        meaning,
        tags_json,
        image_url,
        example_pt,
        priberam_url,
        saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      note.id,
      note.word,
      note.lemma,
      note.meaning,
      JSON.stringify(note.tags),
      note.imageUrl,
      note.examplePt,
      note.priberamUrl,
      note.savedAt
    )
    .run();

  return note;
}

export async function saveParagraphPractice(
  db: D1Database,
  input: Omit<SavedParagraphPractice, "id" | "savedAt">
): Promise<SavedParagraphPractice> {
  const practice: SavedParagraphPractice = {
    ...input,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  await db
    .prepare(
      `INSERT INTO paragraph_practices (
        id,
        paragraph_pt,
        selected_text,
        target_sentence,
        structure_label,
        tense_focus,
        generated_paragraph_pt,
        prompt_zh_hans,
        user_zh_hans,
        user_pt,
        feedback_json,
        saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      practice.id,
      practice.paragraphPt,
      practice.selectedText,
      practice.targetSentence,
      practice.structureLabel,
      practice.tenseFocus,
      practice.generatedParagraphPt,
      practice.promptZhHans,
      practice.userZhHans,
      practice.userPt,
      JSON.stringify(practice.feedback),
      practice.savedAt
    )
    .run();

  return practice;
}

export async function completeArticle(
  db: D1Database,
  articleId: string
): Promise<string[]> {
  await db
    .prepare(
      `INSERT INTO completed_articles (article_id, completed_at)
      VALUES (?, ?)
      ON CONFLICT(article_id) DO UPDATE SET completed_at = excluded.completed_at`
    )
    .bind(articleId, new Date().toISOString())
    .run();

  const completed = await db
    .prepare("SELECT article_id FROM completed_articles ORDER BY completed_at DESC")
    .all<CompletedArticleRow>();

  return completed.results.map((row) => row.article_id);
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

function mapWordNote(row: WordNoteRow): WordNote {
  return {
    id: row.id,
    word: row.word,
    lemma: row.lemma,
    meaning: row.meaning,
    tags: parseJson<string[]>(row.tags_json, []),
    imageUrl: row.image_url,
    examplePt: row.example_pt,
    priberamUrl: row.priberam_url,
    savedAt: row.saved_at,
  };
}

function mapParagraphPractice(row: ParagraphPracticeRow): SavedParagraphPractice {
  return {
    id: row.id,
    paragraphPt: row.paragraph_pt,
    selectedText: row.selected_text,
    targetSentence: row.target_sentence,
    structureLabel: row.structure_label,
    tenseFocus: row.tense_focus,
    generatedParagraphPt: row.generated_paragraph_pt,
    promptZhHans: row.prompt_zh_hans,
    userZhHans: row.user_zh_hans,
    userPt: row.user_pt,
    feedback: parseJson<PracticeFeedback>(row.feedback_json, {
      summary: "",
      diff: [],
    }),
    savedAt: row.saved_at,
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
