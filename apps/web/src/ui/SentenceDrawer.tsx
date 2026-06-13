import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createSentencePractice } from "../services/api";

export function SentenceDrawer({ sentence, onClose }: { sentence: string; onClose: () => void }) {
  const [zh, setZh] = useState("");
  const [pt, setPt] = useState("");
  const [faded, setFaded] = useState(false);
  const practice = useQuery({
    queryKey: ["sentence-practice", sentence],
    queryFn: () => createSentencePractice(sentence),
  });

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer sentence-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-grip" />
        <header className="drawer-header">
          <span>Treino de frase</span>
          <button onClick={onClose} aria-label="Close">x</button>
        </header>

        <p className="source-sentence">{sentence}</p>

        {practice.data ? (
          <div className="practice-flow">
            <p className={faded ? "generated faded" : "generated"}>{practice.data.generatedPt}</p>
            <label>
              traducao em chines
              <textarea value={zh} onChange={(event) => setZh(event.target.value)} />
            </label>
            <button onClick={() => setFaded(true)}>ocultar devagar</button>
            <label>
              volta para portugues
              <textarea value={pt} onChange={(event) => setPt(event.target.value)} />
            </label>
            <button className="primary-action">comparar</button>
          </div>
        ) : (
          <p className="muted">A construir uma frase com a mesma estrutura.</p>
        )}
      </aside>
    </div>
  );
}
