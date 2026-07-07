/**
 * Euronews Português fetcher.
 *
 * Once a day we read the public RSS feed, pick a handful of articles we have
 * not stored yet, and fetch each article page to extract its paragraphs.
 * The fetch is deliberately polite: one RSS request plus a few article pages,
 * requested sequentially with a delay and an identifying User-Agent.
 *
 * Parsing is done with pure string functions (no DOM), so the extraction
 * logic can be unit-tested outside the Workers runtime.
 */

export type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

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
const USER_AGENT = "euronews-pt-reading-lab/0.1 (personal language-learning project; one fetch per day)";
// Some CDNs reject unknown agents outright; we retry once with a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const ARTICLE_DELAY_MS = 800;
const MIN_PARAGRAPHS = 3;
// 5 articles x 8 paragraphs = 40 AI translation calls + ~6 page fetches,
// which stays under the 50-subrequests-per-request limit of the Workers
// free plan with headroom.
const MAX_PARAGRAPHS = 8;

/**
 * Fetch with the honest User-Agent first; if the server rejects it with a
 * 4xx (bot filtering), retry once as a regular browser. Network-level
 * failures are wrapped with the URL so the /refresh error is diagnosable.
 */
async function politeFetch(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
    });
  } catch (error) {
    throw new Error(`network error fetching ${url}: ${String(error)} (is this machine able to reach euronews?)`);
  }
  if (response.ok || response.status < 400 || response.status >= 500) return response;

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
      },
    });
  } catch (error) {
    throw new Error(`network error fetching ${url}: ${String(error)}`);
  }
}

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

/** The RSS/Atom url advertised by a <link rel="alternate"> tag, if any. */
export function discoverFeedUrl(html: string, baseUrl: string): string {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    if (!/rel=["']alternate["']/i.test(tag)) continue;
    if (!/type=["']application\/(rss|atom)\+xml["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) return new URL(href, baseUrl).toString();
  }
  return "";
}

/**
 * Scrape dated article links (euronews urls carry /YYYY/MM/DD/) from the
 * homepage. Titles are left blank and filled from each article page later.
 */
export function itemsFromHomepage(html: string, baseUrl: string): FeedItem[] {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  const hrefs = html.match(/href=["'][^"']*\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+["']/gi) ?? [];
  for (const raw of hrefs) {
    const href = raw.replace(/^href=["']/i, "").replace(/["']$/, "");
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https:\/\/pt\.euronews\.com\//.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ title: "", link: url, description: "", pubDate: "" });
  }
  return items;
}

/** Title/dek pulled from an article page (JSON-LD headline, else og: tags). */
export function extractTitleAndDek(html: string): { title: string; dek: string } {
  let title = "";
  const scripts = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim());
      for (const node of flattenJsonLd(parsed)) {
        const headline = (node as { headline?: unknown }).headline;
        if (typeof headline === "string" && headline.trim()) {
          title = decodeEntities(headline.trim());
          break;
        }
      }
    } catch {
      /* try next script */
    }
    if (title) break;
  }
  if (!title) {
    const og = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? "";
    title = decodeEntities(og).replace(/\s*[|·-]\s*Euronews.*$/i, "").trim();
  }

  const ogDek =
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    "";
  return { title, dek: firstSentence(decodeEntities(ogDek)) };
}

/** Publication date recovered from the /YYYY/MM/DD/ segment of the url. */
export function dateFromUrl(url: string): string {
  const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (!match) return new Date().toISOString();
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T08:00:00Z`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
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

export function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  for (const block of itemBlocks) {
    const title = decodeEntities(tagContent(block, "title"));
    const link = tagContent(block, "link");
    const description = firstSentence(decodeEntities(stripHtml(tagContent(block, "description"))));
    const pubDate = tagContent(block, "pubDate");
    if (title && /^https?:\/\//.test(link)) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

/**
 * Extract body paragraphs from an article page. Euronews embeds a NewsArticle
 * JSON-LD block whose articleBody is the cleanest source; when it is missing
 * we fall back to harvesting <p> tags and filtering boilerplate.
 */
export function extractParagraphs(html: string): string[] {
  const fromJsonLd = paragraphsFromJsonLd(html);
  if (fromJsonLd.length >= MIN_PARAGRAPHS) return fromJsonLd;

  const fromTags = paragraphsFromPTags(html);
  return fromTags.length >= fromJsonLd.length ? fromTags : fromJsonLd;
}

function paragraphsFromJsonLd(html: string): string[] {
  const scripts = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  for (const script of scripts) {
    const jsonText = script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      continue;
    }
    for (const node of flattenJsonLd(parsed)) {
      const body = (node as { articleBody?: unknown }).articleBody;
      if (typeof body === "string" && body.trim().length > 100) {
        return splitBody(decodeEntities(body));
      }
    }
  }
  return [];
}

function flattenJsonLd(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenJsonLd);
  if (parsed && typeof parsed === "object") {
    const graph = (parsed as { "@graph"?: unknown })["@graph"];
    return graph ? [parsed, ...flattenJsonLd(graph)] : [parsed];
  }
  return [];
}

function splitBody(body: string): string[] {
  const rough = body
    .split(/\n{2,}|\n/)
    .map((piece) => piece.replace(/\s+/g, " ").trim())
    .filter((piece) => piece.length > 0);
  const pieces = rough.length > 1 ? rough : sentencesToParagraphs(body);
  return pieces.filter(isBodyParagraph);
}

/** JSON-LD sometimes flattens the body to one line; regroup ~3 sentences per paragraph. */
function sentencesToParagraphs(body: string): string[] {
  const sentences = body.replace(/\s+/g, " ").trim().split(/(?<=[.!?»”])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ«“0-9])/);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" ").trim());
  }
  return paragraphs;
}

function paragraphsFromPTags(html: string): string[] {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<(aside|figure|figcaption|nav|footer|header)[\s\S]*?<\/\1>/g, "");
  const matches = withoutNoise.match(/<p[^>]*>[\s\S]*?<\/p>/g) ?? [];
  return matches
    .map((tag) => decodeEntities(stripHtml(tag)).replace(/\s+/g, " ").trim())
    .filter(isBodyParagraph);
}

const BOILERPLATE = /^(publicidade|partilhar?|comentários|leia (também|mais)|veja (também|mais)|relacionad|copyright|©|siga[- ]nos|subscreva|newsletter|mais notícias)/i;

function isBodyParagraph(text: string) {
  if (text.length < 60) return false;
  if (BOILERPLATE.test(text)) return false;
  const letters = text.replace(/[^\p{L}]/gu, "").length;
  return letters / text.length > 0.6;
}

export function estimateMinutes(paragraphs: string[]) {
  const words = paragraphs.join(" ").split(/\s+/).length;
  return Math.max(2, Math.round(words / 180));
}

function tagContent(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ");
}

function firstSentence(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const match = clean.match(/^.{0,200}?[.!?](?=\s|$)/);
  return (match ? match[0] : clean.slice(0, 200)).trim();
}

function decodeEntities(text: string) {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&laquo;": "«",
    "&raquo;": "»",
    "&hellip;": "…",
    "&ndash;": "–",
    "&mdash;": "—",
    // Accented letters common in Portuguese feeds.
    "&aacute;": "á",
    "&agrave;": "à",
    "&acirc;": "â",
    "&atilde;": "ã",
    "&ccedil;": "ç",
    "&eacute;": "é",
    "&ecirc;": "ê",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&ocirc;": "ô",
    "&otilde;": "õ",
    "&uacute;": "ú",
    "&uuml;": "ü",
  };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-z]+;/gi, (entity) => {
      const lower = entity.toLowerCase();
      const isUpper = entity[1] === entity[1].toUpperCase();
      const decoded = named[lower];
      if (!decoded) return entity;
      return isUpper ? decoded.toUpperCase() : decoded;
    });
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
