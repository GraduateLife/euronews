# API Notes

Interactive API reference is served by the Worker:

- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/openapi.json`

## Euronews

Use the Portuguese site as article source. Keep source URL and publication metadata. Avoid pretending we own the content.

## Priberam

Word links follow this pattern:

```text
https://dicionario.priberam.org/{word}
```

Use Priberam as a lookup/reference source. For the user-facing MVP, expose the link and derive only small learning hints, not full copied dictionary entries.

## Unsplash

Use the official API through the Worker so credentials are not exposed client-side. Keep required attribution and hotlink returned image URLs.

## Cloudflare AI

Use Workers AI as fallback for generated visual mnemonics when Unsplash is weak for a word.

See `docs/SERVICE_PROVIDERS.md` for provider setup, operational notes, and quick links.
