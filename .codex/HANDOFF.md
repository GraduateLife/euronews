# Handoff

Current state: initial project scaffold.

When resuming:

- Start with `pnpm install`.
- Use `pnpm dev:worker` for the Hono BFF on `http://localhost:8787`.
- Use `pnpm dev:web` for the TanStack app.
- The web app proxies `/api/*` to the Worker during local development.
- Current article data comes from `apps/worker/src/article-fetchers/mockArticleFetcher.ts`.
