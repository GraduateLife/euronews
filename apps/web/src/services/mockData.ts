import type { ArticleDetail } from "@euronews/shared";

export const mockArticles: ArticleDetail[] = [
  {
    id: "eu-safe-ii",
    title: "Europa prepara novo mecanismo de financiamento da defesa",
    dek: "Um texto curto para praticar leitura politica em portugues europeu.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T07:00:00.000Z",
    estimatedMinutes: 5,
    completed: false,
    paragraphs: [
      {
        id: "p1",
        articleId: "eu-safe-ii",
        index: 0,
        pt: "A Comissao Europeia esta a preparar uma nova proposta para reforcar o financiamento da defesa comum.",
        zhHans: "欧盟委员会正在准备一项新提案，以加强共同防务融资。",
      },
      {
        id: "p2",
        articleId: "eu-safe-ii",
        index: 1,
        pt: "Os Estados-membros querem acelerar compras conjuntas, mas continuam divididos sobre a origem dos fundos.",
        zhHans: "成员国希望加快联合采购，但在资金来源上仍存在分歧。",
      },
    ],
  },
  {
    id: "lisboa-calor",
    title: "Lisboa reforca medidas durante uma semana de calor",
    dek: "Vocabulário urbano, clima e servicos publicos.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T08:00:00.000Z",
    estimatedMinutes: 4,
    completed: false,
    paragraphs: [
      {
        id: "p1",
        articleId: "lisboa-calor",
        index: 0,
        pt: "A autarquia abriu novos pontos de apoio para proteger moradores vulneraveis durante a tarde.",
        zhHans: "市政府开放了新的援助点，以在下午保护脆弱居民。",
      },
      {
        id: "p2",
        articleId: "lisboa-calor",
        index: 1,
        pt: "As autoridades recomendam que as pessoas evitem deslocacoes longas nas horas de maior calor.",
        zhHans: "当局建议人们避免在最热时段进行长距离出行。",
      },
    ],
  },
  {
    id: "cultura-porto",
    title: "Porto inaugura exposicao dedicada a jovens artistas",
    dek: "Um texto leve para praticar nomes, adjectivos e preposicoes.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T09:00:00.000Z",
    estimatedMinutes: 3,
    completed: false,
    paragraphs: [
      {
        id: "p1",
        articleId: "cultura-porto",
        index: 0,
        pt: "A nova exposicao reune obras de criadores que vivem entre o Porto, Braga e Coimbra.",
        zhHans: "新展览汇集了生活在波尔图、布拉加和科英布拉之间的创作者作品。",
      },
      {
        id: "p2",
        articleId: "cultura-porto",
        index: 1,
        pt: "O programa inclui visitas guiadas e conversas informais com os artistas ao fim da tarde.",
        zhHans: "活动包括导览参观和傍晚与艺术家的非正式对谈。",
      },
    ],
  },
];
