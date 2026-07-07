/**
 * Article-list sources: RSS parsing, feed auto-discovery, and the
 * homepage-link fallback. All pure string functions — unit-testable in Node.
 */

import { decodeEntities, firstSentence, stripHtml } from "../../lib/text";

export type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

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

function tagContent(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}
