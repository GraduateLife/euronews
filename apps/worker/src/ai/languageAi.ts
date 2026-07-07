import type { Env } from "../env";

/**
 * Cloudflare Workers AI helpers. Every function degrades gracefully: when the
 * AI binding is missing (local dev without login) or a call fails, callers get
 * an empty result and the app keeps working with fallbacks.
 */

const TRANSLATE_MODEL = "@cf/meta/m2m100-1.2b";
const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Cloudflare's m2m100 wrapper has accepted either full language names or ISO
// codes depending on version, so we try both pairs before giving up.
const LANG_PAIRS = [
  { source_lang: "portuguese", target_lang: "chinese" },
  { source_lang: "pt", target_lang: "zh" },
];

export async function translatePtToZh(env: Env, textPt: string): Promise<string> {
  if (!env.AI) return "";
  let lastError: unknown = null;
  for (const pair of LANG_PAIRS) {
    try {
      const result = (await env.AI.run(TRANSLATE_MODEL as never, {
        text: textPt,
        ...pair,
      } as never)) as { translated_text?: string };
      const translated = result.translated_text?.trim() ?? "";
      if (translated) return translated;
      lastError = `empty translated_text with ${pair.source_lang}->${pair.target_lang}`;
    } catch (error) {
      lastError = error;
    }
  }
  console.log(JSON.stringify({ job: "translate", error: String(lastError) }));
  return "";
}

export type WordInsight = {
  meaningZhHans: string;
  examplePt: string;
  imageQueryEn: string;
};

export async function describeWord(env: Env, term: string): Promise<WordInsight | null> {
  if (!env.AI) return null;
  try {
    const result = (await env.AI.run(CHAT_MODEL as never, {
      messages: [
        {
          role: "system",
          content:
            "You are a European Portuguese reading assistant for Chinese learners. " +
            "The term comes from a Portuguese news article, but news text also contains " +
            "English loanwords, foreign names, and acronyms — identify which case it is. " +
            "Answer ONLY with a JSON object, no markdown, with exactly these keys: " +
            '"meaning_zh" (Simplified Chinese, max 50 chars): for a normal European Portuguese word give a concise definition; ' +
            "if the term is NOT Portuguese, start with a tag like 【英语】/【法语】/【专有名词】 then the meaning; " +
            "if it is an acronym or abbreviation, start with 【缩写】 then the full expansion and its Chinese meaning " +
            '(e.g. for "UE": 【缩写】União Europeia，欧盟). ' +
            '"example_pt" (one natural European Portuguese sentence using the term, max 20 words). ' +
            '"image_query_en" (2-3 English words describing a concrete, photographable scene for the term).',
        },
        { role: "user", content: `Term: "${term}"` },
      ],
      max_tokens: 220,
    } as never)) as { response?: string };

    const parsed = extractJson(result.response ?? "");
    if (!parsed) return null;
    const meaning = str(parsed.meaning_zh);
    if (!meaning) return null;
    return {
      meaningZhHans: meaning,
      examplePt: str(parsed.example_pt),
      imageQueryEn: str(parsed.image_query_en),
    };
  } catch (error) {
    console.log(JSON.stringify({ job: "describe-word", term, error: String(error) }));
    return null;
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
