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
  definitionPt: string;
  examplePt: string;
  imageQueryEn: string;
};

/**
 * A monolingual (Portuguese-only) dictionary entry for a term, the way an
 * immersion learner wants it: the meaning explained in simple Portuguese, a
 * short example, and an English query for an illustrative photo. Kept
 * deliberately simple so an 8B model stays reliable.
 */
export async function describeWord(env: Env, term: string): Promise<WordInsight | null> {
  if (!env.AI) return null;
  try {
    const result = (await env.AI.run(CHAT_MODEL as never, {
      messages: [
        {
          role: "system",
          content:
            "És um dicionário de português europeu. Explicas a palavra em português simples (nível A2), " +
            "sem usar tradução para outras línguas. Responde APENAS com um objeto JSON, sem markdown, " +
            'com estas chaves exatas: "definicao" (uma definição curta e clara em português simples, no máximo 20 palavras), ' +
            '"exemplo" (uma frase de exemplo natural em português europeu com a palavra, no máximo 20 palavras), ' +
            '"imagem_en" (2 a 3 palavras em inglês que descrevam uma cena concreta e fotografável para a palavra).',
        },
        { role: "user", content: `Palavra: "${term}"` },
      ],
      max_tokens: 200,
    } as never)) as { response?: string };

    const parsed = extractJson(result.response ?? "");
    if (!parsed) return null;
    const definitionPt = str(parsed.definicao);
    if (!definitionPt) return null;
    return {
      definitionPt,
      examplePt: str(parsed.exemplo),
      imageQueryEn: str(parsed.imagem_en),
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
