export function ReviewScreen() {
  return (
    <section className="screen">
      <header className="page-header">
        <p className="eyebrow">Revisao</p>
        <h1>Voltar ao que ficou</h1>
        <p className="muted">Quando os 3 textos do dia terminarem, esta pagina vira o caderno de revisao.</p>
      </header>

      <div className="review-actions">
        <button>Passar outra vez</button>
        <button>Revisao profunda</button>
      </div>
    </section>
  );
}
