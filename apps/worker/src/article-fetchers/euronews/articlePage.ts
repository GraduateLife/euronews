/**
 * Single article-page parsing: body paragraphs, title/dek, reading time,
 * and the date encoded in the url. Pure string functions — unit-testable.
 */

import { decodeEntities, firstSentence, stripHtml } from "../../lib/text";

/** An article needs at least this many body paragraphs to be worth studying. */
export const MIN_PARAGRAPHS = 3;

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

/** Title/dek pulled from an article page (JSON-LD headline, else og: tags). */
export function extractTitleAndDek(html: string): { title: string; dek: string } {
  let title = "";
  for (const node of jsonLdNodes(html)) {
    const headline = (node as { headline?: unknown }).headline;
    if (typeof headline === "string" && headline.trim()) {
      title = decodeEntities(headline.trim());
      break;
    }
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

export function estimateMinutes(paragraphs: string[]) {
  const words = paragraphs.join(" ").split(/\s+/).length;
  return Math.max(2, Math.round(words / 180));
}

// ---------------------------------------------------------------------------
// internals

function paragraphsFromJsonLd(html: string): string[] {
  for (const node of jsonLdNodes(html)) {
    const body = (node as { articleBody?: unknown }).articleBody;
    if (typeof body === "string" && body.trim().length > 100) {
      return splitBody(decodeEntities(body));
    }
  }
  return [];
}

function* jsonLdNodes(html: string): Generator<unknown> {
  const scripts = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  for (const script of scripts) {
    const jsonText = script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      continue;
    }
    yield* flattenJsonLd(parsed);
  }
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

const BOILERPLATE =
  /^(publicidade|partilhar?|comentários|leia (também|mais)|veja (também|mais)|relacionad|copyright|©|siga[- ]nos|subscreva|newsletter|mais notícias)/i;

function isBodyParagraph(text: string) {
  if (text.length < 60) return false;
  if (BOILERPLATE.test(text)) return false;
  const letters = text.replace(/[^\p{L}]/gu, "").length;
  return letters / text.length > 0.6;
}
