import type { ArticleDetail } from "@euronews/shared";
import { translatePtToZh } from "../ai/languageAi";
import { saveParagraphTranslation } from "./articleRepository";
import type { Env } from "../env";

/**
 * Translate any untranslated paragraphs the first time an article is opened
 * (the manual refresh stores articles untranslated; only the nightly cron
 * translates upfront) and persist the result so later reads come straight
 * from D1.
 */
export async function ensureTranslations(env: Env, article: ArticleDetail): Promise<ArticleDetail> {
  if (!env.AI) return article;
  const missing = article.paragraphs.filter((paragraph) => !paragraph.zhHans);
  if (missing.length === 0) return article;

  const translations = await Promise.all(missing.map((paragraph) => translatePtToZh(env, paragraph.pt)));
  const translatedById = new Map<string, string>();
  await Promise.all(
    missing.map((paragraph, i) => {
      if (!translations[i]) return Promise.resolve();
      translatedById.set(paragraph.id, translations[i]);
      return saveParagraphTranslation(env.DB, paragraph.id, translations[i]);
    })
  );
  if (translatedById.size === 0) return article;

  return {
    ...article,
    paragraphs: article.paragraphs.map((paragraph) =>
      translatedById.has(paragraph.id) ? { ...paragraph, zhHans: translatedById.get(paragraph.id)! } : paragraph
    ),
  };
}
