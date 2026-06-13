import { useQuery } from "@tanstack/react-query";
import { lookupWord } from "../services/api";

export function WordDrawer({ word, onClose }: { word: string; onClose: () => void }) {
  const lookup = useQuery({
    queryKey: ["word", word],
    queryFn: () => lookupWord(word),
  });

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer word-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-grip" />
        <header className="drawer-header">
          <span>{word}</span>
          <button onClick={onClose} aria-label="Close">x</button>
        </header>

        {lookup.data ? (
          <>
            <img className="word-image" src={lookup.data.image.url} alt={lookup.data.image.alt} />
            <p className="example">{lookup.data.examplePt}</p>
            <label>
              significado
              <input placeholder="Escreve em chines ou com as tuas palavras" />
            </label>
            <label>
              tags
              <input placeholder="cidade, politica, verbo irregular..." />
            </label>
            <a className="external-link" href={lookup.data.priberamUrl} target="_blank" rel="noreferrer">
              abrir no Priberam
            </a>
          </>
        ) : (
          <p className="muted">A procurar uma imagem e um exemplo curto.</p>
        )}
      </aside>
    </div>
  );
}
