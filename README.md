# Euronews PT Reading Lab

A mobile-first European Portuguese reading practice app built around daily Euronews articles, self-authored vocabulary notes, image recall, and sentence-pattern drills.

This project intentionally does not use Next.js. The frontend uses Vite, React, TanStack Router, and TanStack Query. The backend target is Cloudflare Workers.

## Product Shape

- Fetch 3 Portuguese Euronews articles per day.
- Show paragraph-level European Portuguese and Simplified Chinese.
- Let the user select a word and open a 50% bottom drawer with image recall, a short usage sentence, user-entered meaning/tags, and a Priberam link.
- Let the user select a sentence and open a 90% bottom drawer for structure-matched sentence practice.
- Unlock review after the daily 3 articles are finished.

## Workspace Layout

- `apps/web`: mobile-first TanStack Router web app.
- `apps/worker`: Cloudflare Worker API, scheduled fetch jobs, AI/image adapters.
- `packages/shared`: shared schemas, types, and constants.
- `docs`: architecture, product memory, API notes, decision records.
- `.codex`: Codex collaboration memory and task handoff notes.

## First Commands

```bash
pnpm install
pnpm dev:worker
pnpm dev:web
```

Run the Worker and the web app in separate terminals. The web app proxies `/api/*` to `http://localhost:8787`, so the BFF is the normal development path. If the Worker is not running, the frontend keeps a small fallback mock so the UI remains inspectable.

## Environment

Copy `.env.example` to `.env` **at the repo root** for frontend variables (vite is configured to read env files from the root) and `apps/worker/.dev.vars.example` to `apps/worker/.dev.vars` for Worker secrets. Restart `pnpm dev:web` after changing `.env` — vite only reads it at startup.

To point the web app at a deployed Worker instead of the local one:

```bash
# .env (repo root)
VITE_API_BASE_URL=https://euronews-pt-reading-lab.<your-subdomain>.workers.dev
```

Leave `VITE_API_BASE_URL` unset to use the vite dev proxy (`/api` → `http://localhost:8787`). If the app shows the bundled sample articles when you expected real ones, open the browser console — every API fallback logs a warning saying which request failed and which API base was in effect.

## Real Data Pipeline

The Worker can fetch real Euronews PT articles once a day (06:00 UTC cron), pick 5 at random, translate each paragraph to Simplified Chinese with Workers AI, and store everything in D1. `/api/today` serves the latest stored edition and falls back to the bundled sample articles while the database is empty.

Local setup:

```bash
wrangler login                      # Workers AI runs against your account, free tier
pnpm db:migrate:local               # creates the articles tables
# put UNSPLASH_ACCESS_KEY=... into apps/worker/.dev.vars for real word images
pnpm dev:worker
curl -X POST http://localhost:8787/api/articles/refresh   # fetch today's edition now
```

Everything degrades gracefully: without `wrangler login` there are no AI translations/definitions, without the Unsplash key the word drawer shows a styled placeholder image, and without a stored edition the sample articles are served.

Deploying for the daily cron: create a real D1 database (`wrangler d1 create euronews_pt_reading_lab`), put its id into `wrangler.toml`, run `pnpm --filter @euronews/worker db:migrate:remote`, set the secret (`wrangler secret put UNSPLASH_ACCESS_KEY`), then `pnpm --filter @euronews/worker deploy`.
