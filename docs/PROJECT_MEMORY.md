# Project Memory

## One-line Intent

Build a quiet, mobile-first European Portuguese reading trainer using daily Euronews PT articles, image-based vocabulary recall, and sentence-pattern practice.

## User Taste

- No Next.js.
- Prefer TanStack ecosystem.
- Minimal black-and-white UI inspired by note apps.
- Avoid cold, sterile, enterprise-dark styling.
- Mobile portrait scrolling is the primary surface.
- The product should feel like a useful reading notebook, not a language-learning toy.

## Core Interaction Rules

- Article paragraphs show PT + Simplified Chinese.
- Word selection opens a short 50% bottom drawer.
- Sentence selection opens a 90% bottom drawer.
- Word drawer should avoid spoon-feeding definitions; show image, short usage sentence, user meaning/tag input, and Priberam link.
- Sentence drawer should produce structure-matched generation, hide the generated sentence with a slow fade, then compare the user's Portuguese with a coach diff.
- Review is unlocked after the daily 3 articles are completed.

## External Sources

- Euronews PT: article source.
- Dicionario Priberam: word lookup and outbound reference link.
- Unsplash: preferred image source, with attribution and hotlinked URLs.
- Cloudflare Workers AI: fallback generated images and possibly lightweight AI tasks.

## Non-goals For MVP

- Full social accounts.
- Complex spaced repetition algorithms.
- Full Priberam content replication.
- Desktop-first layout.
- A marketing landing page.
