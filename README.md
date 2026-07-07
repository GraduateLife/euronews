# Euronews PT Reading Lab

[中文 README](./README.zh-CN.md)

Euronews PT Reading Lab is a quiet, mobile-first European Portuguese reading trainer. It fetches daily Portuguese Euronews articles, presents paragraph-level Portuguese and Simplified Chinese, and turns reading moments into vocabulary notes, image recall, and sentence-pattern practice.

This project intentionally does not use Next.js. The frontend is Vite + React + TanStack Router + TanStack Query; the backend is a Hono BFF running on Cloudflare Workers.

## What It Does

- Fetches the daily Portuguese Euronews edition and stores selected articles in Cloudflare D1.
- Serves article summaries, full article paragraphs, completion state, word notes, and review state through a Worker BFF.
- Translates paragraphs from European Portuguese to Simplified Chinese with Workers AI, lazily on first read to stay within Worker request limits.
- Lets readers hold/select a word or phrase to open a 50% study drawer with an image, a short example, an AI language hint, a user-authored note, tags, and a Priberam link.
- Supports paragraph-aware sentence practice and feedback through a 90% drawer workflow.
- Unlocks review after the daily article set is completed.

## Workspace Structure

```text
apps/
  web/       Vite React app: mobile reader UI, drawers, review screen, API client
  worker/    Cloudflare Worker: Hono BFF, article crawler, D1 repositories, AI/image adapters
packages/
  shared/    Shared domain types, sample articles, Priberam URL helper
docs/
  ARCHITECTURE.md        System map and storage/API overview
  WORKER_PIPELINE.md     Euronews fetch, lazy translation, D1 storage, cron/deploy notes
  API_NOTES.md           Source/provider notes
  DECISIONS.md           Product and architecture decisions
  PROJECT_MEMORY.md      Product intent, taste, interaction rules
  ROADMAP.md             MVP and future work
```

The Worker code is split by responsibility rather than deployment boundary:

- `src/bff`: Hono routes consumed by the web app, plus OpenAPI/Swagger docs.
- `src/article-fetchers`: Euronews feed/page parsing and source adapters.
- `src/crawler`: scheduled/manual daily refresh pipeline.
- `src/articles`: D1 article repositories and lazy translation helpers.
- `src/study`: D1 study-state repositories.
- `src/ai`: Workers AI translation and word-description helpers.
- `src/lib`: shared fetch/text utilities.

## UI Style

The app is designed as a reading notebook, not a gamified language-learning toy. The visual system is mobile-first, portrait-scroll oriented, and inspired by aged newsprint:

- warm paper tones, black ink, oxblood accent color;
- serif editorial typography with a masthead, dateline, pull quotes, drop caps, and ruled separators;
- restrained controls that stay close to the reading flow;
- bottom drawers for study actions so the article remains the primary surface;
- no marketing landing page and no desktop-first dashboard framing.

See [docs/PROJECT_MEMORY.md](./docs/PROJECT_MEMORY.md) and [docs/DECISIONS.md](./docs/DECISIONS.md) for the product taste and interaction rules that shaped the UI.

## First Commands

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` starts both the Worker and the web app. The web app proxies `/api/*` to `http://localhost:8787`; local Swagger is served by the Worker too, so after a restart make sure the Worker dev server is running. If you want separate logs, run `pnpm dev:worker` and `pnpm dev:web` in two terminals. Leave `VITE_API_BASE_URL` unset for local development.

Useful URLs:

- Web app: `http://localhost:5173`
- Worker health: `http://localhost:8787/api/health`
- Swagger UI: `http://localhost:8787/api/docs`
- OpenAPI JSON: `http://localhost:8787/api/openapi.json`

## Environment

Copy `.env.example` to `.env` at the repo root. Vite reads root env files, so restart `pnpm dev:web` after changing it.

To point the frontend at a deployed Worker:

```bash
VITE_API_BASE_URL=https://euronews-pt-reading-lab.<your-subdomain>.workers.dev
```

Worker secrets live outside source control. For local Worker development, put optional secrets in `apps/worker/.dev.vars`; for deployment, use Wrangler secrets.

```bash
# optional: enables real Unsplash photos in the word drawer
UNSPLASH_ACCESS_KEY=...
```

Without a Worker, the frontend logs a warning and falls back to bundled sample articles. Without Workers AI, translations and word hints degrade gracefully. Without Unsplash, the word drawer shows a styled placeholder image.

## Data Pipeline

The daily pipeline is documented in detail in [docs/WORKER_PIPELINE.md](./docs/WORKER_PIPELINE.md).

High-level flow:

```text
scheduled cron or POST /api/articles/refresh
  -> fetchDailyEuronewsArticles
  -> parse RSS/homepage/article pages
  -> store selected articles and paragraphs in D1
  -> translate paragraphs lazily when GET /api/articles/:id is opened
```

The deployed Worker has a cron trigger at `06:00 UTC`. Manual refresh is available during development:

```bash
curl -X POST http://localhost:8787/api/articles/refresh
```

## API Reference

The Worker exposes a Swagger/OpenAPI reference in local development. Deployed Workers do not expose these documentation endpoints:

- Local Swagger UI: `http://localhost:8787/api/docs`
- Local OpenAPI JSON: `http://localhost:8787/api/openapi.json`

If the browser cannot connect, first confirm `pnpm dev` or `pnpm dev:worker` is running and Wrangler has printed `Ready on http://localhost:8787`.

Main route groups:

- `GET /api/today`
- `GET /api/articles/status`
- `GET /api/articles/:articleId`
- `POST /api/articles/refresh`
- `POST /api/articles/:articleId/complete`
- `POST /api/words/lookup`
- `POST /api/words/notes`
- `POST /api/paragraphs/practice`
- `POST /api/paragraphs/feedback`
- `GET /api/review`
- `GET /api/debug/translate`

## Provider Reference

External service usage and quick links are kept in [docs/SERVICE_PROVIDERS.md](./docs/SERVICE_PROVIDERS.md). Current providers are Cloudflare and Unsplash; Priberam and Euronews are also documented as content/reference sources.

## Deploy Notes

```bash
cd apps/worker
npx wrangler d1 create euronews_pt_reading_lab
pnpm db:migrate:remote
npx wrangler secret put UNSPLASH_ACCESS_KEY
npx wrangler deploy
```

After deploy, point the frontend to the Worker with `VITE_API_BASE_URL`. If the frontend is hosted beyond localhost, add its origin to the CORS list in `apps/worker/src/bff/app.ts`.
