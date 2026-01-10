---
description: "Task list for Article Scroll Navigation implementation"
---

# Tasks: Article Scroll Navigation

**Input**: Design documents from `/specs/004-article-scroll-nav/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: Schema, registry mapping, renderers, and example JSON fixtures are explicit tasks below.

**Article/page quality tasks**: Accessibility, reduced-motion, Client Component only where required (BackToTop), SEO unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `components/blocks/`, `components/registry.ts`, `data/articles/`, `lib/`, `app/globals.css`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm layout and document-level scroll motion (no new packages)

- [ ] T001 Verify feature paths from `specs/004-article-scroll-nav/plan.md` exist (`components/`, `components/blocks/`, `lib/schema/`, `app/articles/[slug]/`) and confirm no new npm dependencies are required in `package.json`
- [ ] T002 [P] Add document `scroll-behavior: smooth` with `@media (prefers-reduced-motion: reduce)` override in `app/globals.css` per `specs/004-article-scroll-nav/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + heading id resolution shared by TOC stories; MUST complete before US2/US3 (US1 only needs Phase 1 + its own tasks, but keep one foundation for the feature)

**⚠️ CRITICAL**: Complete before User Stories 2–3; User Story 1 may proceed after Phase 1 if staffed separately, but prefer finishing Phase 2 first for a single coherent branch

- [ ] T003 Extend Zod schemas in `lib/schema/article.ts`: optional Heading `id` (reject `#` `/` `:`); add `TableOfContents` with `items[]` of `{ label, href }` (bare id rules; strict; no target-existence check) per `specs/004-article-scroll-nav/data-model.md` and `contracts/article-schema.md`
- [ ] T004 [P] Implement pure `assignHeadingIds` (explicit id or slugify `content` + `-2`/`-3` uniqueness) in `lib/articles/headingIds.ts` per research.md
- [ ] T005 Update `components/blocks/Heading.tsx` to render the resolved `id` on the heading element (`Typography` / semantic `h*`)
- [ ] T006 Update `components/BlockRenderer.tsx` to run `assignHeadingIds` on the blocks list before mapping so every Heading receives a unique resolved id

**Checkpoint**: Schema accepts TOC + Heading ids; headings expose fragment ids in the DOM

---

## Phase 3: User Story 1 - Return to the top of a long article (Priority: P1) 🎯 MVP

**Goal**: Every article page has a threshold-gated Back to top control that scrolls to top, clears the URL hash, and respects reduced motion

**Independent Test**: Open `/articles/speckit`, scroll past ~1 viewport, activate Back to top → top of page + no hash; control dormant near top; keyboard operable (quickstart scenarios 1–2)

### Implementation for User Story 1

- [ ] T007 [US1] Create Client Component `components/BackToTop.tsx` (MUI Fab/IconButton): show after ~`window.innerHeight` scroll (min ~320px); `scrollTo` top with smooth/auto from `prefers-reduced-motion`; clear hash via `history.replaceState`; accessible name “Back to top”
- [ ] T008 [US1] Mount `BackToTop` only from `app/articles/[slug]/page.tsx` (not home); keep existing article padding so the control does not obscure content
- [ ] T009 [US1] Verify home `/` does not render Back to top and article pages do (manual check per `contracts/article-nav.md`)

**Checkpoint**: MVP — long articles have usable back-to-top chrome

---

## Phase 4: User Story 2 - Jump to a section via on-page links (Priority: P2)

**Goal**: Opt-in TOC block renders in-page links that scroll to Heading anchors and update the URL fragment; no scroll-spy; missing targets do not crash

**Independent Test**: With a TOC present, activate each link → section in view + hash updates; keyboard works; scrolling alone does not change TOC “current” (quickstart 3, 5–6)

### Implementation for User Story 2

- [ ] T010 [P] [US2] Implement Server Component `components/blocks/TableOfContents.tsx` as `<nav aria-label="On this page">` + semantic list of `<a href={"#" + item.href}>{item.label}</a>` (plain labels; no scroll-spy)
- [ ] T011 [US2] Register `TableOfContents` in `components/registry.ts` and add the case in `components/BlockRenderer.tsx`
- [ ] T012 [US2] Confirm native hash navigation + globals smooth/reduced-motion satisfy FR-008/FR-009 without client click handlers; document any residual gap in a short comment only if needed in `components/blocks/TableOfContents.tsx`

**Checkpoint**: TOC links jump to sections when content includes the block

---

## Phase 5: User Story 3 - Author section navigation in content (Priority: P3)

**Goal**: Authors can add a valid TOC + Heading ids in JSON; invalid shapes fail build; unresolved bare ids do not; amend Spec Kit article to demonstrate the pattern

**Independent Test**: `/articles/speckit` shows TOC + working links; `"href": "#bad"` fails `npm run build`; nonexistent bare id builds and does not crash on click (quickstart 3–4, 7)

### Implementation for User Story 3

- [ ] T013 [US3] Amend `data/articles/speckit.json`: insert `TableOfContents` near the top (≥3 items); set explicit `id` on each Heading targeted by TOC items—per `contracts/article-schema.md` and FR-015 (do **not** create `toc-navigation-demo.json`)
- [ ] T014 [P] [US3] Confirm articles without TOC (e.g. `data/articles/getting-started.json`) still validate and show no empty TOC chrome
- [ ] T015 [US3] Manually validate authoring rules from quickstart scenario 7 (invalid `#`/URL `href` fails build; unresolved bare id allowed) and restore fixtures afterward

**Checkpoint**: Spec Kit fixture demonstrates TOC; schema enforcement matches clarify decisions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and end-to-end quickstart pass

- [ ] T016 [P] Accessibility pass: Back to top focus visible + name; TOC list semantics; Heading ids present — spot-check on `/articles/speckit`
- [ ] T017 [P] Run `npm run lint` and fix any issues introduced by this feature
- [ ] T018 Run full manual checklist in `specs/004-article-scroll-nav/quickstart.md` (scenarios 1–8)
- [ ] T019 Ensure `npm run build` succeeds with zero warnings and all `data/articles/*.json` validate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — blocks US2/US3 (schema + heading ids)
- **User Story 1 (Phase 3)**: Depends on Phase 1 (CSS); ideally after Phase 2 for one branch, but does not require TOC schema
- **User Story 2 (Phase 4)**: Depends on Phase 2 (schema, ids, Heading, BlockRenderer)
- **User Story 3 (Phase 5)**: Depends on Phase 4 (TOC renderer registered) for a visible fixture demo
- **Polish (Phase 6)**: Depends on desired stories complete (all three for full feature)

### User Story Dependencies

- **US1 (P1)**: Independent of TOC; MVP chrome alone
- **US2 (P2)**: Needs foundational heading ids + TOC schema/renderer; independently testable with a temporary fixture if US3 not done
- **US3 (P3)**: Needs US2 renderer; delivers canonical `speckit.json` fixture + validation checks

### Parallel Opportunities

- T002 parallel with T001
- T004 parallel with T003 (different files)
- After Phase 2: T007–T009 (US1) can run in parallel with T010 (US2) on different files
- T014 parallel with T013 (read-only confirm vs fixture edit — prefer T013 first if same branch conflict risk is low)
- T016 / T017 parallel in polish

---

## Parallel Example: After Foundational

```bash
# Developer A — MVP chrome:
Task: "T007 Create components/BackToTop.tsx"
Task: "T008 Mount BackToTop in app/articles/[slug]/page.tsx"

# Developer B — TOC rendering:
Task: "T010 Implement components/blocks/TableOfContents.tsx"
Task: "T011 Register TableOfContents in registry + BlockRenderer"
```

---

## Parallel Example: User Story 3

```bash
Task: "T013 Update data/articles/speckit.json with TOC + Heading ids"
Task: "T014 Confirm getting-started.json has no empty TOC chrome"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (globals scroll CSS)
2. Complete Phase 2: Foundational (recommended even for MVP branch hygiene)
3. Complete Phase 3: User Story 1 (BackToTop)
4. **STOP and VALIDATE**: quickstart scenarios 1–2
5. Demo article back-to-top without TOC

### Incremental Delivery

1. Setup + Foundational → ids + schema ready
2. US1 → Back to top on all articles (MVP)
3. US2 → TOC jumps when block present
4. US3 → `speckit.json` fixture + authoring validation
5. Polish → lint, build, full quickstart

### Parallel Team Strategy

1. Pair completes Setup + Foundational
2. Then:
   - Developer A: US1 (BackToTop)
   - Developer B: US2 (TOC block) then US3 (fixture)

---

## Notes

- [P] = different files, no incomplete-task dependency
- No automated test tasks (constitution / spec)
- Do **not** add scroll-spy behavior
- Do **not** fail build on unresolved bare TOC `href`s
- Reject `#` or URL in TOC `href` at schema validation
- Suggested next command: `/speckit-implement`
