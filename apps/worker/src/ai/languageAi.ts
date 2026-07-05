import type { Env } from "../env";

/**
 * Cloudflare Workers AI helpers. Every function degrades gracefully: when the
 * AI binding is missing (local dev without login) or a call fails, callers get
 * an empty result and the app keeps working with fallbacks.
 */

const TRANSLATE_MODEL = "@cf/meta/m2m100-1.2b";
const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function translatePtToZh(env: Env, textPt: string): Promise<string> {
  if (!env.AI) return "";
  try {
    const result = (await env.AI.run(TRANSLATE_MODEL as never, {
      text: textPt,
      source_lang: "portuguese",
      target_lang: "chinese",
    } as never)) as { translated_text?: string };
    return result.translated_text?.trim() ?? "";
  } catch (error) {
    console.log(JSON.stringify({ job: "translate", error: String(error) }));
    return "";
  }
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
            "You are a European Portuguese dictionary for Chinese learners. " +
            "Answer ONLY with a JSON object, no markdown, with exactly these keys: " +
            '"meaning_zh" (concise Simplified Chinese definition of the term as used in European Portuguese news, max 40 chars), ' +
            '"example_pt" (one natural European Portuguese example sentence using the term, max 20 words), ' +
            '"image_query_en" (2-3 English words that describe a concrete, photographable scene for the term).',
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
