import type { ArticleDetail } from "./index";

/**
 * The daily sample edition, in proper European Portuguese with diacritics and
 * real multi-sentence paragraphs. This is the single source of truth shared by
 * the Worker's mock fetcher and the web app's offline fallback, so the reader
 * looks the same whether or not the Worker is running.
 */
export const sampleArticles: ArticleDetail[] = [
  {
    id: "eu-safe-ii",
    title: "Europa prepara novo mecanismo de financiamento da defesa",
    dek: "Um texto mais longo para praticar leitura política em português europeu.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T07:00:00.000Z",
    estimatedMinutes: 6,
    completed: false,
    paragraphs: [
      {
        id: "eu-safe-ii-p1",
        articleId: "eu-safe-ii",
        index: 0,
        pt: "A Comissão Europeia está a preparar uma nova proposta para reforçar o financiamento da defesa comum. O objetivo é permitir que os Estados-membros comprem equipamento militar em conjunto e a um custo mais baixo. Bruxelas quer apresentar o plano antes do final do ano.",
        zhHans:
          "欧盟委员会正在准备一项新提案，以加强共同防务融资。其目标是让成员国能够联合采购军事装备，并降低成本。布鲁塞尔希望在年底前提出该计划。",
      },
      {
        id: "eu-safe-ii-p2",
        articleId: "eu-safe-ii",
        index: 1,
        pt: "Segundo fontes europeias, o mecanismo poderá mobilizar até cento e cinquenta mil milhões de euros em empréstimos. Os fundos seriam garantidos pelo orçamento comum da União. Vários governos consideram esta abordagem mais rápida do que negociar contributos nacionais.",
        zhHans:
          "据欧洲消息人士称，该机制可能动用高达一千五百亿欧元的贷款。这些资金将由欧盟共同预算担保。多国政府认为，这种方式比谈判各国出资更为迅速。",
      },
      {
        id: "eu-safe-ii-p3",
        articleId: "eu-safe-ii",
        index: 2,
        pt: "No entanto, os Estados-membros continuam divididos sobre a origem do dinheiro. Os países do Norte preferem limitar a dívida comum, enquanto outros defendem um esforço conjunto mais ambicioso. A discussão deverá dominar a próxima cimeira em Bruxelas.",
        zhHans:
          "然而，成员国在资金来源上仍存在分歧。北方国家倾向于限制共同债务，而其他国家则主张更具雄心的联合行动。这一讨论预计将主导下次布鲁塞尔峰会。",
      },
      {
        id: "eu-safe-ii-p4",
        articleId: "eu-safe-ii",
        index: 3,
        pt: "A indústria europeia de defesa acompanha o processo com atenção. Muitas empresas dizem que precisam de encomendas estáveis para aumentar a produção. Sem contratos de longo prazo, alertam, será difícil reduzir a dependência de fornecedores externos.",
        zhHans:
          "欧洲国防工业正密切关注这一进程。许多企业表示，需要稳定的订单才能提高产量。它们警告说，没有长期合同，将很难减少对外部供应商的依赖。",
      },
      {
        id: "eu-safe-ii-p5",
        articleId: "eu-safe-ii",
        index: 4,
        pt: "Os analistas lembram que a coordenação entre capitais nunca foi simples. Cada país tem prioridades industriais e interesses próprios a proteger. Ainda assim, a pressão geopolítica tem aproximado posições que há poucos anos pareciam irreconciliáveis.",
        zhHans:
          "分析人士指出，各国首都之间的协调从来都不简单。每个国家都有自己的产业重点和需要维护的利益。尽管如此，地缘政治压力使得几年前看似无法调和的立场逐渐靠拢。",
      },
      {
        id: "eu-safe-ii-p6",
        articleId: "eu-safe-ii",
        index: 5,
        pt: "A proposta final ainda terá de ser aprovada pelo Parlamento Europeu e pelos governos nacionais. O calendário é apertado e as negociações prometem ser difíceis. Para já, a Comissão limita-se a dizer que todas as opções estão em cima da mesa.",
        zhHans:
          "最终提案仍需经欧洲议会和各国政府批准。时间表紧迫，谈判注定艰难。目前，欧盟委员会仅表示，所有选项都摆在桌面上。",
      },
    ],
  },
  {
    id: "lisboa-calor",
    title: "Lisboa reforça medidas durante uma semana de calor",
    dek: "Vocabulário urbano, clima e serviços públicos.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T08:00:00.000Z",
    estimatedMinutes: 4,
    completed: false,
    paragraphs: [
      {
        id: "lisboa-calor-p1",
        articleId: "lisboa-calor",
        index: 0,
        pt: "A autarquia de Lisboa reforçou esta semana as medidas de apoio à população durante vários dias de calor intenso. Foram abertos novos pontos de água e espaços climatizados em toda a cidade. As equipas de proteção civil estão em alerta desde segunda-feira.",
        zhHans:
          "里斯本市政府本周加强了在连续多日高温期间对民众的援助措施。全市开设了新的供水点和带空调的场所。民防队伍自周一起处于戒备状态。",
      },
      {
        id: "lisboa-calor-p2",
        articleId: "lisboa-calor",
        index: 1,
        pt: "As autoridades recomendam que as pessoas evitem deslocações longas nas horas de maior calor. Os mais idosos e as crianças são considerados os grupos mais vulneráveis. Os serviços de saúde pedem atenção aos primeiros sinais de desidratação.",
        zhHans:
          "当局建议人们避免在最热时段进行长距离出行。老年人和儿童被视为最脆弱的群体。卫生部门呼吁留意脱水的早期迹象。",
      },
      {
        id: "lisboa-calor-p3",
        articleId: "lisboa-calor",
        index: 2,
        pt: "Os transportes públicos mantêm o serviço normal, mas com reforço de limpeza e ventilação. A câmara distribuiu água em várias estações e paragens. Voluntários percorrem os bairros para ajudar quem vive sozinho.",
        zhHans:
          "公共交通维持正常运营，但加强了清洁和通风。市政厅在多个车站和站点分发饮用水。志愿者走访各社区，帮助独居者。",
      },
      {
        id: "lisboa-calor-p4",
        articleId: "lisboa-calor",
        index: 3,
        pt: "A previsão aponta para uma descida das temperaturas a partir do fim de semana. Até lá, o município mantém o plano de contingência ativo. Os responsáveis garantem que estão preparados para prolongar as medidas se for necessário.",
        zhHans:
          "预报显示，气温将从周末开始下降。在此之前，市政当局将继续启动应急预案。负责人保证，如有必要，已做好延长相关措施的准备。",
      },
    ],
  },
  {
    id: "cultura-porto",
    title: "Porto inaugura exposição dedicada a jovens artistas",
    dek: "Um texto leve para praticar nomes, adjetivos e preposições.",
    sourceUrl: "https://pt.euronews.com/",
    publishedAt: "2026-06-13T09:00:00.000Z",
    estimatedMinutes: 3,
    completed: false,
    paragraphs: [
      {
        id: "cultura-porto-p1",
        articleId: "cultura-porto",
        index: 0,
        pt: "O Porto inaugurou esta semana uma exposição dedicada a jovens artistas da região. A mostra reúne obras de criadores que vivem entre o Porto, Braga e Coimbra. A entrada é gratuita durante o primeiro fim de semana.",
        zhHans:
          "波尔图本周揭幕了一场专为本地区年轻艺术家举办的展览。展览汇集了生活在波尔图、布拉加和科英布拉之间的创作者作品。首个周末免费入场。",
      },
      {
        id: "cultura-porto-p2",
        articleId: "cultura-porto",
        index: 1,
        pt: "O programa inclui visitas guiadas e conversas informais com os artistas ao fim da tarde. Os organizadores quiseram aproximar o público das novas linguagens visuais. Muitas das peças foram criadas especialmente para este espaço.",
        zhHans:
          "活动包括导览参观以及傍晚与艺术家的非正式对谈。主办方希望拉近公众与新视觉语言的距离。许多作品是专门为这一空间创作的。",
      },
      {
        id: "cultura-porto-p3",
        articleId: "cultura-porto",
        index: 2,
        pt: "A exposição fica patente até ao final do verão e deverá viajar depois para outras cidades. Os curadores esperam repetir a iniciativa no próximo ano. Para muitos destes artistas, é a primeira vez que mostram o trabalho ao grande público.",
        zhHans:
          "展览将持续至夏末，之后预计将巡展至其他城市。策展人希望明年再次举办这一活动。对许多艺术家而言，这是首次向广大公众展示自己的作品。",
      },
    ],
  },
];
