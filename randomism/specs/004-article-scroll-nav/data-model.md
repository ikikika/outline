# Data Model: Article Scroll Navigation

Extends [002 data-model](../002-blog-block-catalog/data-model.md) / foundation ArticleFile. Listing and SiteConfig unchanged.

## Entities

### ArticleFile

Unchanged top-level fields. `blocks` may include `TableOfContents`. Heading blocks MAY include optional `id`.

### Block (discriminated union)

`componentType` ∈  
`Heading` | `Paragraph` | `Image` | `CodeBlock` | `Accordion` | `Blockquote` | `List` | `Callout` | `Divider` | **`TableOfContents`**

---

#### Heading *(extended)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `level` | 1–6 | yes | Unchanged |
| `content` | non-empty string | yes | **Plain text** — no Markdown |
| `id` | non-empty string | no | Bare fragment id for the heading element. MUST NOT contain `#`, `/`, or `:`. When omitted, runtime derives a unique slug from `content` within the article |

---

#### TableOfContents *(new)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `items` | TocItem[] | yes | Length ≥ 1 |

**TocItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `label` | non-empty string | yes | **Plain text** (accessible link name) |
| `href` | non-empty string | yes | **Bare fragment id only** (no `#`, no URL). Renderer emits `href="#…"`. Existence of a matching Heading id is **not** validated at build |

Unknown keys on block or item → validation failure. Empty `items` → validation failure.

---

### BackToTop *(not content)*

Not part of ArticleFile. Ephemeral UI state: visible after scroll threshold; activation scrolls to top and clears URL hash. No persistence.

## Relationships

- `TableOfContents.items[].href` → intended match for a Heading’s resolved `id` (explicit or derived) in the **same** article; soft relationship (no schema FK).
- Article page → mounts `BackToTop` chrome independently of blocks.
- `assignHeadingIds(blocks)` → produces resolved ids consumed by Heading renderers; TOC does not auto-rewrite author `href` values.

## Validation rules (additive)

1. All prior catalog rules still apply.
2. Heading.`id` if present: min length 1; reject if includes `#`, `/`, or `:`.
3. `TableOfContents.items` min length 1; each `label`/`href` min length 1; `href` rejects `#`, `/`, `:`.
4. Unresolved `href` (no matching heading id) does **not** fail validation.
5. Strict objects on Heading (with optional id) and TableOfContents / TocItem.

## State

- TOC link “current” section highlighting: **not modeled** (out of scope).
- Back-to-top visibility: client-only ephemeral state.
- URL hash: browser address bar; cleared on back-to-top; set by activating TOC links / deep links.
