# Contract: Article JSON Schema (tags delta)

Extends [002 article-schema](../../002-blog-block-catalog/contracts/article-schema.md) and [004 article-schema](../../004-article-scroll-nav/contracts/article-schema.md). Implementation: Zod in `lib/schema/article.ts`.

## Article document (delta)

New optional top-level field `tags`. `componentType` catalog **unchanged**.

```json
{
  "published": true,
  "publishDate": "2026-08-01",
  "title": "Getting Started with Content Blocks",
  "description": "How every Randomism block type composes an article body, including Markdown prose.",
  "ogImage": "/images/getting-started.svg",
  "tags": ["randomism", "authoring"],
  "blocks": []
}
```

| Field | Rules |
|-------|--------|
| `tags` | Optional. Array of tag identities. Omit or `[]` is valid. |
| `tags[]` | Non-empty. Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Unique within the array. |
| Nested objects / extra keys on a tag | Reject (tags are strings, not objects) |
| Unknown article keys | Still reject (strict) |

## Invalid examples (must fail publish/build)

```json
"tags": ["React"]
```

```json
"tags": ["coding standards"]
```

```json
"tags": ["react", "react"]
```

```json
"tags": [{ "slug": "react" }]
```

```json
"tags": [""]
```

## Display (not stored)

Visitors see a derived label: hyphens become spaces; each word capitalized. Identity `coding-standards` displays as `Coding Standards`. Authors do not supply a second name.

## Showcase fixtures

Amend **all published** `data/articles/*.json` with at least one tag. Collectively use ≥2 distinct identities. Keep `draft-example.json` valid with `tags` omitted. Do **not** add a tags-only demo article.

Suggested identities: see [research.md](../research.md) fixture table.

## README

Authoring docs MUST mention optional `tags` (lowercase hyphenated list) next to `published` / `publishDate`.
