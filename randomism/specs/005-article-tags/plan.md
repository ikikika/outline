# Implementation Plan: Article Tags

**Branch**: `005-article-tags` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-article-tags/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add optional article-level `tags` (lowercase hyphenated identities) to JSON documents. Visitors see a derived display form (`coding-standards` → `Coding Standards`) as MUI chips on the article header and each home listing. The home page shows unique published tags plus a always-visible **Show all** control; `/?tag={identity}` filters the published list (shareable). Activating the selected tag or Show all returns to `/`. No new `componentType`, no tag-archive routes, no new npm packages.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router 15.x (existing)

**Primary Dependencies**: Existing Next.js, React 19, Zod, MUI. **No new packages.** Filter is Server Component + `<Link>` (no Client island).

**Storage**: In-repo JSON at `data/articles/*.json` (schema extended with optional `tags`)

**Testing**: Not required (manual verification via quickstart / acceptance scenarios)

**Target Platform**: Web (blog hosting; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: No extra client JS for tags; home filter from `searchParams` in RSC; article metadata still SSG; keep Chip/Link surface small

**Constraints**: Content–code separation; no new `componentType`; schema before UI; YAGNI; static-first content (local JSON); a11y (no nested links; selected state not color-only); SEO canonical of filtered home remains `/`

**Scale/Scope**: +1 article document field (`tags`); helpers for label display + published tag set; home + article UI; amend all published fixtures (≥2 distinct tags); README authoring note

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Clarified spec (display humanize, Show all always current when unfiltered, selected-tag deactivates); plan + research + data-model + contracts + quickstart produced here; README authoring update identified
- **Content–Code Separation**: ✅ Tags authored only on the article JSON record; no Tags block; home tag list derived from published articles
- **Registry Discipline**: ✅ No `componentType` changes; reusable tag chips live under `components/` (not registry)
- **Schema Before UI**: ✅ Optional `tags` array, kebab-case identity, uniqueness; omit/`[]` valid; unknown keys still rejected
- **Simplicity**: ✅ No tag vocabulary file, no `/tags/[tag]` routes, no new deps; Complexity Tracking justifies query-param home vs client filter
- **Static First**: ✅ Content remains local JSON; no CMS/backend. Home may render per `?tag=` request (see Complexity Tracking); articles stay statically generated
- **Accessibility**: ✅ Real links; `aria-current` on selected filter; humanized accessible names; listing restructure avoids nested interactive controls; keyboard-operable chips
- **Performance**: ✅ No Client Component for filtering; no extra JS on article pages for tags
- **SEO**: ✅ Article `keywords` / topic metadata from tags; home `generateMetadata` keeps canonical `/` even when `?tag=` is present; drafts unchanged (`noindex`)
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build gates unchanged
- **AI Collaboration**: ✅ Scope limited to schema, list helpers, tag UI, home/article pages, fixtures, README, contracts/docs

**Post-design re-check**: ✅ Design artifacts aligned; no unresolved Technical Context unknowns; query-param home documented in Complexity Tracking; no new constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-article-tags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── article-schema.md    # tags field on article document
│   └── home-tag-filter.md   # / and /?tag= URLs, Show all / toggle
└── tasks.md                 # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/
├── page.tsx                      # searchParams.tag; TagFilter + filtered ArticleList; canonical /
└── articles/[slug]/page.tsx      # header chips → /?tag=; keywords metadata
components/
├── ArticleList.tsx               # tags on listings; title link (not full-row button)
├── ArticleTags.tsx               # chip row (display + links)
└── TagFilter.tsx                 # Show all + unique published tags
lib/
├── schema/
│   └── article.ts                # optional tags[] + uniqueness
└── articles/
    ├── list.ts                   # ArticleListItem.tags; optional tag filter
    └── tags.ts                   # formatTagLabel, listPublishedTags, parseTagQuery
data/
└── articles/*.json               # published files gain ≥1 tag; draft omits
README.md                         # authoring: tags field
```

**Structure Decision**: Extend the existing App Router layout in place. Tags are document metadata, not blocks—`registry.ts` unchanged. Pure helpers in `lib/articles/tags.ts` keep display and query parsing out of UI. `TagFilter` and `ArticleTags` are Server Components using MUI `Chip` + Next `Link`. Home listing stops using a full-row `ListItemButton` so tag chips are not nested inside the article link.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Home page reads `searchParams` (may be dynamically rendered) | Spec requires a shareable, reloadable filtered address whose first HTML matches the filter (SC-009) | Client-only `useSearchParams` filter would flash the unfiltered list on shared `/?tag=` URLs; dedicated `/tags/[tag]` static pages are out of spec (FR-016) |
| Home listing is no longer a single full-row link | Spec requires listing tags to be the same filter controls as the all-tags list | Nested `<a>` (chip inside `ListItemButton`/`Link`) is invalid HTML and breaks keyboard/AT |
