# Contract: Article JSON Schema

Logical schema for `data/articles/{slug}.json`. Implementation uses Zod equivalents in `lib/schema/article.ts` (see data-model.md).

## Article document

```json
{
  "published": true,
  "publishDate": "2026-08-01",
  "title": "Welcome to Randomism",
  "description": "An introduction to the Randomism blog.",
  "ogImage": "/images/welcome-og.jpg",
  "blocks": [
    {
      "componentType": "Heading",
      "level": 1,
      "content": "Welcome to Randomism"
    },
    {
      "componentType": "Paragraph",
      "content": "This site is driven by JSON articles."
    },
    {
      "componentType": "Image",
      "content": {
        "src": "/images/welcome.jpg",
        "alt": "Abstract illustration for the welcome post"
      }
    }
  ]
}
```

## Draft example (valid, not listed)

```json
{
  "published": false,
  "title": "Work in progress",
  "description": "Draft article not yet public.",
  "blocks": [
    {
      "componentType": "Paragraph",
      "content": "This draft validates but is not routed or listed."
    }
  ]
}
```

## Rules

| Rule | Behavior |
|------|----------|
| Unknown properties | Reject |
| Missing required fields | Reject |
| `published: true` without `publishDate` | Reject |
| `published: false` without `publishDate` | Allow |
| Empty `blocks` | Reject |
| Unknown `componentType` | Reject |
| Image without `alt` or `src` | Reject |
| Slug | From filename only; not a JSON field |

## Block variants

| componentType | Fields |
|---------------|--------|
| `Heading` | `level` (1–6), `content` (string) |
| `Paragraph` | `content` (string) |
| `Image` | `content.src`, `content.alt` |
