import type { ArticleDetail, Paragraph } from "@euronews/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { completeArticle } from "../services/api";
import { StudyDrawer } from "../ui/StudyDrawer";

type ActiveSelection = { paragraphId: string; text: string } | null;

type PressState = {
  paragraphId: string;
  term: string;
  left: number;
  top: number;
  width: number;
} | null;

/** How long a word must be held before it opens the study drawer. Keep in
 *  sync with the .press-ink animation duration in styles.css. */
const PRESS_MS = 550;
const PRESS_CANCEL_DISTANCE = 8;

export function ArticleReader({ article }: { article: ArticleDetail }) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSelection>(null);
  const [press, setPress] = useState<PressState>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const [showAllTranslation, setShowAllTranslation] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const complete = useMutation({
    mutationFn: () => completeArticle(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  // Studying a word is a deliberate act: hold the word for PRESS_MS while an
  // ink underline draws itself beneath it, then the drawer opens. Releasing
  // or moving early cancels — a plain click no longer opens anything.
  // Dragging a selection still studies the whole expression on release.
  function clearPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
    setPress(null);
  }

  function onPressStart(event: ReactPointerEvent<HTMLParagraphElement>, paragraph: Paragraph) {
    if (event.button !== 0) return;
    const found = wordRangeAtPoint(event.clientX, event.clientY);
    if (!found || !isStudyable(found.term)) return;

    pressOrigin.current = { x: event.clientX, y: event.clientY };
    setPress({ paragraphId: paragraph.id, term: found.term, ...found.rect });
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      // On touch devices the OS long-press may have selected text natively;
      // defer to that selection (it is handled on pointer-up).
      const native = window.getSelection();
      if (native && !native.isCollapsed) {
        clearPress();
        return;
      }
      setActive({ paragraphId: paragraph.id, text: found.term });
      clearPress();
    }, PRESS_MS);
  }

  function onPressMove(event: ReactPointerEvent<HTMLParagraphElement>) {
    if (!pressOrigin.current) return;
    const dx = event.clientX - pressOrigin.current.x;
    const dy = event.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > PRESS_CANCEL_DISTANCE) clearPress();
  }

  function onPressEnd(paragraph: Paragraph) {
    clearPress();
    const dragged = (window.getSelection()?.toString() ?? "").trim();
    if (!dragged) return;
    const term = resolveTerm(dragged, paragraph.pt);
    if (!isStudyable(term)) return;
    setActive({ paragraphId: paragraph.id, text: term.trim() });
  }

  function toggleReveal(paragraphId: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(paragraphId)) next.delete(paragraphId);
      else next.add(paragraphId);
      return next;
    });
  }

  const pullQuoteAfter = article.paragraphs.length >= 4 ? Math.floor((article.paragraphs.length - 1) / 2) : -1;
  const pullQuote = pullQuoteAfter >= 0 ? derivePullQuote(article.paragraphs, pullQuoteAfter) : null;

  return (
    <section className="reader-screen">
      <header className="reader-header">
        <h1>{article.title}</h1>
        <p>{article.dek}</p>
      </header>

      <div className="reader-byline">
        <span>
          {formatPublished(article.publishedAt)} &middot; {article.estimatedMinutes} min de leitura
        </span>
        <button
          type="button"
          className="translation-toggle"
          aria-pressed={showAllTranslation}
          onClick={() => setShowAllTranslation((value) => !value)}
        >
          {showAllTranslation ? "Ocultar tradução" : "Mostrar tradução"}
        </button>
      </div>

      {/* Columns always — a broadsheet never abandons its layout because of
          the content; the translation flows inside its paragraph block. */}
      <article className="paragraph-stack paragraph-stack--columns">
        {article.paragraphs.map((paragraph, index) => {
          const showZh = showAllTranslation || revealed.has(paragraph.id);
          return (
            <Fragment key={paragraph.id}>
              <section className="paragraph-pair">
                <span className="para-num" aria-hidden="true">
                  {index + 1}
                </span>
                <p
                  lang="pt-PT"
                  className="pt-text selectable-text"
                  onPointerDown={(event) => onPressStart(event, paragraph)}
                  onPointerMove={onPressMove}
                  onPointerUp={() => onPressEnd(paragraph)}
                  onPointerLeave={clearPress}
                  onPointerCancel={clearPress}
                >
                  {renderParagraphContent(paragraph, active, index === 0)}
                </p>
                {showZh ? (
                  <p lang="zh-Hans" className="zh-text">
                    {paragraph.zhHans}
                  </p>
                ) : null}
                {!showAllTranslation ? (
                  <button
                    type="button"
                    className="reveal-zh"
                    aria-pressed={revealed.has(paragraph.id)}
                    onClick={() => toggleReveal(paragraph.id)}
                  >
                    {revealed.has(paragraph.id) ? "ocultar tradução" : "tradução"}
                  </button>
                ) : null}
              </section>
              {index === pullQuoteAfter && pullQuote ? (
                <aside className="pull-quote">{pullQuote}</aside>
              ) : null}
            </Fragment>
          );
        })}
      </article>

      <footer className="reader-complete">
        <button onClick={() => complete.mutate()} disabled={complete.isPending}>
          {complete.isSuccess ? "texto completo" : "marcar como lido"}
        </button>
      </footer>

      {press ? (
        <span
          className="press-ink"
          aria-hidden="true"
          style={{ left: press.left, top: press.top, width: press.width }}
        />
      ) : null}

      {active ? <StudyDrawer term={active.text} onClose={() => setActive(null)} /> : null}
    </section>
  );
}

const PUBLISHED_FORMAT = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatPublished(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Edição do dia";
  return PUBLISHED_FORMAT.format(date).toUpperCase();
}

// A term is worth studying only if it carries at least two letters, so bare
// articles and punctuation like "a", "o" or "—" never open the drawer.
function isStudyable(term: string) {
  return term.replace(/[^\p{L}]/gu, "").length >= 2;
}

/**
 * The word under a screen point plus the rectangle to draw the press
 * underline in, read straight from the text node at the caret (the floated
 * drop cap is its own node, so it can never leak into the result).
 *
 * Internal hyphens are part of the word — European Portuguese compounds like
 * "lê-se" or "Estados-membros" must be looked up whole. Only true hyphens in
 * the text count: the hyphens `hyphens: auto` renders at line breaks are a
 * paint-time effect and never exist in the DOM text this reads from.
 */
function wordRangeAtPoint(
  x: number,
  y: number
): { term: string; rect: { left: number; top: number; width: number } } | null {
  const caret = caretFromPoint(x, y);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;

  const text = caret.node.textContent ?? "";
  const isWordChar = (char: string | undefined) => !!char && /[\p{L}\p{M}-]/u.test(char);
  let start = caret.offset;
  let end = caret.offset;
  while (start > 0 && isWordChar(text[start - 1])) start--;
  while (end < text.length && isWordChar(text[end])) end++;
  // A word never starts or ends with a hyphen (e.g. dashes used as bullets).
  while (start < end && text[start] === "-") start++;
  while (end > start && text[end - 1] === "-") end--;
  if (start >= end) return null;

  const range = document.createRange();
  range.setStart(caret.node, start);
  range.setEnd(caret.node, end);
  const box = range.getClientRects()[0] ?? range.getBoundingClientRect();

  return {
    term: text.slice(start, end),
    rect: { left: box.left, top: box.bottom + 2, width: box.width },
  };
}

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  return null;
}

/**
 * Turn a raw selection string into a term that is guaranteed to be a substring
 * of the paragraph. The browser can drop inter-node whitespace when a selection
 * touches the floated drop cap (e.g. "A Comissão" comes back as "AComissão"),
 * so when the cleaned string is not found verbatim we locate it ignoring spaces
 * and slice it back out of the source with the original spacing.
 */
function resolveTerm(raw: string, source: string) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (source.includes(cleaned)) return cleaned;

  const needle = cleaned.replace(/\s+/g, "");
  if (!needle) return "";

  const map: number[] = [];
  let compact = "";
  for (let i = 0; i < source.length; i++) {
    if (!/\s/.test(source[i])) {
      compact += source[i];
      map.push(i);
    }
  }

  const at = compact.indexOf(needle);
  if (at < 0) return cleaned;

  const start = map[at];
  const end = map[at + needle.length - 1] + 1;
  return source.slice(start, end).trim();
}

// Pull the quote only from text at or above the insertion point so it echoes
// something already read, rather than duplicating the paragraph right below it.
function derivePullQuote(paragraphs: Paragraph[], throughIndex: number) {
  const candidates: string[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex > throughIndex) return;
    paragraph.pt.split(/(?<=[.!?])\s+/).forEach((sentence, sentenceIndex) => {
      // Skip the opening line — it carries the drop cap and reads oddly pulled out.
      if (paragraphIndex === 0 && sentenceIndex === 0) return;
      const text = sentence.trim();
      if (text.length >= 45 && text.length <= 130) candidates.push(text);
    });
  });
  if (!candidates.length) return null;
  return candidates[Math.floor(candidates.length / 2)];
}

function renderParagraphContent(paragraph: Paragraph, active: ActiveSelection, isLead: boolean) {
  const highlight = active && active.paragraphId === paragraph.id ? active.text : null;

  if (!isLead) return withHighlight(paragraph.pt, highlight);

  // Render the opening letter as a real (selectable) drop-cap span, and apply
  // any highlight to the remainder so both features coexist.
  const first = paragraph.pt.slice(0, 1);
  const rest = paragraph.pt.slice(1);
  const restHighlight = highlight && paragraph.pt.indexOf(highlight) >= 1 ? highlight : null;
  return (
    <>
      <span className="dropcap">{first}</span>
      {withHighlight(rest, restHighlight)}
    </>
  );
}

function withHighlight(text: string, highlight: string | null) {
  if (!highlight) return text;
  const start = text.indexOf(highlight);
  if (start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark>{highlight}</mark>
      {text.slice(start + highlight.length)}
    </>
  );
}
