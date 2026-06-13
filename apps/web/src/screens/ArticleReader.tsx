import type { ArticleDetail } from "@euronews/shared";
import { useState } from "react";
import { SentenceDrawer } from "../ui/SentenceDrawer";
import { WordDrawer } from "../ui/WordDrawer";

type SelectionState =
  | { kind: "word"; text: string }
  | { kind: "sentence"; text: string }
  | null;

export function ArticleReader({ article }: { article: ArticleDetail }) {
  const [selection, setSelection] = useState<SelectionState>(null);

  function handlePointerUp() {
    const selected = window.getSelection()?.toString().trim();
    if (!selected) return;
    const normalized = selected.replace(/\s+/g, " ");
    setSelection(normalized.includes(" ") ? { kind: "sentence", text: normalized } : { kind: "word", text: normalized });
  }

  return (
    <section className="reader-screen">
      <header className="reader-header">
        <a className="source-link" href={article.sourceUrl} target="_blank" rel="noreferrer">
          Euronews PT
        </a>
        <h1>{article.title}</h1>
        <p>{article.dek}</p>
      </header>

      <article className="paragraph-stack" onPointerUp={handlePointerUp}>
        {article.paragraphs.map((paragraph) => (
          <section className="paragraph-pair" key={paragraph.id}>
            <p lang="pt-PT" className="pt-text">{paragraph.pt}</p>
            <p lang="zh-Hans" className="zh-text">{paragraph.zhHans}</p>
          </section>
        ))}
      </article>

      {selection?.kind === "word" ? (
        <WordDrawer word={selection.text} onClose={() => setSelection(null)} />
      ) : null}
      {selection?.kind === "sentence" ? (
        <SentenceDrawer sentence={selection.text} onClose={() => setSelection(null)} />
      ) : null}
    </section>
  );
}
