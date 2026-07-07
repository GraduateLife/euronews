/**
 * Euronews Português fetcher — orchestration.
 *
 * Once a day we load the list of current articles (RSS first, homepage
 * scraping as fallback — see loadFeedItems), pick a handful we have not
 * stored yet, and fetch each article page to extract its paragraphs.
 * The fetch is deliberately polite: a couple of list requests plus a few
 * article pages, requested sequentially with a delay and an identifying
 * User-Agent.
 *
 * Module map:
 *   feed.ts        — article-list sources (RSS / discovery / homepage links)
 *   articlePage.ts — single-page parsing (paragraphs, title/dek, date)
 *   this file      — selection policy and the fetch loop
 */

import { politeFetch } from "../../lib/politeFetch";
import {
  MIN_PARAGRAPHS,
  dateFromUrl,
  extractParagraphs,
  extractTitleAndDek,
} from "./articlePage";
import { discoverFeedUrl, itemsFromHomepage, parseRssItems } from "./feed";
import type { FeedItem } from "./feed";

export type { FeedItem } from "./feed";
export {
  dateFromUrl,
  estimateMinutes,
  extractParagraphs,
  extractTitleAndDek,
} from "./articlePage";
export { discoverFeedUrl, itemsFromHomepage, parseRssItems } from "./feed";

export type FetchedArticle = {
  id: string;
  title: string;
  dek: string;
  sourceUrl: string;
  publishedAt: string;
  paragraphsPt: string[];
};

const HOME_URL = "https://pt.euronews.com/";
const FEED_CANDIDATES = ["https://pt.euronews.com/rss", "https://pt.euronews.com/rss?format=rss"];
const ARTICLE_DELAY_MS = 800;
// 5 articles x 8 paragraphs = 40 AI translation calls + ~6 page fetches,
// which stays under the 50-subrequests-per-request limit of the Workers
// free plan with headroom.
const MAX_PARAGRAPHS = 8;

export async function fetchDailyEuronewsArticles(options: {
  count: number;
  isAlreadyStored: (id: string) => boolean;
}): Promise<FetchedArticle[]> {
  const loaded = await loadFeedItems();

  // Proper written articles make better study material than video captions;
  // only fall back to the full list if excluding videos starves the pool.
  const written = loaded.filter((item) => !/\/video\//.test(item.link));
  const items = written.length >= options.count ? written : loaded;

  const fresh = items.filter((item) => !options.isAlreadyStored(articleIdFromUrl(item.link)));
  const pool = fresh.length >= options.count ? fresh : items;
  const picked = pickRandom(pool, options.count);

  const articles: FetchedArticle[] = [];
  for (const item of picked) {
    await sleep(ARTICLE_DELAY_MS);
    try {
      const pageResponse = await politeFetch(item.link);
      if (!pageResponse.ok) {
        console.log(JSON.stringify({ job: "euronews-fetch", skipped: item.link, status: pageResponse.status }));
        continue;
      }
      const html = await pageResponse.text();
      const paragraphs = extractParagraphs(html);
      if (paragraphs.length < MIN_PARAGRAPHS) {
        console.log(
          JSON.stringify({ job: "euronews-fetch", skipped: item.link, reason: "too-few-paragraphs", found: paragraphs.length })
        );
        continue;
      }

      // Homepage-scraped items arrive without title/dek; fill them from the page.
      const meta = extractTitleAndDek(html);
      articles.push({
        id: articleIdFromUrl(item.link),
        title: item.title || meta.title || item.link,
        dek: item.description || meta.dek,
        sourceUrl: item.link,
        publishedAt: item.pubDate ? toIso(item.pubDate) : dateFromUrl(item.link),
        paragraphsPt: paragraphs.slice(0, MAX_PARAGRAPHS),
      });
    } catch (error) {
      console.log(JSON.stringify({ job: "euronews-fetch", skipped: item.link, error: String(error) }));
    }
  }

  return articles;
}

/**
 * Load the day's candidate articles, most robust source first:
 * 1. known RSS urls; 2. a feed advertised by the homepage <link> tag;
 * 3. article links scraped straight from the homepage HTML.
 */
async function loadFeedItems(): Promise<FeedItem[]> {
  const problems: string[] = [];

  for (const url of FEED_CANDIDATES) {
    try {
      const response = await politeFetch(url);
      if (!response.ok) {
        problems.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      const items = parseRssItems(await response.text());
      if (items.length) return items;
      problems.push(`${url}: feed parsed but 0 items`);
    } catch (error) {
      problems.push(String(error));
    }
  }

  try {
    const response = await politeFetch(HOME_URL);
    if (!response.ok) {
      problems.push(`${HOME_URL}: HTTP ${response.status}`);
    } else {
      const html = await response.text();

      const advertised = discoverFeedUrl(html, HOME_URL);
      if (advertised) {
        try {
          const feedResponse = await politeFetch(advertised);
          if (feedResponse.ok) {
            const items = parseRssItems(await feedResponse.text());
            if (items.length) return items;
          }
          problems.push(`${advertised}: advertised feed unusable`);
        } catch (error) {
          problems.push(String(error));
        }
      }

      const scraped = itemsFromHomepage(html, HOME_URL);
      if (scraped.length) return scraped;
      problems.push("homepage reachable but no dated article links found (layout may have changed)");
    }
  } catch (error) {
    problems.push(String(error));
  }

  throw new Error(`could not load an article list from euronews — ${problems.join(" | ")}`);
}

/** A stable id derived from the article URL slug. */
export function articleIdFromUrl(url: string) {
  const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  return (
    path
      .split("/")
      .filter(Boolean)
      .join("-")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || `article-${hashCode(url)}`
  );
}

function toIso(pubDate: string) {
  const date = new Date(pubDate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashCode(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
