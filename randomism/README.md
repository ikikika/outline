# Randomism

JSON-driven blog built with Next.js App Router and TypeScript. Article copy lives in `data/articles/*.json`; the app validates schemas and renders blocks through a component registry.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Base URL for canonical and Open Graph links (default `http://localhost:3000`) |

## Authoring articles

1. Add `data/articles/{slug}.json` (slug = filename stem, lowercase kebab-case).
2. Set `"published": true` and a `publishDate` to list the article on the home page.
3. Drafts use `"published": false` — they still render at `/articles/{slug}` with a Draft tag, but do not appear in the home list (and are marked `noindex`).
4. Body is an ordered `blocks` array with `componentType` values: `Heading`, `Paragraph`, `Image`.

See `specs/001-content-page-foundation/contracts/article-schema.md` for the full contract.

## Scripts

```bash
npm run dev    # local preview
npm run lint   # ESLint
npm run build  # production build (fails if any article JSON is invalid)
npm start      # serve production build
```

## Spec Kit

Feature docs: `specs/001-content-page-foundation/`. Constitution: `.specify/memory/constitution.md`.
