import type { ArticleDetail, Paragraph } from "@euronews/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { completeArticle } from "../services/api";
import { StudyDrawer } from "../ui/StudyDrawer";

type ActiveSelection = { paragraphId: string; text: string } | null;

export function ArticleReader({ article }: { article: ArticleDetail }) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSelection>(null);
  const [showAllTranslation, setShowAllTranslation] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const complete = useMutation({
    mutationFn: () => completeArticle(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  // Any selection — a single word or a longer expression — opens the same
  // study drawer. Double-click hands us a word; a drag hands us a phrase.
  function study(paragraph: Paragraph, allowFallback: boolean) {
    const raw = window.getSelection()?.toString() ?? "";
    const resolved = resolveTerm(raw, paragraph.pt);
    const text = resolved || (allowFallback ? firstWordFromParagraph(paragraph.pt) : "");
    if (!text) return;
    setActive({ paragraphId: paragraph.id, text });
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

      <article className={showAllTranslation ? "paragraph-stack" : "paragraph-stack paragraph-stack--columns"}>
        {article.paragraphs.map((paragraph, index) => {
          const showZh = showAllTranslation || revealed.has(paragraph.id);
          return (
            <Fragment key={paragraph.id}>
              <section className="paragraph-pair">
                <p
                  lang="pt-PT"
                  className="pt-text selectable-text"
                  onDoubleClick={() => study(paragraph, true)}
                  onPointerUp={() => study(paragraph, false)}
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

function firstWordFromParagraph(text: string) {
  return (
    text
      .split(/\s+/)
      .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""))
      .find((word) => word.length > 5) ?? ""
  );
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
