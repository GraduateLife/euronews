# Service Providers Internal Reference

This file is the quick map for external services used by `apps/worker`. Keep credentials out of source control; store local-only values in `apps/worker/.dev.vars` and production secrets with Wrangler.

## Quick Links

| Provider              | Use in this project                                                                               | Console / Docs                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cloudflare Workers    | Hosts the Hono BFF, scheduled cron, external fetches, and local-only API docs                     | [Dashboard](https://dash.cloudflare.com/) / [Workers docs](https://developers.cloudflare.com/workers/) |
| Cloudflare D1         | Stores fetched articles, paragraphs, completion state, word notes, and paragraph practice history | [D1 docs](https://developers.cloudflare.com/d1/)                                                       |
| Cloudflare Workers AI | Translates PT paragraphs to zh-Hans and describes selected words                                  | [Workers AI docs](https://developers.cloudflare.com/workers-ai/)                                       |
| Wrangler              | Local dev, D1 migrations, secrets, deploys, logs                                                  | [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/)                                   |
| Unsplash              | Optional current/planned source for word-recall images                                            | [API docs](https://unsplash.com/documentation) / [Apps](https://unsplash.com/oauth/applications)       |
| Euronews PT           | Article source, RSS/homepage/page fetch target                                                    | [PT homepage](https://pt.euronews.com/)                                                                |
| Priberam              | External dictionary reference link for selected terms                                             | [Dictionary](https://dicionario.priberam.org/)                                                         |

## Cloudflare

Cloudflare is the primary runtime and data platform.

### Workers

Used for:

- Hono BFF under `/api/*`.
- Scheduled article refresh via `[triggers].crons` in `apps/worker/wrangler.toml`.
- Server-side calls to Euronews, Unsplash, and Workers AI so browser secrets are never exposed.
- Local-only Swagger UI at `/api/docs` and OpenAPI JSON at `/api/openapi.json`;
  deployed Workers return 404 for both documentation endpoints.

Local commands:

```bash
pnpm dev:worker
curl http://localhost:8787/api/health
curl http://localhost:8787/api/openapi.json
```

Deploy commands:

```bash
cd apps/worker
npx wrangler deploy
npx wrangler tail
```

### D1

Used for:

- `articles` and `article_paragraphs`: fetched Euronews editions and paragraphs.
- `completed_articles`: daily reading progress.
- `word_notes`: saved vocabulary notes, image URL, tags, example sentence, Priberam URL.
- `paragraph_practices`: sentence-pattern attempts and feedback.

Local migration:

```bash
pnpm db:migrate:local
```

Remote setup:

```bash
cd apps/worker
npx wrangler d1 create euronews_pt_reading_lab
pnpm db:migrate:remote
```

After creating the remote database, paste the real `database_id` into `apps/worker/wrangler.toml`.

### Workers AI

Bindings:

```toml
[ai]
binding = "AI"
```

Used in `apps/worker/src/ai/languageAi.ts`:

- `translatePtToZh`: translates article paragraphs from Portuguese to Simplified Chinese.
- `describeWord`: returns a short Chinese meaning, a European Portuguese example, and an English image search query.

Operational notes:

- The app works without the AI binding; translation and word hints return empty strings/fallbacks.
- Paragraph translation is lazy on first article read because translating all paragraphs during the refresh can exceed Worker invocation budgets.
- Use `GET /api/debug/translate?text=...` for direct model diagnostics.

### Wrangler

Wrangler owns local Worker execution, D1 migrations, secrets, deployment, and tail logs.

Common commands:

```bash
pnpm dev:worker
pnpm db:migrate:local
cd apps/worker && pnpm db:migrate:remote
cd apps/worker && npx wrangler secret put UNSPLASH_ACCESS_KEY
cd apps/worker && npx wrangler tail
```

## Unsplash

Unsplash is optional but already supported by the Worker word lookup route.

Used in `apps/worker/src/bff/routes/words.ts`:

- `POST /api/words/lookup` asks Workers AI for a concrete English image query.
- The Worker calls `https://api.unsplash.com/search/photos`.
- The browser receives a safe image URL and attribution metadata, not the API key.
- If no key exists or the request fails, the Worker returns an inline placeholder image.

Required local secret:

```bash
# apps/worker/.dev.vars
UNSPLASH_ACCESS_KEY=...
```

Required production secret:

```bash
cd apps/worker
npx wrangler secret put UNSPLASH_ACCESS_KEY
```

Implementation reminders:

- Keep the Unsplash access key server-side only.
- Preserve returned attribution text in the UI.
- Prefer hotlinked Unsplash image URLs returned by the API rather than copying images into the repo.
- If image quality becomes weak for abstract terms, keep the placeholder fallback or add a separate provider strategy in `words.ts`.

## Euronews PT

Euronews is the article source. The Worker fetches RSS/homepage links and article pages, stores source URLs and publication metadata, and serves excerpts for personal study.

Implementation locations:

- `apps/worker/src/article-fetchers/euronews/feed.ts`
- `apps/worker/src/article-fetchers/euronews/articlePage.ts`
- `apps/worker/src/article-fetchers/euronews/index.ts`

Guidelines:

- Keep the original `sourceUrl`.
- Do not present Euronews content as owned by this app.
- When parsing breaks, start with `docs/WORKER_PIPELINE.md` and parser tests in `apps/worker/test/parser.test.ts`.

## Priberam

Priberam is used as an outbound dictionary reference, not as copied dictionary content.

Implementation:

```ts
priberamUrlFor(word);
```

URL pattern:

```text
https://dicionario.priberam.org/{word}
```

Guidelines:

- Link out to Priberam from the word drawer.
- Avoid copying full dictionary entries into this app.
- Let the user write their own meaning/memory cue in `word_notes`.

## Adding A New Provider

When adding another provider:

1. Put browser-unsafe credentials in Worker secrets, never in Vite env.
2. Add a thin adapter under `apps/worker/src` near the feature boundary.
3. Make failures graceful and visible in logs.
4. Update `/api/openapi.json` if the API response shape changes.
5. Add the provider to this file with console links, env vars, and operational notes.
