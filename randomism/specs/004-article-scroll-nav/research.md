# Research: Article Scroll Navigation

## Back-to-top implementation

- **Decision**: Mount a Client Component `BackToTop` only from `app/articles/[slug]/page.tsx`. Show after `window.scrollY` exceeds ~one viewport (`window.innerHeight`, clamped with a sensible minimum ~320px). On activate: `window.scrollTo({ top: 0, behavior })` where `behavior` is `"smooth"` unless `prefers-reduced-motion: reduce`, then `"auto"`; clear hash via `history.replaceState` / `window.history.replaceState` keeping pathname+search without `#…`. Use MUI `Fab` or `IconButton` with accessible name “Back to top”; fixed bottom-end placement; hide when below threshold (and when page cannot scroll meaningfully).
- **Rationale**: Matches FR-001–003, FR-009, FR-012 and clarify (clear hash). Article-only mount keeps home free of the island. Existing article `pb: "100px"` leaves room for a FAB.
- **Alternatives considered**: `<a href="#">` only (no threshold, poor hash semantics); always-visible control (dominates first viewport); App Router `useRouter` hash APIs (unnecessary for clearing fragment); third-party scroll libs (YAGNI).

## TOC / in-page links

- **Decision**: `TableOfContents` is a Server Component rendering `<nav aria-label="On this page">` + semantic list of `<a href={"#" + item.href}>`. Labels are plain text (not Markdown) for predictable accessible names. Native navigation updates the URL fragment (FR-008). No IntersectionObserver / scroll-spy (clarify). Unresolved targets render the same link; browser no-ops or lands nowhere harmful (FR-013); **do not** cross-check targets in Zod (clarify).
- **Rationale**: Content–code separation; minimal JS; shareable hashes; constitution Performance.
- **Alternatives considered**: Auto-generated TOC from all Headings (rejected by spec assumptions / opt-in block); Client click handlers + `scrollIntoView` only (duplicates native hash behavior); scroll-spy highlight (out of scope).

## Heading fragment ids

- **Decision**: Schema: optional `id` on Heading — non-empty string matching bare fragment pattern (see data-model); reject `#` and whitespace-heavy junk. At render time, run a pure `assignHeadingIds(blocks)` that: (1) uses explicit `id` when present; (2) otherwise slugifies `content` (lowercase, ASCII-ish hyphenation); (3) suffixes `-2`, `-3`, … for collisions within the article. Pass resolved id into Heading renderer as `id` on the heading element. Authors writing TOC items SHOULD set explicit Heading `id`s for stable deep links (documented in contracts); fixtures use explicit ids.
- **Rationale**: FR-007 uniqueness; authors can pin public fragments; derived ids work without forcing every heading to declare `id`.
- **Alternatives considered**: Require `id` on every Heading (authoring friction); only explicit ids (TOC breaks if omitted); UUID ids (not human/shareable).

## TOC item `href` validation

- **Decision**: Field name `href` stores **bare id only**. Zod: `min(1)`, reject if value includes `#`, `/`, or `:` (blocks hashes and URLs). No article-wide existence check against Heading ids.
- **Rationale**: Clarify Q3 + Q1; FR-005 / FR-010.
- **Alternatives considered**: Accept `#id` and strip (ambiguous authoring); build-time existence check (rejected in clarify).

## Smooth scroll & reduced motion

- **Decision**: Prefer document-level CSS:

  ```css
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
  ```

  Plus the same preference check inside `BackToTop`’s `scrollTo`. TOC relies on native hash navigation + CSS smooth scroll.
- **Rationale**: FR-009 / SC-005 with one shared preference path; works for deep links on load too.
- **Alternatives considered**: JS-only smooth scroll on every TOC click (more client surface); ignore reduced motion (a11y fail).

## Fixture choice

- **Decision**: **Amend** `data/articles/speckit.json` (route `/articles/speckit`) with a `TableOfContents` near the top (≥3 items) and explicit `id`s on target Headings. Do **not** create a separate TOC demo article. `getting-started` omits TOC to prove empty-chrome absence (SC-003).
- **Rationale**: Spec amendment FR-015 — reuse the existing long Spec Kit post; no extra sample article.
- **Alternatives considered**: Dedicated `toc-navigation-demo.json` (rejected by latest specify follow-up); SOLID-only edit (Spec Kit preferred as the showcase file).

## Dependencies

- **Decision**: No new npm packages. Use existing MUI for the control.
- **Rationale**: Constitution Simplicity / Performance.
- **Alternatives considered**: `react-scroll` / TOC libraries (overkill, scroll-spy temptation).
