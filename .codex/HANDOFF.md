# Handoff

Current state: initial project scaffold.

When resuming:

- Start with `pnpm install`.
- Use `pnpm dev:worker` for the Hono BFF on `http://localhost:8787`.
- Use `pnpm dev:web` for the TanStack app.
- Run `pnpm db:migrate:local` before using study/review APIs in a fresh local environment.
- The web app proxies `/api/*` to the Worker during local development.
- Current article data comes from `apps/worker/src/article-fetchers/mockArticleFetcher.ts`.
- Current study state persists in local Cloudflare D1 through `apps/worker/src/study/studyRepository.ts`.
