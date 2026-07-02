import { sampleArticles } from "@euronews/shared";
import type { ArticleDetail } from "@euronews/shared";

export function fetchDailyMockArticles(): ArticleDetail[] {
  return sampleArticles;
}
