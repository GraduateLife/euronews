import {
  articleIdFromUrl,
  estimateMinutes,
  extractParagraphs,
  parseRssItems,
} from "../src/article-fetchers/euronews";

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.log(`FAIL  ${name}`, detail ?? "");
  }
}

// ---------- RSS ----------
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Euronews</title>
<item>
  <title><![CDATA[Bruxelas aprova novo plano para a defesa comum]]></title>
  <link>https://pt.euronews.com/my-europe/2026/07/04/bruxelas-aprova-novo-plano-para-a-defesa-comum</link>
  <description><![CDATA[<p>Os Estados-membros chegaram a acordo depois de meses de negocia&ccedil;&otilde;es. Mais detalhes em baixo.</p>]]></description>
  <pubDate>Fri, 04 Jul 2026 09:30:00 +0200</pubDate>
</item>
<item>
  <title>Calor extremo obriga Lisboa a ativar plano de contingência</title>
  <link>https://pt.euronews.com/2026/07/04/calor-extremo-lisboa</link>
  <description>As temperaturas devem ultrapassar os 40 graus. O aviso vermelho mantém-se.</description>
  <pubDate>Fri, 04 Jul 2026 08:00:00 +0200</pubDate>
</item>
</channel></rss>`;

const items = parseRssItems(rss);
check("parses 2 RSS items", items.length === 2, items.length);
check("CDATA title", items[0].title === "Bruxelas aprova novo plano para a defesa comum", items[0].title);
check("link", items[0].link.startsWith("https://pt.euronews.com/my-europe/2026"), items[0].link);
check(
  "description strips html + entities + first sentence",
  items[0].description === "Os Estados-membros chegaram a acordo depois de meses de negociações.",
  items[0].description
);

check(
  "articleIdFromUrl slug",
  articleIdFromUrl(items[0].link) === "my-europe-2026-07-04-bruxelas-aprova-novo-plano-para-a-defesa-comum",
  articleIdFromUrl(items[0].link)
);

// ---------- JSON-LD extraction ----------
const par1 = "A Comissão Europeia aprovou esta sexta-feira um novo plano para reforçar a defesa comum dos Estados-membros da União Europeia.";
const par2 = "O acordo prevê compras conjuntas de equipamento militar e um fundo de cento e cinquenta mil milhões de euros em empréstimos garantidos.";
const par3 = "Vários diplomatas afirmam que as negociações foram difíceis, mas o resultado final agradou à maioria das capitais europeias.";
const htmlJsonLd = `<!doctype html><html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"NewsArticle","headline":"Bruxelas aprova plano","articleBody":"${par1}\\n\\n${par2}\\n\\n${par3}"}]}
</script></head><body><article><p>PUBLICIDADE</p></article></body></html>`;

const jsonLdParagraphs = extractParagraphs(htmlJsonLd);
check("JSON-LD: 3 paragraphs", jsonLdParagraphs.length === 3, jsonLdParagraphs.length);
check("JSON-LD: paragraph text intact", jsonLdParagraphs[0] === par1, jsonLdParagraphs[0]);

// ---------- JSON-LD single-line body regrouping ----------
const flatBody = [par1, par2, par3, par1, par2, par3].join(" ");
const htmlFlat = `<script type="application/ld+json">{"@type":"NewsArticle","articleBody":"${flatBody}"}</script>`;
const flatParagraphs = extractParagraphs(htmlFlat);
check("flat body regrouped into >=2 paragraphs", flatParagraphs.length >= 2, flatParagraphs.length);

// ---------- <p> tag fallback ----------
const htmlPTags = `<html><body>
<nav><p>Menu principal com muitas letras para o filtro nao apanhar isto como texto</p></nav>
<article>
<p>${par1}</p>
<p class="x">${par2.replace("cento e cinquenta", "cento&nbsp;e&nbsp;cinquenta")}</p>
<p><strong>${par3}</strong></p>
<p>PUBLICIDADE</p>
<p>Partilhar</p>
<p>Leia também: outra notícia relacionada com este tema que continua aqui</p>
</article>
<footer><p>Copyright euronews 2026 todos os direitos reservados para sempre e sempre</p></footer>
</body></html>`;

const pParagraphs = extractParagraphs(htmlPTags);
check("<p> fallback: 3 body paragraphs", pParagraphs.length === 3, pParagraphs);
check("<p> fallback: nbsp decoded", pParagraphs[1].includes("cento e cinquenta"), pParagraphs[1]);
check("<p> fallback: strong stripped", pParagraphs[2] === par3, pParagraphs[2]);

// ---------- estimate ----------
const minutes = estimateMinutes([par1, par2, par3]);
check("estimateMinutes >= 2", minutes >= 2, minutes);

// ---------- feed discovery + homepage fallback ----------
import { dateFromUrl, discoverFeedUrl, extractTitleAndDek, itemsFromHomepage } from "../src/article-fetchers/euronews";

const homeHtml = `<html><head>
<link rel="stylesheet" href="/style.css">
<link rel="alternate" type="application/rss+xml" title="Euronews" href="/rss?format=news">
</head><body>
<a href="/my-europe/2026/07/05/bruxelas-plano-defesa">Bruxelas aprova plano</a>
<a href="https://pt.euronews.com/2026/07/05/calor-lisboa">Calor</a>
<a href="https://pt.euronews.com/2026/07/05/calor-lisboa">dup</a>
<a href="https://www.euronews.com/2026/07/05/english-story">EN</a>
<a href="/video/2026/07/05/video-story">video ok too</a>
<a href="/programas/aqui-nao-ha-data">sem data</a>
</body></html>`;

check("discoverFeedUrl resolves relative href", discoverFeedUrl(homeHtml, "https://pt.euronews.com/") === "https://pt.euronews.com/rss?format=news", discoverFeedUrl(homeHtml, "https://pt.euronews.com/"));

const homeItems = itemsFromHomepage(homeHtml, "https://pt.euronews.com/");
check("homepage scrape: 3 unique pt links", homeItems.length === 3, homeItems.map(i => i.link));
check("homepage scrape: absolute urls", homeItems.every(i => i.link.startsWith("https://pt.euronews.com/")), homeItems);

const articleHtml = `<html><head>
<meta property="og:title" content="Bruxelas aprova plano hist&oacute;rico | Euronews">
<meta property="og:description" content="Os l&iacute;deres chegaram a acordo. Mais um teste.">
<script type="application/ld+json">{"@type":"NewsArticle","headline":"Bruxelas aprova plano histórico para a defesa"}</script>
</head></html>`;
const meta = extractTitleAndDek(articleHtml);
check("title from JSON-LD headline", meta.title === "Bruxelas aprova plano histórico para a defesa", meta.title);
check("dek from og:description, first sentence", meta.dek === "Os líderes chegaram a acordo.", meta.dek);

const metaNoLd = extractTitleAndDek(articleHtml.replace(/<script[\s\S]*?<\/script>/, ""));
check("title falls back to og:title without Euronews suffix", metaNoLd.title === "Bruxelas aprova plano histórico", metaNoLd.title);

check("dateFromUrl", dateFromUrl("https://pt.euronews.com/my-europe/2026/07/05/slug") === "2026-07-05T08:00:00.000Z", dateFromUrl("https://pt.euronews.com/my-europe/2026/07/05/slug"));

console.log(failures === 0 ? "EXTENDED TESTS PASSED" : `${failures} EXTENDED FAILURES`);
process.exit(failures === 0 ? 0 : 1);
