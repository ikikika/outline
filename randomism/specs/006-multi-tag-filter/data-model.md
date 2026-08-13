# Data Model: Multi-Tag Filter

Extends the runtime filter model from [005 data-model](../005-article-tags/data-model.md). **ArticleFile schema unchanged.**

## Entities

### Tag selection (ephemeral)

| Field | Type | Notes |
|-------|------|-------|
| `identities` | string[] | Parsed from repeated `tag` query params; unique; may include stale ids |
| `publishedSelected` | string[] | `identities` ∩ `listPublishedTags()` — drives chip selected state |

Empty `identities` ⇒ unfiltered (Show all).

### Match mode (ephemeral)

| Value | URL | Meaning |
|-------|-----|---------|
| `and` | omit `match` (default) | Article must include **every** identity in `identities` |
| `or` | `match=or` | Article must include **at least one** identity in `identities` |

When `identities` is empty, mode is forced to `and` for display after clear; list shows all published regardless of mode. Visitor may still open `/?match=or` with no tags (full list; Match any current).

### ArticleListItem

Unchanged shape from 005 (`tags: string[]` on each item). Filtering input changes from single `tag?` to `{ tags?: string[]; match?: "and" | "or" }`.

### Home filter address

| Example | Selection | Mode |
|---------|-----------|------|
| `/` | [] | and |
| `/?tag=react` | [react] | and |
| `/?tag=habits&tag=react` | [habits, react] (sorted in built hrefs) | and |
| `/?tag=habits&tag=react&match=or` | [habits, react] | or |
| `/?match=or` | [] | or (list still all published) |

Canonical document URL remains `/`.

## Relationships

- Selection + mode → filters published `ArticleListItem`s
- `publishedSelected` → which topic chips show as current
- Article-page apply link → selection `[id]`, mode `and`

## State transitions

| Event | Selection | Mode |
|-------|-----------|------|
| Activate unselected tag | add identity | unchanged (still and if was empty→and) |
| Activate selected tag | remove identity | if empty → **and** |
| Show all | [] | **and** |
| Choose Match all | unchanged | **and** |
| Choose Match any | unchanged | **or** |
| Article topic chip | `[id]` | **and** |

## Validation

- No article JSON changes.
- Query parsing: non-string entries ignored; duplicates collapsed; empty strings dropped.
- Unknown `match` → `and`.
