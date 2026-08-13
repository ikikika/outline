# Contract: Article JSON Schema (scroll nav delta)

Extends [002 article-schema](../../002-blog-block-catalog/contracts/article-schema.md). Implementation: Zod in `lib/schema/article.ts`.

## Heading (delta)

```json
{
  "componentType": "Heading",
  "level": 2,
  "content": "Drawbacks and workarounds",
  "id": "drawbacks-and-workarounds"
}
```

| Field | Rules |
|-------|--------|
| `id` | Optional. Non-empty. Bare fragment: no `#`, `/`, or `:`. When omitted, runtime assigns a unique slug from `content`. |

## TableOfContents (new)

```json
{
  "componentType": "TableOfContents",
  "items": [
    { "label": "The problem it solves", "href": "the-problem-it-solves" },
    { "label": "Drawbacks", "href": "drawbacks-and-workarounds" }
  ]
}
```

| Field | Rules |
|-------|--------|
| `items` | Array length ≥ 1 |
| `items[].label` | Non-empty plain text |
| `items[].href` | Non-empty bare id (no `#`, `/`, `:`) |
| Undeclared keys | Rejected (strict) |
| Target existence | **Not** validated at build |

## Catalog count

Ten `componentType`s after this feature: prior nine + `TableOfContents`.

## Showcase fixture

**Amend** `data/articles/speckit.json` (route `/articles/speckit`):

1. Insert a `TableOfContents` block near the top (after intro / before major sections) with ≥3 items.
2. Set explicit `id` on each Heading that TOC items target (and preferably other section Headings for stable deep links).
3. Do **not** create a separate TOC-only demo article.
4. Articles without TOC (e.g. `getting-started`) MUST remain valid and MUST NOT show empty TOC chrome.
