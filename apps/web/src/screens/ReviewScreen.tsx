import { useQuery } from "@tanstack/react-query";
import { getReview } from "../services/api";

export function ReviewScreen() {
  const review = useQuery({ queryKey: ["review"], queryFn: getReview });
  const store = review.data ?? {
    completedArticleIds: [],
    wordNotes: [],
    paragraphPractices: [],
  };

  return (
    <section className="screen">
      <header className="page-header">
        <p className="eyebrow">Revisao</p>
        <h1>Voltar ao que ficou</h1>
        <p className="muted">
          {store.completedArticleIds.length} textos completos, {store.wordNotes.length} palavras,{" "}
          {store.paragraphPractices.length} parágrafos.
        </p>
      </header>

      <div className="review-actions">
        <button>Passar outra vez</button>
        <button>Revisao profunda</button>
      </div>

      <section className="review-section">
        <h2 className="section-flag">Caderno de Palavras</h2>
        {store.wordNotes.length ? (
          store.wordNotes.map((note) => (
            <article className="review-card" key={note.id}>
              <img src={note.imageUrl} alt={note.word} />
              <div>
                <strong>{note.word}</strong>
                <p>{note.meaning || "sem significado ainda"}</p>
                <small>{note.tags.join(", ") || note.examplePt}</small>
                <a href={note.priberamUrl} target="_blank" rel="noreferrer">
                  Priberam
                </a>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">Da um duplo toque numa palavra do texto para ela aparecer aqui.</p>
        )}
      </section>

      <section className="review-section">
        <h2 className="section-flag">Treinos de Parágrafo</h2>
        {store.paragraphPractices.length ? (
          store.paragraphPractices.map((practice) => (
            <article className="review-card text-only" key={practice.id}>
              <strong>{practice.generatedParagraphPt}</strong>
              <p>{practice.userPt || "sem resposta em portugues"}</p>
              <small>{practice.feedback.summary}</small>
            </article>
          ))
        ) : (
          <p className="muted">Seleciona parte de uma frase no leitor para treinar o paragrafo.</p>
        )}
      </section>
    </section>
  );
}
