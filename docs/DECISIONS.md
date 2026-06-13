# Decisions

## 2026-06-13: Use TanStack, Not Next.js

The user explicitly dislikes Next.js. The frontend will use Vite + React + TanStack Router + TanStack Query.

## 2026-06-13: Mobile-first Notebook Feel

The UI should be black-and-white because color is unnecessary, not because the product is trying to feel severe or cold.

## 2026-06-13: Hono BFF Inside The Worker

Use Hono for the BFF API. Keep API routes and crawler logic in `apps/worker` for now, but separate them by directory: `bff`, `article-fetchers`, and `crawler`. This keeps local development and Cloudflare deployment simple while preserving a clean future split point.
