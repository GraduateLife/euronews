# Worker Pipeline Guide

How real Euronews articles get fetched, translated, stored, and served — and
where to change things. Read this before touching `apps/worker`.

## The three data paths

The same pipeline runs in three modes, shaped by Cloudflare platform limits:

```
1. DAILY CRON (06:00 UTC)
   scheduled() → runScheduledArticleFetch
     → refreshDailyEdition({ translate: false })
       → fetchDailyEuronewsArticles  (RSS → pick 5 → fetch pages → paragraphs)
       → deleteEdition(today) + storeArticles → D1
   Translation is deferred to first read: 5 articles x 10 paragraphs of
   inline translation would blow the 50-subrequest budget (see below).
   refreshDailyEdition still accepts { translate: true } if that trade-off
   ever changes — recheck the budget first.

2. MANUAL REFRESH (POST /api/articles/refresh; one HTTP response ~10-15s)
   Identical to the cron. The summary (or full error chain) returns in the
   response body. Long background work is impossible here anyway: waitUntil
   is cancelled ~30s after the response.

3. FIRST READ (GET /api/articles/:id)
   getStoredArticle → ensureTranslations: any paragraph with empty zh_hans
   is translated now (concurrent, <= 10 calls), persisted, and returned.
   Later reads are served straight from D1. Articles nobody opens never
   spend AI quota.
```

Reads fall back gracefully: `/api/today` serves the bundled sample articles
(`packages/shared/src/sampleArticles.ts`) while D1 is empty, translation and
Unsplash degrade to empty/placeholder when unconfigured.

## Module map (`apps/worker/src/`)

| Path                                       | Responsibility                                                                                                                              | Typical change                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `lib/politeFetch.ts`                       | Outbound HTTP etiquette: honest UA, one browser-UA retry on 4xx, diagnosable errors                                                         | Headers, retry policy                      |
| `lib/text.ts`                              | Pure text utils: entity decoding, HTML stripping, first-sentence                                                                            | New entities                               |
| `article-fetchers/euronews/feed.ts`        | Article-list sources: RSS parsing, feed auto-discovery, homepage-link scraping                                                              | Feed format changes                        |
| `article-fetchers/euronews/articlePage.ts` | Single-page parsing: paragraphs (JSON-LD body → `<p>` fallback), title/dek, url date, reading time                                          | Page structure changes, boilerplate filter |
| `article-fetchers/euronews/index.ts`       | Orchestration: source cascade, video filter, dedup, random pick, fetch loop; `ARTICLE_DELAY_MS`, `MAX_PARAGRAPHS`                           | Selection policy, article count budget     |
| `ai/languageAi.ts`                         | Workers AI: `translatePtToZh` (m2m100, tries both language-code conventions), `describeWord` (llama: monolingual PT definition + PT example + English image query) | Models, prompts                            |
| `articles/articleRepository.ts`            | D1 read/write for articles/paragraphs/editions                                                                                              | Schema changes (with a migration)          |
| `articles/ensureTranslations.ts`           | Lazy translate-on-first-read + persist                                                                                                      | Translation policy                         |
| `crawler/scheduledArticleFetch.ts`         | `refreshDailyEdition` (the pipeline) + cron entry                                                                                           | Pipeline steps                             |
| `bff/openapi.ts`                           | Static OpenAPI contract for local-only Swagger UI and machine-readable API reference                                                        | Request/response shape changes             |
| `bff/routes/system.ts`                     | `/`, `/api/health`, local-only `/api/openapi.json`, local-only `/api/docs`                                                                  | API docs/health behavior                   |
| `bff/routes/articles.ts`                   | `/today`, `/articles/status`, `/articles/:id`, `/articles/refresh`                                                                          | API shape                                  |
| `bff/routes/words.ts`                      | `/words/lookup` (AI insight + Unsplash + placeholder fallback), `/words/notes`                                                              | Word-drawer data                           |
| `bff/routes/debug.ts`                      | `/debug/translate` — raw model attempts/errors                                                                                              | More diagnostics                           |
| `study/studyRepository.ts`                 | Word notes / practices / completion state in D1                                                                                             | Study features                             |

Route order gotcha: register literal routes (`/articles/status`) **before**
param routes (`/articles/:articleId`) or Hono will swallow them.

## Platform limits that shaped the design

- **waitUntil is cancelled ~30s after an HTTP response** → no long background
  work behind an HTTP endpoint; hence lazy translation.
- **50 subrequests per invocation (free plan)** → the binding constraint.
  With lazy translation the hot invocation is a first read: `MAX_PARAGRAPHS`
  (10) AI calls. The crawl itself costs ~7 fetches. Inline translation in the
  cron would cost 5 × `MAX_PARAGRAPHS` + ~7 — over budget at 10 paragraphs,
  which is why the cron defers translation too.
- **workerd ignores system proxies in local dev** → external fetches may fail
  locally even when curl works; test the crawl on the deployed worker.

## Testing & diagnostics

- `pnpm test` (root) → `apps/worker/test/parser.test.ts`: 19 fixture cases
  covering RSS/entities, JSON-LD bodies, `<p>` fallback, feed discovery,
  homepage scraping, meta extraction. Parsers are pure string functions kept
  free of Workers APIs precisely so these tests run in Node.
- `GET /api/debug/translate?text=...` → raw translation attempts/errors.
- `npx wrangler tail` (in `apps/worker`) → live logs; skipped articles are
  logged with reasons (`too-few-paragraphs`, HTTP status).
- `GET /api/articles/status` → latest stored edition date/count.

## Cookbook

**Change the daily article count** — `DAILY_ARTICLE_COUNT` in
`crawler/scheduledArticleFetch.ts`; check the subrequest budget above.

**Add a new news source** — new folder under `article-fetchers/<source>/`
mirroring the euronews split (feed/articlePage/index); switch or merge in
`refreshDailyEdition`. Reuse `politeFetch` and `lib/text`.

**Swap the translation model** — `TRANSLATE_MODEL` in `ai/languageAi.ts`;
verify with `/api/debug/translate` after deploying.

**Include videos again** — remove the `/video/` filter in
`article-fetchers/euronews/index.ts` (`fetchDailyEuronewsArticles`).

**Change how paragraphs are split/filtered** — `articlePage.ts`
(`splitBody`, `isBodyParagraph`, `BOILERPLATE`); add a fixture to
`test/parser.test.ts` first.

## Deploy checklist

```bash
cd apps/worker
npx wrangler d1 create euronews_pt_reading_lab   # once; paste id into wrangler.toml
pnpm db:migrate:remote                           # after any new migration
npx wrangler secret put UNSPLASH_ACCESS_KEY      # optional
npx wrangler deploy
curl -X POST https://<worker>.workers.dev/api/articles/refresh
```

Point the web app at it with `VITE_API_BASE_URL=https://<worker>.workers.dev`
in `.env`. If the frontend is ever hosted (not just localhost), add its origin
to the CORS list in `bff/app.ts`.
