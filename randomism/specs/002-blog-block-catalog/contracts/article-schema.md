# Contract: Article JSON Schema (extended)

Extends foundation contract in `specs/001-content-page-foundation/contracts/article-schema.md`. Implementation: Zod in `lib/schema/article.ts`.

## Article document

Top-level fields unchanged. `blocks` may include new variants.

## Block variants (complete catalog)

| componentType | Fields | Prose mode |
|---------------|--------|------------|
| `Heading` | `level` (1–6), `content` | Plain |
| `Paragraph` | `content` | Full Markdown |
| `Image` | `content.src`, `content.alt` | Plain (`alt`) |
| `CodeBlock` | `code`, optional `language` | Literal (`code`) |
| `Accordion` | `sections[]` of `{ title, body, defaultOpen? }` | Full Markdown (`title`, `body`) |
| `Blockquote` | `text`, optional `cite` | Full (`text`); plain (`cite`) |
| `List` | `ordered`, `items[]` | Inline Markdown (`items`) |
| `Callout` | `variant` (`info`\|`tip`\|`warning`), `body` | Full Markdown |
| `Divider` | *(none)* | — |

## Showcase fixture

Canonical sample: `data/articles/getting-started.json` (route `/articles/getting-started`). It MUST include every `componentType` plus Markdown in at least one Paragraph and one other prose field. Do **not** add a separate `block-catalog.json`.

Abbreviated shape (full file is the source of truth):

```json
{
  "published": true,
  "publishDate": "2026-08-01",
  "title": "Getting Started with Content Blocks",
  "description": "How every Randomism block type composes an article body, including Markdown prose.",
  "ogImage": "/images/getting-started.svg",
  "blocks": [
    {
      "componentType": "Heading",
      "level": 1,
      "content": "Getting Started with Content Blocks"
    },
    {
      "componentType": "Paragraph",
      "content": "Prose accepts **Markdown**, [links](https://example.com), and `inline code`."
    },
    {
      "componentType": "Image",
      "content": {
        "src": "/images/getting-started.svg",
        "alt": "Diagram-like illustration of stacked content blocks"
      }
    },
    {
      "componentType": "CodeBlock",
      "language": "ts",
      "code": "const greeting = \"hello\";\nconsole.log(greeting);"
    },
    {
      "componentType": "Accordion",
      "sections": [
        {
          "title": "Why **JSON** blocks?",
          "body": "Content stays under `data/articles/`.",
          "defaultOpen": true
        },
        {
          "title": "Section two",
          "body": "Starts collapsed."
        }
      ]
    },
    {
      "componentType": "Blockquote",
      "text": "Prefer a *small* set of blocks.",
      "cite": "Randomism constitution"
    },
    {
      "componentType": "List",
      "ordered": false,
      "items": ["First **item**", "Second with `code`"]
    },
    {
      "componentType": "Callout",
      "variant": "tip",
      "body": "Callout body supports **Markdown**."
    },
    {
      "componentType": "Divider"
    },
    {
      "componentType": "Paragraph",
      "content": "After the divider."
    }
  ]
}
```

## Rules (additive)

| Rule | Behavior |
|------|----------|
| Empty `CodeBlock.code` | Reject |
| Empty `Accordion.sections` or empty section `title`/`body` | Reject |
| Empty `List.items` or empty item string | Reject |
| Unknown `Callout.variant` | Reject |
| Extra properties on any block | Reject |
| Raw HTML in Markdown fields | Allowed in JSON string; **not** rendered as HTML elements at display time (see [markdown.md](./markdown.md)) |
| Markdown validity | Not schema-validated; renderer must not crash |

## Unchanged rules

Unknown properties on article; `published: true` requires `publishDate`; empty `blocks` rejected; slug from filename only.
