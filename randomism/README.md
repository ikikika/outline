# Randomism

JSON-driven blog built with Next.js App Router and TypeScript. Article copy lives in `data/articles/*.json`; the app validates schemas and renders blocks through a component registry. Prose fields support CommonMark via `react-markdown` (raw HTML is not rendered as DOM elements).

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
4. Body is an ordered `blocks` array. Supported `componentType` values:

| componentType | Notes |
|---------------|--------|
| `Heading` | Plain text; `level` 1–6 |
| `Paragraph` | Full CommonMark Markdown |
| `Image` | `content.src`, `content.alt` (plain) |
| `CodeBlock` | Literal `code`; optional `language` label (not Markdown) |
| `Accordion` | `sections[]` with Markdown `title` / `body`; optional `defaultOpen` |
| `Blockquote` | Markdown `text`; optional plain `cite` |
| `List` | `ordered` boolean; `items[]` with inline Markdown |
| `Callout` | `variant`: `info` \| `tip` \| `warning`; Markdown `body` |
| `Divider` | `{ "componentType": "Divider" }` only |

See `/articles/getting-started` for a fixture that uses every type. Contracts: `specs/002-blog-block-catalog/contracts/`.

## Scripts

```bash
npm run dev    # local preview
npm run lint   # ESLint
npm run build  # production build (fails if any article JSON is invalid)
npm start      # serve production build
```

## Spec Kit

Feature docs: `specs/001-content-page-foundation/`, `specs/002-blog-block-catalog/`. Constitution: `.specify/memory/constitution.md`.
