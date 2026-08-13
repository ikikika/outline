# Implementation Plan: Multi-Tag Filter

**Branch**: `006-multi-tag-filter` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-multi-tag-filter/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Extend the existing home tag filter so visitors can select **multiple** tags (add/remove) and switch **match mode** between **AND** (default; omit from URL) and **OR** (`match=or`). Filtering stays on `/` via repeated `tag` query params. No schema or content-fixture changes. Server Components + `<Link>` only; no new packages.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router 15.x (existing)

**Primary Dependencies**: Existing Next.js, React 19, Zod, MUI. **No new packages.**

**Storage**: Unchanged `data/articles/*.json` (article `tags` field from 005)

**Testing**: Not required (manual verification via quickstart)

**Target Platform**: Web (blog; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: No Client Component for filtering; home remains RSC + `searchParams`; small Chip/Link surface

**Constraints**: Extends 005 contracts; no `/tags/` routes; no new `componentType`; canonical `/`; default AND; empty selection resets mode to AND; article chips set single-tag AND

**Scale/Scope**: Update `lib/articles/tags.ts`, `lib/articles/list.ts`, `TagFilter`, `ArticleTags`, `ArticleList`, `app/page.tsx`; contract + README note for multi-tag URLs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Clarified multi-tag + OR/AND spec; plan + research + data-model + contracts + quickstart here; README authoring/filter note if URLs change for contributors
- **Content–Code Separation**: ✅ No content schema change; filter is app chrome over existing JSON tags
- **Registry Discipline**: ✅ No `componentType` changes
- **Schema Before UI**: ✅ N/A for article document (unchanged); query contract documented
- **Simplicity**: ✅ No new deps; extend existing helpers/UI; Complexity Tracking only if needed (none beyond 005’s dynamic home)
- **Static First**: ✅ Local JSON; home already dynamic for `searchParams`
- **Accessibility**: ✅ Multi-selected chips + match-mode control with non-color current state; keyboard Links
- **Performance**: ✅ No Client island for filter/mode
- **SEO**: ✅ Home canonical `/`; articles unchanged
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build
- **AI Collaboration**: ✅ Touch only filter-related files + docs

**Post-design re-check**: ✅ Design artifacts aligned; URL + match helpers specified; no unresolved Technical Context unknowns.

## Project Structure

### Documentation (this feature)

```text
specs/006-multi-tag-filter/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── home-tag-filter.md   # multi-tag + match mode delta over 005
└── tasks.md                 # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/
└── page.tsx                 # parse tags[] + match; pass to TagFilter / ArticleList
components/
├── TagFilter.tsx            # multi-select hrefs + Match any / Match all control
├── ArticleTags.tsx          # toggle against selectedTags[]; apply stays single-tag
└── ArticleList.tsx          # pass selectedTags (rename from activeTag)
lib/
└── articles/
    ├── tags.ts              # parseTagSelection, parseMatchMode, buildHomeFilterHref, …
    └── list.ts              # filter by tags[] + mode and/or
README.md                    # brief note: multi-tag + match=or
```

**Structure Decision**: Evolve the 005 home-filter stack in place. Centralize href building in `lib/articles/tags.ts` so TagFilter and ArticleTags stay consistent. Article-page `linkMode="apply"` keeps `/?tag={id}` only (AND default).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none new) | — | 005 already justified dynamic home for shareable `?tag=`; this feature only expands query shape |
