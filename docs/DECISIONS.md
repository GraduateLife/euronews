# Decisions

## 2026-06-13: Use TanStack, Not Next.js

The user explicitly dislikes Next.js. The frontend will use Vite + React + TanStack Router + TanStack Query.

## 2026-06-13: Mobile-first Notebook Feel

The UI should be black-and-white because color is unnecessary, not because the product is trying to feel severe or cold.

## 2026-06-13: Hono BFF Inside The Worker

Use Hono for the BFF API. Keep API routes and crawler logic in `apps/worker` for now, but separate them by directory: `bff`, `article-fetchers`, and `crawler`. This keeps local development and Cloudflare deployment simple while preserving a clean future split point.

## 2026-06-13: No Frontend Persistence Fallback

The frontend should not hide missing API behavior with localStorage or local mock fallbacks. It calls the Hono BFF for article data, word notes, paragraph practice, completion state, and review state. The current Worker repository is in-memory for local development and should later be replaced by D1.

## 2026-06-13: Paragraph Practice Unit

Practice is paragraph-aware. A user may select part of a sentence, but the app expands it to the complete sentence and sends the full paragraph context to the BFF.
