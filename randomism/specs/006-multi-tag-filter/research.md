# Research: Multi-Tag Filter

## Query shape for multiple tags

- **Decision**: Use **repeated** `tag` query params: `/?tag=react&tag=habits`. Identities are deduped and sorted with `localeCompare` when building hrefs so shared URLs are stable. Empty selection → `/` (no `tag` params).
- **Rationale**: Natural for `searchParams.tag` as `string | string[]` in Next.js 15; extends 005’s single `tag` without a new param name; one-tag URLs stay `/?tag=react` (backward compatible).
- **Alternatives considered**: Comma-separated `?tag=a,b` (harder to encode/edge-case hyphens); `?tags=` array name (breaks existing single-tag links from 005).

## Match mode in the URL

- **Decision**: Query param `match`. Values: omit or anything other than `or` → **AND** (default). Explicit `match=or` → **OR**. Unknown values → AND. When building hrefs: include `match=or` only if mode is OR; never emit `match=and`.
- **Rationale**: Spec FR-005 / clarify (default AND; OR must be explicit). Short and readable.
- **Alternatives considered**: `mode=and|or` always present (noisier for default); path segments (out of scope / archive-like).

## Filtering logic

- **Decision**: `listPublishedArticles({ tags?: string[]; match?: "and" | "or" })`:
  - `tags` empty/undefined → all published (ignore match).
  - `match === "or"` → article if `tags.some(t => article.tags.includes(t))`.
  - else (`and`) → article if `tags.every(t => article.tags.includes(t))`.
  - Unknown identities in `tags` still participate: AND with an unknown → empty; OR with unknown + valid → valid-only effectively if unknown never matches.
- **Rationale**: FR-002; published-only already enforced in list helper.
- **Alternatives considered**: Filter unknowns out before match (also fine; plan: filter to identities that appear in `listPublishedTags()` when parsing for **selection UI**, but matching may still receive stale ids from URL — stale ids simply fail `includes`).

## Parsing selection vs UI chips

- **Decision**:
  - `parseTagSelection(tag: string | string[] | undefined): string[]` — normalize to unique non-empty strings (preserve first-seen order from query, then sort for href building separately).
  - For **which chips appear selected**, only identities in `listPublishedTags()` count as selected (stale ids do not create chips; FR edge case).
  - For **list filtering**, apply match against the full parsed selection (including stale) so AND+stale → empty list as specified.
- **Rationale**: Spec: ignore unknowns for chips; still safe empty/partial results.
- **Alternatives considered**: Drop stale before filter (would show full list under AND+stale — worse).

## Href builders (add / remove / mode)

- **Decision**: Pure helpers in `lib/articles/tags.ts`:
  - `buildHomeFilterHref({ tags: string[]; match: "and" | "or" }): string`
  - `toggleTagInSelection(selected: string[], identity: string): string[]` — add if absent, remove if present; empty → []
  - When selection becomes `[]`, href is `/` and match forced to `and` (do not keep `match=or` on empty).
  - Mode switch links: same tags, flip match (if tags empty, mode links still target `/` with AND, or `/?match=or` only if we allow OR with empty selection — **Decision**: empty selection always `/` with AND; mode control when empty shows AND current; activating OR with zero tags is a no-op staying on `/` **or** sets `/?match=or` with empty tags still showing all articles. Spec: empty selection shows all articles either way. Prefer: with empty tags, both mode controls href `/` for AND current and `/?match=or` for OR current so mode is shareable even before picking tags; list still full. Clearing tags while in OR goes to `/` (AND), not `/?match=or`.
- **Rationale**: FR-014 reset on empty; FR-002 empty list = all published; mode visible when empty (assumption).
- **Alternatives considered**: Hide mode until ≥1 tag (rejected by spec assumption).

## UI: TagFilter + match control

- **Decision**: Keep Show all + topic Chips. Selected = identity ∈ selectedPublishedTags. Unselected tag href = `buildHomeFilterHref` with tag added (keep current match). Selected tag href = remove that tag (if last → `/`). Add a compact control group labeled accessibly (e.g. nav or radiogroup): **Match all** (AND) and **Match any** (OR) as Chip+Link (or ToggleButton-styled chips):
  - Match all current when `match==="and"`; href = same tags without `match` (or omit param).
  - Match any current when `match==="or"`; href = same tags + `match=or`.
  - With zero tags: Match all → `/`; Match any → `/?match=or`.
- **Rationale**: Mirrors existing Chip pattern; no Client Component; FR-008.
- **Alternatives considered**: MUI ToggleButtonGroup client (extra JS); native `<select>` (weaker multi-current affordance).

## ArticleTags toggle / apply

- **Decision**: Replace `activeTag?: string` with `selectedTags?: string[]` (and `match?: "and" | "or"` for toggle hrefs). `linkMode="toggle"`: selected if `selectedTags.includes(id)`; href uses `toggleTagInSelection` + current match. `linkMode="apply"`: always `/?tag={id}` only (single tag, AND default) — no `match=or`.
- **Rationale**: FR-006 / FR-007.
- **Alternatives considered**: Article chips merge into existing multi-selection (rejected in spec).

## Backward compatibility

- **Decision**: `/?tag=react` still works (one-element selection, AND). Old bookmarks remain valid. `parseTagQuery` may be removed or become a thin wrapper around `parseTagSelection()[0]`.
- **Rationale**: 005 URLs must not break.
- **Alternatives considered**: New param only (breaks existing chip links until rewritten — we rewrite all builders together).

## Dependencies

- **Decision**: No new npm packages.
- **Rationale**: Constitution Simplicity.
