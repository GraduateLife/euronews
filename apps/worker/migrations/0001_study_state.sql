CREATE TABLE IF NOT EXISTS completed_articles (
  article_id TEXT PRIMARY KEY,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_notes (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  lemma TEXT NOT NULL,
  meaning TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  image_url TEXT NOT NULL,
  example_pt TEXT NOT NULL,
  priberam_url TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_word_notes_saved_at
ON word_notes(saved_at DESC);

CREATE TABLE IF NOT EXISTS paragraph_practices (
  id TEXT PRIMARY KEY,
  paragraph_pt TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  target_sentence TEXT NOT NULL,
  structure_label TEXT NOT NULL,
  tense_focus TEXT NOT NULL,
  generated_paragraph_pt TEXT NOT NULL,
  prompt_zh_hans TEXT NOT NULL,
  user_zh_hans TEXT NOT NULL,
  user_pt TEXT NOT NULL,
  feedback_json TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paragraph_practices_saved_at
ON paragraph_practices(saved_at DESC);
