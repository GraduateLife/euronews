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
pnpm dev
```

## Environment

Copy `.env.example` to `.env` for local frontend variables and `apps/worker/.dev.vars.example` to `apps/worker/.dev.vars` for Worker secrets.
