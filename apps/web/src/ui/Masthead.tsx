const DATE_FORMAT = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function todayLine() {
  // "quarta-feira, 25 de junho de 2026" -> upper case for the dateline strap.
  return DATE_FORMAT.format(new Date()).toUpperCase();
}

export function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead__topline">
        <span>Lisboa &middot; Edição Diária</span>
        <span>Laboratório de Leitura</span>
        <span>Ano I &middot; Nº 1</span>
      </div>

      <h1 className="nameplate">
        Euronews
        <span className="nameplate__sub">Português Europeu &middot; Notícias para Ler Devagar</span>
      </h1>

      <div className="masthead__dateline">
        <b>{todayLine()}</b>
        <span className="masthead__dot">&bull;</span>
        <span>Preço: a tua atenção</span>
        <span className="masthead__dot">&bull;</span>
        <span>Três textos por dia</span>
      </div>
    </header>
  );
}
