# Research: Article Tags

## Tag storage vs display

- **Decision**: Store tags as lowercase kebab-case strings on the article document (`tags?: string[]`). Display via a pure `formatTagLabel`: split on `-`, capitalize the first character of each segment (`coding-standards` → `Coding Standards`; `react` → `React`). No `{ slug, label }` objects and no author-supplied display name.
- **Rationale**: FR-002 / FR-019; uniqueness and `?tag=` identity stay machine-stable; visitors never see hyphens. Content–code separation: one field in JSON.
- **Alternatives considered**: Display as stored (rejected in clarify); nested tag objects (YAGNI, extra authoring); a `data/tags.json` vocabulary (no second use case).

## Schema validation

- **Decision**: Zod on `articleDocumentSchema`:
  - `tags` optional; default `[]` after parse so UI always sees an array
  - each item: `min(1)` and `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
  - `superRefine` uniqueness (case-sensitive; format already lowercase)
  - omit or `[]` valid; empty/whitespace strings fail the regex/`min`
- **Rationale**: FR-003, FR-004, FR-008; matches existing strict-object + build-fail pattern.
- **Alternatives considered**: Required non-empty tags (breaks drafts/omit); coerce/trim/lowercase at parse (hides author mistakes; spec wants reject).

## Shareable filter URL

- **Decision**: Single query param on home: `/?tag={identity}`. Unfiltered home is `/` (no param). Unknown or malformed `tag` values do **not** 404; they yield an empty published list plus the existing tag chrome and “no matching articles” copy. If `tag` is an array (repeated params), use the first string.
- **Rationale**: FR-014, FR-016, FR-017; stays on home; identity matches stored tag.
- **Alternatives considered**: `/tags/[tag]` static archives (out of spec); hash `#tag=` (not reliably shareable without client JS; worse for first paint); client-only filter without URL (fails SC-009).

## Server vs client filter

- **Decision**: Home is a Server Component. Read `searchParams` (Next.js 15 `Promise`), parse `tag`, filter `listPublishedArticles({ tag })` before render. Filter controls are `<Link href="/">` and `<Link href="/?tag=…">`. **No Client Component** for tags.
- **Rationale**: First HTML matches the shared URL (SC-009); constitution Performance (no extra JS); real links for keyboard/AT. Next.js may treat the home route as dynamic because of `searchParams`; content is still local JSON (see plan Complexity Tracking).
- **Alternatives considered**: `useSearchParams` client island (FOUC on shared filtered URLs); `force-static` home (would freeze an empty `tag` at build).

## Show all and toggle hrefs

- **Decision**:
  - Show all: always rendered with the tag list; `href="/"`; `aria-current="page"` when no active tag.
  - Unselected topic tag: `href="/?tag={id}"`.
  - Selected topic tag: `href="/"` (deactivate). Same rule on listing chips.
  - Article-page chips: always `href="/?tag={id}"` (never toggle).
- **Rationale**: Clarify (Show all always current when unfiltered; selected tag deactivates; article tags always apply filter).
- **Alternatives considered**: Show all hidden until filtered (rejected in clarify); selected tag `href="/?tag=id"` no-op (rejected in clarify).

## Unique tag list

- **Decision**: `listPublishedTags()`: from published articles only, unique identities, sort with `localeCompare`. Do not render `TagFilter` when the set is empty (FR-018).
- **Rationale**: Spec assumption (alphabetical, published-only).
- **Alternatives considered**: Frequency order (unstable); include draft-only tags (violates FR-010).

## UI mapping (MUI)

- **Decision**: Reuse `Chip` (already used for Draft). Topic chips: `component={Link}`, `clickable`, `size="small"`, outlined when idle, filled + `color="primary"` when selected, plus `aria-current="page"` so selection is not color-only. Draft chip stays `color="warning"` and is **not** a link. Wrap groups in `<nav aria-label="Filter articles by tag">` (home filter) and `<ul>`/`<nav aria-label="Topics">` (per-article tags). Accessible name = `formatTagLabel` (Show all uses the literal “Show all”).
- **Rationale**: Matches existing compact header chrome; FR-013 selected state; a11y.
- **Alternatives considered**: Raw text links (weaker selected affordance); buttons + client navigation (more JS).

## Home listing structure (nested links)

- **Decision**: Stop using `ListItemButton component={Link}` for the whole row. Use a `ListItem` (or `Stack`) with: title as `Link` to the article, description/date as text, `ArticleTags` as sibling links. Clicking a listing tag must not also follow the article href.
- **Rationale**: Nested interactive content is invalid and fails keyboard/AT; FR-006 requires listing tags to be real filter controls.
- **Alternatives considered**: `stopPropagation` on chips inside a row link (still nested `<a>`); listing tags display-only (violates FR-006).

## SEO metadata

- **Decision**: Article `generateMetadata`: keep title, description, canonical `/articles/{slug}`, Open Graph. When `tags.length > 0`, set `keywords` to the stored identities and Open Graph `type: "article"`. Home: add `generateMetadata` that always sets `alternates.canonical` to `/` regardless of `searchParams.tag` (filtered view is not a separate document). Do not `noindex` home.
- **Rationale**: FR-011; constitution SEO Completeness.
- **Alternatives considered**: `noindex` on `/?tag=` (unnecessary if canonical is `/`; risk of over-blocking); `article:tag` meta only (Next `keywords` is enough and simpler).

## Fixtures

- **Decision**: Add ≥1 tag to every published article; omit tags on `draft-example.json`. Use at least two distinct identities across the set (in practice more). Suggested assignments (implementer may adjust wording if a better fit is obvious, but must keep ≥2 distinct published tags):

  | File | Tags |
  |------|------|
  | `welcome.json` | `randomism` |
  | `getting-started.json` | `randomism`, `authoring` |
  | `speckit.json` | `spec-kit`, `process` |
  | `solid-principles.json` | `software-design`, `react` |
  | `react-fundamentals.json` | `react` |
  | `coding-standards-react.json` | `react`, `coding-standards` |
  | `quiet-habits-that-sabotage-progress.json` | `habits` |
  | `draft-example.json` | omit |

- **Rationale**: FR-012; no tags-only demo article.
- **Alternatives considered**: One shared tag on every post (filter would not change the list enough to demonstrate SC-007).

## Dependencies

- **Decision**: No new npm packages.
- **Rationale**: Constitution Simplicity.
- **Alternatives considered**: Tag/cloud libraries (unnecessary).
