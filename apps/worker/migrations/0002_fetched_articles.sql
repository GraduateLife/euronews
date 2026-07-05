CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  dek TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 4,
  edition_date TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_edition_date
ON articles(edition_date DESC);

CREATE TABLE IF NOT EXISTS article_paragraphs (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  pt TEXT NOT NULL,
  zh_hans TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_article_paragraphs_article
ON article_paragraphs(article_id, idx);
