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

- Article discovery and scraping.
- Paragraph translation orchestration.
- Word lookup adapter.
- Unsplash image search adapter.
- Cloudflare AI image fallback.
- Sentence practice generation and feedback.

## Shared Package

`packages/shared` defines domain types and constants used by both app and Worker.

## Storage Plan

MVP can start with mocked data. Cloudflare target:

- D1: articles, paragraphs, word notes, sentence practices, review state.
- KV: short-lived cache for article fetches, Priberam lookups, Unsplash results.
- R2: optional generated image storage if data URI responses become too heavy.

## API Shape

- `GET /api/today`
- `GET /api/articles/:id`
- `POST /api/words/lookup`
- `POST /api/words/notes`
- `POST /api/sentences/practice`
- `POST /api/sentences/feedback`
- `GET /api/review`
