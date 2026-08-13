---
description: "Task list for Multi-Tag Filter implementation"
---

# Tasks: Multi-Tag Filter

**Input**: Design documents from `/specs/006-multi-tag-filter/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: **No** article schema or fixture changes. **No** new `componentType` / registry work. Filter is app chrome over existing `tags`.

**Article/page quality tasks**: Home canonical remains `/`; a11y for multi-selected chips + Match all / Match any; Server Components + `<Link>` only (no Client island for filter/mode).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `lib/articles/`, `README.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm layout; no new packages

- [x] T001 Verify feature paths from `specs/006-multi-tag-filter/plan.md` exist (`app/page.tsx`, `components/TagFilter.tsx`, `components/ArticleTags.tsx`, `components/ArticleList.tsx`, `lib/articles/tags.ts`, `lib/articles/list.ts`, `README.md`) and confirm no new npm dependencies are required in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Multi-tag parse + href helpers and list filtering shared by every story; MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Extend `lib/articles/tags.ts` per `specs/006-multi-tag-filter/data-model.md` and `contracts/home-tag-filter.md`: add `parseTagSelection` (all `tag` query values → unique non-empty strings), `parseMatchMode` (`match=or` → `"or"`, else `"and"`; unknown → `"and"`), `buildHomeFilterHref({ tags, match })` (sorted tags via `localeCompare`; omit `match` when `"and"`; empty tags → `/` or `/?match=or` only when OR with no tags), and `toggleTagInSelection(selected, id)` (add if absent, remove if present); keep `formatTagLabel` / `listPublishedTags`; deprecate or stop using single-value `parseTagQuery` for home once callers migrate
- [x] T003 Extend `lib/articles/list.ts`: change `listPublishedArticles` filter options from `{ tag?: string }` to `{ tags?: string[]; match?: "and" | "or" }` (default match `"and"`); when `tags` is non-empty, AND = article includes every identity, OR = article includes at least one; empty/`undefined` tags → all published; stale identities still participate in matching (AND+stale → empty list, not throw)

**Checkpoint**: Helpers build correct multi-tag URLs and filter AND/OR; existing single `?tag=` still parseable as one-element selection

---

## Phase 3: User Story 1 - Filter the home list with several topics (Priority: P1) 🎯 MVP

**Goal**: Home TagFilter supports additive multi-select, Show all (clears to `/` + AND), and Match all / Match any. `app/page.tsx` parses repeated `tag` + `match`, filters via `listPublishedArticles`, keeps canonical `/`. Multiple chips may be `aria-current`; mode control not color-only.

**Independent Test**: On `/`, select A then B under default AND — both current; URL has two `tag`s and no `match=or`; list is intersection (or empty). Switch to Match any — `match=or`; union list; tags unchanged. Deselect A; only B remains. Show all or last-tag off → `/`, Match all current. Reload multi-tag OR URL → same selection, mode, list. Quickstart scenarios 1–4, 7–8.

### Implementation for User Story 1

- [x] T004 [US1] Update Server Component `components/TagFilter.tsx`: accept `selectedTags: string[]` (published-selected) and `match: "and" | "or"` instead of single `activeTag`; Show all `href="/"` current when selection empty; unselected topic → `buildHomeFilterHref` with selection ∪ {id} and current match; selected topic → selection ∖ {id} (empty → `/`); add Match all / Match any controls (accessible names; exactly one current; Match all = same tags without `match`, Match any = same tags + `match=or`, including `/?match=or` when no tags); return `null` when no published tags; wrap so chips wrap on narrow viewports per `contracts/home-tag-filter.md`
- [x] T005 [US1] Update `app/page.tsx`: read `searchParams`; `parseTagSelection` + `parseMatchMode`; compute `publishedSelected` as selection ∩ `listPublishedTags()`; call `listPublishedArticles({ tags: selection identities (or published-only per research — use full parsed identities for filter per data-model), match })`; pass `selectedTags` + `match` to `TagFilter`; keep `generateMetadata` canonical `/`; keep distinct empty copy when filter active vs unfiltered empty; do not yet change listing-chip multi-select (US2) beyond compiling with new TagFilter props — temporarily keep listing chips working with single-tag or pass through props stub if required

**Checkpoint**: MVP — multi-tag + AND/OR works from the all-tags filter even if listing chips still behave like single-tag until US2

---

## Phase 4: User Story 2 - Listing chips respect multi-select (Priority: P2)

**Goal**: Home listing topic chips use the same add/remove href rules as TagFilter (toggle against current selection + mode).

**Independent Test**: Unfiltered → listing chip sets that tag alone. With A selected → listing B adds A+B. With A+B → listing A removes only A. Quickstart scenario 5.

### Implementation for User Story 2

- [x] T006 [US2] Update `components/ArticleTags.tsx` `linkMode: "toggle"`: accept `selectedTags: string[]` and `match: "and" | "or"`; build hrefs via `toggleTagInSelection` + `buildHomeFilterHref` (same as TagFilter topic chips); mark chips current when id ∈ `selectedTags`; keep `linkMode: "apply"` as always `/?tag={id}` (US3)
- [x] T007 [US2] Update `components/ArticleList.tsx`: rename/replace `activeTag` with `selectedTags` + `match`; pass both into `ArticleTags` with `linkMode="toggle"`; preserve no-nested-anchors layout (title `Link` sibling to chips)

**Checkpoint**: Listing chips and TagFilter stay in sync for multi-select

---

## Phase 5: User Story 3 - Article-page tags start a focused filter (Priority: P3)

**Goal**: Article-page chips still land on `/?tag={id}` only (single tag, AND default); no merge with prior multi-selection.

**Independent Test**: From a tagged article, activate a chip → home with only that tag; Match all current. Second chip would open only that other tag. Quickstart scenario 6.

### Implementation for User Story 3

- [x] T008 [P] [US3] Confirm `app/articles/[slug]/page.tsx` still renders `ArticleTags` with `linkMode="apply"` only (no `selectedTags`/`match` required); each chip `href` is exactly `/?tag={id}` with no `match=or`; no regression to draft Chip / keywords metadata

**Checkpoint**: Article “more like this topic” jump remains single-tag AND

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, a11y, lint, quickstart verification

- [x] T009 [P] Document multi-tag home URLs and `match=or` (default AND omitted) briefly in `README.md` near existing `tags` authoring notes
- [x] T010 Verify keyboard reachability and non-color current state for Show all, multi-selected tags, Match all, and Match any in `components/TagFilter.tsx` (and listing toggle chips); no Client Component introduced for filtering
- [x] T011 Run `npm run lint` and `npm run build`; fix any type/lint issues from API renames (`activeTag` → `selectedTags`, list filter options)
- [x] T012 Manually walk `specs/006-multi-tag-filter/quickstart.md` scenarios 1–8 (AND add, OR switch, remove/clear, shareable URL, listing chips, article chip, keyboard, stale tag)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on US1 TagFilter/page wiring (shared selection props); can start after T005
- **US3 (Phase 5)**: Independent of US2 if `apply` mode left untouched; verify after helpers exist (T002+)
- **Polish (Phase 6)**: After US1–US3 implementation complete

### User Story Dependencies

- **US1 (P1)**: Foundational only — delivers multi-tag + match mode on home filter
- **US2 (P2)**: Needs US1 selection model on page; listing chips reuse helpers
- **US3 (P3)**: Mostly confirmation; `apply` href contract must stay single-tag

### Within Each User Story

- Helpers (Phase 2) before UI
- TagFilter + page before listing chips
- Polish last

### Parallel Opportunities

- After T001: T002 then T003 (T003 can follow T002 closely; limited parallel)
- T008 [P] with US2 if `apply` path unchanged
- T009 [P] alongside T010–T011 once behavior is stable

---

## Parallel Example: User Story 1

```text
# After Phase 2:
T004 TagFilter multi-select + match controls
T005 page.tsx wiring (after or with T004 once props exist)
```

## Parallel Example: User Story 2

```text
# After T005:
T006 ArticleTags toggle multi-select
T007 ArticleList pass selectedTags + match
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1–2 (helpers + list filter)
2. Complete Phase 3 (TagFilter + home page)
3. **STOP and VALIDATE**: Quickstart 1–4 (multi-tag AND/OR, clear, share)
4. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → filter API ready
2. US1 → multi-tag home filter (MVP)
3. US2 → listing chips match multi-select
4. US3 → confirm article apply links
5. Polish → README, a11y, lint, build, full quickstart

### Suggested MVP Scope

**User Story 1 only** (T001–T005): multi-select + Match all / Match any on the home TagFilter with shareable URLs.

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- [Story] label required for user-story phases only
- Prefer `buildHomeFilterHref` for all home filter links (TagFilter + toggle chips)
- Empty selection → `/` and AND; do not leave `match=or` after Show all / last-tag clear
- Stale query tags: no invented chips; still used in list filter
- Commit strategy: one commit per story or logical group after that story’s checkpoint
