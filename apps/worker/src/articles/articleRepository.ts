import type { ArticleDetail, ArticleSummary, Paragraph } from "@euronews/shared";

type ArticleRow = {
  id: string;
  title: string;
  dek: string;
  source_url: string;
  published_at: string;
  estimated_minutes: number;
  edition_date: string;
};

type ParagraphRow = {
  id: string;
  article_id: string;
  idx: number;
  pt: string;
  zh_hans: string;
};

export type StorableArticle = ArticleSummary & {
  editionDate: string;
  paragraphs: Array<{ pt: string; zhHans: string }>;
};

export async function storeArticles(db: D1Database, articles: StorableArticle[]) {
  for (const article of articles) {
    await db
      .prepare(
        `INSERT INTO articles (id, title, dek, source_url, published_at, estimated_minutes, edition_date, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET edition_date = excluded.edition_date`
      )
      .bind(
        article.id,
        article.title,
        article.dek,
        article.sourceUrl,
        article.publishedAt,
        article.estimatedMinutes,
        article.editionDate,
        new Date().toISOString()
      )
      .run();

    await db.prepare("DELETE FROM article_paragraphs WHERE article_id = ?").bind(article.id).run();
    for (let index = 0; index < article.paragraphs.length; index++) {
      const paragraph = article.paragraphs[index];
      await db
        .prepare(
          `INSERT INTO article_paragraphs (id, article_id, idx, pt, zh_hans)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(`${article.id}-p${index + 1}`, article.id, index, paragraph.pt, paragraph.zhHans)
        .run();
    }
  }
}

export async function listStoredArticleIds(db: D1Database): Promise<Set<string>> {
  const rows = await db.prepare("SELECT id FROM articles").all<{ id: string }>();
  return new Set(rows.results.map((row) => row.id));
}

/** The most recent edition's articles, newest edition wins. */
export async function getLatestEdition(db: D1Database): Promise<ArticleSummary[]> {
  const latest = await db
    .prepare("SELECT edition_date FROM articles ORDER BY edition_date DESC LIMIT 1")
    .first<{ edition_date: string }>();
  if (!latest) return [];

  const rows = await db
    .prepare("SELECT * FROM articles WHERE edition_date = ? ORDER BY published_at DESC")
    .bind(latest.edition_date)
    .all<ArticleRow>();
  return rows.results.map(mapSummary);
}

export async function getStoredArticle(db: D1Database, articleId: string): Promise<ArticleDetail | null> {
  const row = await db.prepare("SELECT * FROM articles WHERE id = ?").bind(articleId).first<ArticleRow>();
  if (!row) return null;

  const paragraphRows = await db
    .prepare("SELECT * FROM article_paragraphs WHERE article_id = ? ORDER BY idx ASC")
    .bind(articleId)
    .all<ParagraphRow>();

  return {
    ...mapSummary(row),
    paragraphs: paragraphRows.results.map(mapParagraph),
  };
}

function mapSummary(row: ArticleRow): ArticleSummary {
  return {
    id: row.id,
    title: row.title,
    dek: row.dek,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    estimatedMinutes: row.estimated_minutes,
    completed: false,
  };
}

function mapParagraph(row: ParagraphRow): Paragraph {
  return {
    id: row.id,
    articleId: row.article_id,
    index: row.idx,
    pt: row.pt,
    zhHans: row.zh_hans,
  };
}
