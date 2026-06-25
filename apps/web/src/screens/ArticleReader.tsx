import type { ArticleDetail, Paragraph } from "@euronews/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { completeArticle } from "../services/api";
import { StudyDrawer } from "../ui/StudyDrawer";

type ActiveSelection = { paragraphId: string; text: string } | null;

export function ArticleReader({ article }: { article: ArticleDetail }) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSelection>(null);
  const [showTranslation, setShowTranslation] = useState(false);
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
    const selected = cleanSelection(window.getSelection()?.toString() ?? "");
    const text = selected || (allowFallback ? firstWordFromParagraph(paragraph.pt) : "");
    if (!text) return;
    setActive({ paragraphId: paragraph.id, text });
  }

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
          aria-pressed={showTranslation}
          onClick={() => setShowTranslation((value) => !value)}
        >
          {showTranslation ? "Ocultar tradução" : "Mostrar tradução"}
        </button>
      </div>

      <article className="paragraph-stack">
        {article.paragraphs.map((paragraph) => (
          <section className="paragraph-pair" key={paragraph.id}>
            <p
              lang="pt-PT"
              className="pt-text selectable-text"
              onDoubleClick={() => study(paragraph, true)}
              onPointerUp={() => study(paragraph, false)}
            >
              {renderHighlightedText(paragraph, active)}
            </p>
            {showTranslation ? (
              <p lang="zh-Hans" className="zh-text">
                {paragraph.zhHans}
              </p>
            ) : null}
          </section>
        ))}
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

function renderHighlightedText(paragraph: Paragraph, active: ActiveSelection) {
  if (!active || active.paragraphId !== paragraph.id) return paragraph.pt;

  const start = paragraph.pt.indexOf(active.text);
  if (start < 0) return paragraph.pt;

  return (
    <>
      {paragraph.pt.slice(0, start)}
      <mark>{active.text}</mark>
      {paragraph.pt.slice(start + active.text.length)}
    </>
  );
}
