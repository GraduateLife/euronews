# Architecture

## Frontend

The frontend is a Vite React app using:

- TanStack Router for file-based-ish route organization.
- TanStack Query for API state.
- CSS variables and plain CSS modules/global CSS for a restrained note-app visual system.

Primary routes:

- `/`: today's 3 articles.
- `/article/$articleId`: paragraph reader and selection handling.
- `/review`: quick review and later deep review.

## Worker

The Worker owns:

- Article discovery and scraping (real Euronews PT fetch: RSS with homepage
  fallback, JSON-LD/`<p>` body extraction).
- Paragraph translation (Workers AI m2m100): upfront in the daily cron,
  lazily on first read otherwise.
- Word lookup: AI definition/example (llama) plus Unsplash image search with
  a styled placeholder fallback.
- Sentence practice generation and feedback.

The Worker is intentionally split by code boundary, not by deployment boundary:

- `src/bff`: Hono BFF routes consumed by the web app.
- `src/article-fetchers`: article source adapters (`euronews/` split into
  feed sources, page parsing, and orchestration).
- `src/crawler`: the daily refresh pipeline shared by cron and manual refresh.
- `src/articles`, `src/study`: D1 repositories and article-domain logic.
- `src/ai`: Workers AI helpers.
- `src/lib`: shared fetch/text utilities.

See `docs/WORKER_PIPELINE.md` for the data flow, the platform limits that
shaped it, per-module change guides, and the deploy checklist.

Keep these together while the project is small. Split `crawler` into its own app only if it needs queues, heavier parsing, or a different deployment cadence.

## Shared Package

`packages/shared` defines domain types and constants used by both app and Worker.

## Storage

The BFF uses Cloudflare D1 for study state:

- `completed_articles`: article completion state.
- `word_notes`: saved word notes, user meanings, tags, images, and Priberam links.
- `paragraph_practices`: paragraph-level practice attempts and feedback.

Local development applies migrations with:

```bash
pnpm db:migrate:local
```

Later storage:

- D1 can also store fetched articles and translated paragraphs once the real Euronews fetch job replaces the fixed fetcher.
- KV can cache article fetches, Priberam lookups, and Unsplash results.
- R2 can store generated images if Cloudflare AI image responses become too heavy.

## API Shape

- `GET /api/today`
- `GET /api/articles/:id`
- `POST /api/articles/:id/complete`
- `POST /api/words/lookup`
- `POST /api/words/notes`
- `POST /api/paragraphs/practice`
- `POST /api/paragraphs/feedback`
- `GET /api/review`
