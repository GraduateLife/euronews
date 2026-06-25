import type { ArticleDetail, Paragraph } from "@euronews/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { completeArticle } from "../services/api";
import { ParagraphPracticeDrawer } from "../ui/ParagraphPracticeDrawer";
import { WordDrawer } from "../ui/WordDrawer";

type ActiveSelection =
  | { kind: "word"; paragraphId: string; text: string }
  | {
      kind: "paragraph";
      paragraphId: string;
      paragraphPt: string;
      selectedText: string;
      targetSentence: string;
    }
  | null;

export function ArticleReader({ article }: { article: ArticleDetail }) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSelection>(null);
  const complete = useMutation({
    mutationFn: () => completeArticle(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  function openWord(paragraph: Paragraph) {
    const selected = cleanSelection(window.getSelection()?.toString() ?? "");
    const word = selected && !selected.includes(" ") ? selected : firstWordFromParagraph(paragraph.pt);
    if (!word) return;

    setActive({
      kind: "word",
      paragraphId: paragraph.id,
      text: word,
    });
  }

  function openParagraphPractice(paragraph: Paragraph) {
    const selected = cleanSelection(window.getSelection()?.toString() ?? "");
    if (!selected || !selected.includes(" ")) return;

    setActive({
      kind: "paragraph",
      paragraphId: paragraph.id,
      paragraphPt: paragraph.pt,
      selectedText: selected,
      targetSentence: sentenceContaining(paragraph.pt, selected),
    });
  }

  return (
    <section className="reader-screen">
      <header className="reader-header">
        <a className="source-link" href={article.sourceUrl} target="_blank" rel="noreferrer">
          Euronews PT &middot; Reportagem
        </a>
        <h1>{article.title}</h1>
        <p>{article.dek}</p>
      </header>

      <p className="reader-byline">
        Por <b>Redação Euronews</b> &middot; {formatPublished(article.publishedAt)} &middot; {article.estimatedMinutes} min de
        leitura
      </p>

      <article className="paragraph-stack">
        {article.paragraphs.map((paragraph) => (
          <section className="paragraph-pair" key={paragraph.id}>
            <p
              lang="pt-PT"
              className="pt-text selectable-text"
              onDoubleClick={() => openWord(paragraph)}
              onPointerUp={() => openParagraphPractice(paragraph)}
            >
              {renderHighlightedText(paragraph, active)}
            </p>
            <p lang="zh-Hans" className="zh-text">
              {paragraph.zhHans}
            </p>
          </section>
        ))}
      </article>

      <footer className="reader-complete">
        <button onClick={() => complete.mutate()} disabled={complete.isPending}>
          {complete.isSuccess ? "texto completo" : "marcar como lido"}
        </button>
      </footer>

      {active?.kind === "word" ? (
        <WordDrawer word={active.text} onClose={() => setActive(null)} />
      ) : null}
      {active?.kind === "paragraph" ? (
        <ParagraphPracticeDrawer
          paragraphPt={active.paragraphPt}
          selectedText={active.selectedText}
          targetSentence={active.targetSentence}
          onClose={() => setActive(null)}
        />
      ) : null}
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

function cleanSelection(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function firstWordFromParagraph(text: string) {
  return (
    text
      .split(/\s+/)
      .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""))
      .find((word) => word.length > 5) ?? ""
  );
}

function sentenceContaining(paragraph: string, selectedText: string) {
  const start = paragraph.indexOf(selectedText);
  if (start < 0) return paragraph;

  const before = paragraph.slice(0, start);
  const after = paragraph.slice(start + selectedText.length);
  const sentenceStart = Math.max(before.lastIndexOf("."), before.lastIndexOf("?"), before.lastIndexOf("!")) + 1;
  const sentenceEndCandidates = [after.indexOf("."), after.indexOf("?"), after.indexOf("!")]
    .filter((index) => index >= 0)
    .map((index) => start + selectedText.length + index + 1);
  const sentenceEnd = sentenceEndCandidates.length ? Math.min(...sentenceEndCandidates) : paragraph.length;

  return paragraph.slice(sentenceStart, sentenceEnd).trim();
}

function renderHighlightedText(paragraph: Paragraph, active: ActiveSelection) {
  if (!active || active.paragraphId !== paragraph.id) return paragraph.pt;

  const highlight = active.kind === "word" ? active.text : active.targetSentence;
  const start = paragraph.pt.indexOf(highlight);
  if (start < 0) return paragraph.pt;

  return (
    <>
      {paragraph.pt.slice(0, start)}
      <mark>{highlight}</mark>
      {paragraph.pt.slice(start + highlight.length)}
    </>
  );
}
