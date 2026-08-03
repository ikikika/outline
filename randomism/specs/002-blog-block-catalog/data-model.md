# Data Model: Blog Block Catalog

Extends [001 data-model](../001-content-page-foundation/data-model.md). ArticleFile, listing, SiteConfig, and draft/published rules are unchanged unless noted.

## Entities

### ArticleFile

Unchanged top-level fields (`published`, `publishDate`, `title`, `description`, `ogImage`, `blocks`).  
`blocks` may now include the new block variants below. Metadata strings remain plain text (not Markdown-rendered in `<title>` / meta).

### Block (discriminated union)

`componentType` ∈  
`Heading` | `Paragraph` | `Image` | `CodeBlock` | `Accordion` | `Blockquote` | `List` | `Callout` | `Divider`

Unknown keys → validation failure. Unknown `componentType` → validation failure.

---

#### Heading *(unchanged shape; plain text)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `level` | 1–6 | yes | |
| `content` | non-empty string | yes | **Plain text** — no Markdown |

#### Paragraph

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content` | non-empty string | yes | **Full CommonMark** Markdown |

#### Image *(unchanged)*

| Field | Type | Required |
|-------|------|----------|
| `content.src` | non-empty string | yes |
| `content.alt` | non-empty string | yes (plain text) |

#### CodeBlock

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | non-empty string | yes | **Literal** — never Markdown |
| `language` | string | no | Display label only; empty string rejected if present (omit or non-empty) |

#### Accordion

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sections` | AccordionSection[] | yes | Length ≥ 1 |

**AccordionSection**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | non-empty string | yes | **Full CommonMark** Markdown |
| `body` | non-empty string | yes | **Full CommonMark** Markdown |
| `defaultOpen` | boolean | no | Default `false` (collapsed) |

Nested Accordion blocks inside `body` are not supported (`body` is Markdown, not a block tree).

#### Blockquote

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | non-empty string | yes | **Full CommonMark** Markdown |
| `cite` | non-empty string | no | **Plain text** attribution |

#### List

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ordered` | boolean | yes | `true` → `<ol>`, `false` → `<ul>` |
| `items` | string[] | yes | Length ≥ 1; each item non-empty; **inline Markdown** only |

#### Callout

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `variant` | `"info"` \| `"tip"` \| `"warning"` | yes | Fixed set |
| `body` | non-empty string | yes | **Full CommonMark** Markdown |

#### Divider

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| *(none beyond `componentType`)* | | | Renders `<hr>` |

---

### Markdown field modes

| Mode | Fields | Behavior |
|------|--------|----------|
| Full | Paragraph `content`; Accordion `title`/`body`; Blockquote `text`; Callout `body` | CommonMark block + inline constructs; raw HTML not rendered as elements |
| Inline | List `items[]` | Phrasing only (emphasis, links, inline code, breaks) |
| None | Heading `content`; CodeBlock `code`; Image `alt`; Blockquote `cite`; article `title`/`description` | Literal / plain |

Malformed Markdown does not fail schema validation; renderer degrades gracefully.

### ArticleListItem / SiteConfig

Unchanged from foundation.

## Relationships

- Article `blocks` → registry renderers (nine types).
- Accordion `sections` → ordered disclosure widgets (not separate routes).
- Markdown helper → used by Paragraph, Accordion, Blockquote, List items, Callout (not a block entity).

## Validation rules (additive)

1. All foundation rules still apply.
2. `CodeBlock.code` min length 1.
3. `Accordion.sections` min length 1; each `title`/`body` min length 1.
4. `List.items` min length 1; each item min length 1; `ordered` required boolean.
5. `Callout.variant` must be one of `info` | `tip` | `warning`.
6. `Divider` has no extra properties (strict).
7. Strict objects on all new block shapes.

## State

Article draft/published/missing unchanged. Accordion section open/closed is ephemeral UI state (`defaultOpen` only seeds initial open attribute).
