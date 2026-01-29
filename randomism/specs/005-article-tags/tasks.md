---
description: "Task list for Article Tags implementation"
---

# Tasks: Article Tags

**Input**: Design documents from `/specs/005-article-tags/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: Schema field `tags` only — **no** new `componentType` and **no** registry change. Fixtures are explicit tasks.

**Article/page quality tasks**: SEO (`keywords` on articles, home canonical `/`), accessibility (real links, `aria-current`, no nested anchors), Server Components only (no Client island for filtering).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `lib/schema/`, `lib/articles/`, `data/articles/`, `README.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm layout; no new packages

- [x] T001 Verify feature paths from `specs/005-article-tags/plan.md` exist (`app/page.tsx`, `app/articles/[slug]/page.tsx`, `components/ArticleList.tsx`, `lib/schema/article.ts`, `lib/articles/list.ts`, `data/articles/`) and confirm no new npm dependencies are required in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + tag helpers shared by every story; MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Extend Zod `articleDocumentSchema` in `lib/schema/article.ts`: optional `tags` array defaulting to `[]`; each item matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`; `superRefine` uniqueness; omit/`[]` valid; nested objects rejected — per `specs/005-article-tags/data-model.md` and `contracts/article-schema.md`
- [x] T003 [P] Add `lib/articles/tags.ts` with `formatTagLabel` (hyphen → space, capitalize each word), `parseTagQuery` (first string from `searchParams.tag`, else `undefined`), and `listPublishedTags` (unique identities from published articles only, `localeCompare` sort) per `specs/005-article-tags/research.md`
- [x] T004 Extend `lib/articles/list.ts`: add `tags: string[]` to `ArticleListItem`; include `tags` in `listPublishedArticles`; accept optional `{ tag?: string }` and when set return only published items whose `tags` include that identity (unknown identity → empty list, not throw)

**Checkpoint**: Existing JSON without `tags` still builds; helpers ready for UI

---

## Phase 3: User Story 1 - See an article’s topics at a glance (Priority: P1) 🎯 MVP

**Goal**: Article header shows humanized topic chips (not Draft). Activating a chip always goes to `/?tag={identity}`. No empty tag chrome when `tags` is empty. Article metadata includes keywords when tags exist.

**Independent Test**: Open `/articles/getting-started` — chips **Randomism** and **Authoring** near the title; not kebab-case; not Draft-styled. Open a page with no tags (draft or pre-fixture article) — no empty tag chrome. Keyboard can reach chips. Chip `href` is `/?tag=…` (full home filter is US2). Quickstart scenario 1 (chips + navigation href) and scenario 9 (article keywords).

### Implementation for User Story 1

- [ ] T005 [US1] Create Server Component `components/ArticleTags.tsx`: MUI `Chip` + Next `Link`, `size="small"`, accessible name = `formatTagLabel`; wrap in `<nav aria-label="Topics">` (omit the nav when `tags` is empty). Support `linkMode: "apply"` (always `href="/?tag={id}"`) for article pages per `contracts/home-tag-filter.md`
- [ ] T006 [US1] Render `ArticleTags` in the header of `app/articles/[slug]/page.tsx` (distinct from the warning Draft `Chip`; topic chips after title/date). In `generateMetadata`, when `tags.length > 0` set `keywords` to stored identities; keep title, description, canonical, Open Graph, draft `noindex`
- [ ] T007 [P] [US1] Add `"tags": ["randomism", "authoring"]` to `data/articles/getting-started.json` so the MVP article demonstrates chips

**Checkpoint**: MVP — at least one article shows humanized, activatable topic chips

---

## Phase 4: User Story 2 - Filter the home list by tag (Priority: P2)

**Goal**: Home shows unique published tags plus always-visible **Show all** (current when unfiltered). `/?tag={identity}` filters the published list. Selected tag `href` is `/` (deactivate). Shareable URL. Canonical remains `/`. Empty filter copy is distinct from “no published articles.”

**Independent Test**: Open `/` — Show all current; ≥1 tag from getting-started. Activate `authoring` — only matching published articles; address `/?tag=authoring`; reload keeps the subset. Show all and clicking the selected tag both return to `/`. `/?tag=does-not-exist` shows “No matching articles.” plus the tag list. Quickstart scenarios 2–4, 6.

### Implementation for User Story 2

- [ ] T008 [P] [US2] Create Server Component `components/TagFilter.tsx`: `<nav aria-label="Filter articles by tag">` with Show all (`href="/"`, current when `activeTag` is unset) plus unique tags from `listPublishedTags()` (outlined vs filled+primary, `aria-current="page"` on the current control). Selected topic chip `href="/"`; unselected `href="/?tag={id}"`. Return `null` when there are no published tags. Wrap chips so they wrap on narrow viewports per `contracts/home-tag-filter.md`
- [ ] T009 [US2] Update `app/page.tsx`: read `searchParams` (`Promise`); `parseTagQuery`; `listPublishedArticles({ tag })`; render `TagFilter` above `ArticleList`; `generateMetadata` always sets `alternates.canonical` to `/`. Pass a distinct empty message when a tag is set and the list is empty (“No matching articles.”) vs unfiltered empty (“No published articles yet.”) — extend `ArticleList` props in `components/ArticleList.tsx` only as needed for that empty copy (do not yet add listing chips)

**Checkpoint**: Home filter works from the all-tags list even if listing rows have no chips yet

---

## Phase 5: User Story 3 - Scan topics on each home listing (Priority: P3)

**Goal**: Each home listing shows its tags. Chips use the same select/deactivate href rules as `TagFilter`. Title remains the article link (no nested anchors). Untagged rows have no chip chrome.

**Independent Test**: On `/`, listing chips match article tags; click a chip filters home (does not open the article); click title opens the article. With a filter active, clicking that same listing chip clears the filter. Quickstart scenario 5.

### Implementation for User Story 3

- [ ] T010 [US3] Extend `components/ArticleTags.tsx` with `linkMode: "toggle"` and `activeTag?: string`: unselected → `/?tag={id}`; selected → `/`; selected chip uses the same current styles/`aria-current` as `TagFilter`
- [ ] T011 [US3] Restructure `components/ArticleList.tsx`: stop wrapping the whole row in `ListItemButton`/`Link`. Title is the article `Link`; description and date stay text; render `ArticleTags` with `linkMode="toggle"` and `activeTag` from the home page. Omit tags chrome when `article.tags` is empty. Pass `activeTag` from `app/page.tsx` into `ArticleList`

**Checkpoint**: Listing tags filter the home list without nested links

---

## Phase 6: User Story 4 - Authors attach tags in article content (Priority: P4)

**Goal**: All published fixtures have ≥1 tag and collectively ≥2 distinct identities; draft omits tags; invalid shapes fail build; README documents `tags`.

**Independent Test**: Every published article on `/` shows chips; home tag list has ≥2 tags. `"tags": ["React"]` or duplicates fail `npm run build`. `draft-example.json` without `tags` still builds and stays off the home list. Quickstart scenarios 7–8.

### Implementation for User Story 4

- [ ] T012 [US4] Add tags to remaining published files per `specs/005-article-tags/research.md` fixture table: `data/articles/welcome.json` (`randomism`); `speckit.json` (`spec-kit`, `process`); `solid-principles.json` (`software-design`, `react`); `react-fundamentals.json` (`react`); `coding-standards-react.json` (`react`, `coding-standards`); `quiet-habits-that-sabotage-progress.json` (`habits`). Keep `data/articles/draft-example.json` with `tags` omitted
- [ ] T013 [P] [US4] Document optional `tags` (lowercase hyphenated list, omit allowed) in the Authoring articles section of `README.md`
- [ ] T014 [US4] Manually confirm invalid `tags` in a `data/articles/*.json` file fail `npm run build` with a clear Zod message from `lib/schema/article.ts` (uppercase, duplicate, object element) per `specs/005-article-tags/quickstart.md` scenario 8; restore fixtures afterward

**Checkpoint**: Authoring contract matches the live content tree

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and end-to-end quickstart pass

- [ ] T015 [P] Accessibility pass: topic vs Draft chips; `aria-current` on Show all / selected tag; keyboard to filter and listing chips; no nested `<a>`; empty filter announced as text — spot-check `/` and `/articles/getting-started`
- [ ] T016 [P] Run `npm run lint` and fix any issues introduced by this feature
- [ ] T017 Run full manual checklist in `specs/005-article-tags/quickstart.md` (scenarios 1–10)
- [ ] T018 Ensure `npm run build` succeeds with zero warnings and all `data/articles/*.json` validate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 (schema + `formatTagLabel`)
- **User Story 2 (Phase 4)**: Depends on Phase 2; US1 fixture (`getting-started` tags) makes the filter demonstrable
- **User Story 3 (Phase 5)**: Depends on US1 `ArticleTags` and US2 `activeTag` on home
- **User Story 4 (Phase 6)**: Depends on schema (Phase 2); can run parallel with US3 if files do not overlap (`data/articles/*.json` vs `components/`)
- **Polish (Phase 7)**: Depends on desired stories complete (all four for the full feature)

### User Story Dependencies

- **US1 (P1)**: Schema + helpers; one fixture; article header chips. Independently testable without home filter (hrefs still point at `/?tag=`)
- **US2 (P2)**: Needs helpers + at least one published tagged article; independently testable without listing chips
- **US3 (P3)**: Needs `ArticleTags` + home `activeTag`; independently testable once US2 filter exists
- **US4 (P4)**: Remaining fixtures + README + validation; independently testable as authoring completeness

### Parallel Opportunities

- T003 parallel with T002 (different files); T004 after both
- T007 parallel with T005–T006 (JSON vs TSX)
- After US1: T008 (`TagFilter.tsx`) parallel with starting T012 (other JSON files) if staffing allows
- T013 parallel with T012 (README vs JSON)
- T015 / T016 parallel in polish

---

## Parallel Example: After Foundational

```bash
# Developer A — MVP article chips:
Task: "T005 Create components/ArticleTags.tsx"
Task: "T006 Wire ArticleTags + keywords in app/articles/[slug]/page.tsx"
Task: "T007 Tag data/articles/getting-started.json"

# Developer B — helpers already done; wait for US2 or start fixtures:
Task: "T012 Add tags to remaining data/articles/*.json"
```

---

## Parallel Example: User Story 2 + 4 files

```bash
Task: "T008 Create components/TagFilter.tsx"
Task: "T013 Document tags in README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schema + helpers)
3. Complete Phase 3: User Story 1 (article chips + getting-started tags)
4. **STOP and VALIDATE**: `/articles/getting-started` shows humanized chips
5. Demo topic chips without home filter UI

### Incremental Delivery

1. Setup + Foundational → schema accepts `tags`
2. US1 → chips on article pages (MVP)
3. US2 → home Show all + `/?tag=` filter
4. US3 → listing chips, no nested links
5. US4 → remaining fixtures + README + invalid JSON fails build
6. Polish → lint, build, full quickstart

### Parallel Team Strategy

1. Pair completes Setup + Foundational
2. Then:
   - Developer A: US1 then US2 then US3
   - Developer B: US4 fixtures + README (after schema)

---

## Notes

- [P] = different files, no incomplete-task dependency
- No automated test tasks (constitution / spec)
- Do **not** add a `Tags` `componentType` or registry entry
- Do **not** add `/tags/[tag]` routes
- Do **not** add a Client Component solely to filter
- Home canonical stays `/` when `?tag=` is present
- Nested `Chip` links inside a full-row article `Link` are forbidden
- Suggested next command: `/speckit-implement`
