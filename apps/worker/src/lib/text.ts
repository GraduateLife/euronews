/** Small text utilities shared by the fetchers. Pure functions, no runtime deps. */

export function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ");
}

/** First sentence (capped at 200 chars) — used to keep deks to one line. */
export function firstSentence(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const match = clean.match(/^.{0,200}?[.!?](?=\s|$)/);
  return (match ? match[0] : clean.slice(0, 200)).trim();
}

/** Decode numeric entities plus the named ones that appear in Portuguese feeds. */
export function decodeEntities(text: string) {
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
