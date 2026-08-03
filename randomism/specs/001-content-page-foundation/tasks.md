---
description: "Task list for Content Page Foundation implementation"
---

# Tasks: Content Page Foundation

**Input**: Design documents from `/specs/001-content-page-foundation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: Schema, registry mapping, renderers, and example JSON fixtures are explicit tasks below.

**Article/page quality tasks**: SEO metadata, accessibility, and Server Components (no Client Components) are included in story and polish tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `components/blocks/`, `components/registry.ts`, `data/articles/`, `lib/`, `public/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Next.js App Router + TypeScript project skeleton

- [x] T001 Create Next.js App Router TypeScript app at repository root per `specs/001-content-page-foundation/plan.md` (strict TS)
- [x] T002 Add Zod dependency and keep Next.js/React versions aligned with plan in `package.json`
- [x] T003 [P] Configure ESLint (`eslint-config-next`) so `npm run lint` and zero-warning `npm run build` are achievable in `package.json` / eslint config
- [x] T004 [P] Add `.env.example` documenting `NEXT_PUBLIC_SITE_URL` and optional `.env.local` default for local dev
- [x] T005 [P] Create directory placeholders `data/articles/`, `public/images/`, `lib/articles/`, `lib/schema/`, `components/blocks/` per plan structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, discovery, site config, chrome, and registry scaffolding shared by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement site defaults and `getSiteUrl()` in `lib/site.ts`
- [x] T007 Implement Zod article + block schemas (strict/unknown keys rejected) in `lib/schema/article.ts` per `specs/001-content-page-foundation/data-model.md` and `contracts/article-schema.md`
- [x] T008 [P] Implement `data/articles/*.json` discovery (non-recursive, ignore non-json) in `lib/articles/discover.ts`
- [x] T009 Implement parse + validate + slug-from-filename in `lib/articles/load.ts` (throw on invalid so build fails)
- [x] T010 Implement published filter + `publishDate` desc sort (slug tie-break) in `lib/articles/list.ts`
- [x] T011 [P] Create empty registry map and types in `components/registry.ts`
- [x] T012 [P] Create `BlockRenderer` that resolves via registry with loud-dev / safe-prod unknown handling in `components/BlockRenderer.tsx`
- [x] T013 [P] Create `SiteHeader` brand/home chrome in `components/SiteHeader.tsx`
- [x] T014 Wire root layout metadata defaults + `SiteHeader` in `app/layout.tsx`
- [x] T015 [P] Add minimal responsive global styles (max-width column, ~375px no horizontal scroll) in `app/globals.css`
- [x] T016 [P] Add sample image asset(s) under `public/images/` for Image block fixtures

**Checkpoint**: Foundation ready — stories can proceed

---

## Phase 3: User Story 1 - Browse articles on the home page (Priority: P1) 🎯 MVP

**Goal**: Home `/` shows published articles from `data/articles/` ordered by publish date; drafts excluded; entries navigate to article paths

**Independent Test**: With ≥2 published JSON files (different dates) and one unpublished draft, open `/` and confirm list order, draft absence, and link targets per `specs/001-content-page-foundation/quickstart.md` scenario 1

### Implementation for User Story 1

- [x] T017 [P] [US1] Add published fixture `data/articles/welcome.json` (with Heading/Paragraph/Image blocks + SEO fields + earlier `publishDate`)
- [x] T018 [P] [US1] Add published fixture `data/articles/getting-started.json` (different newer/older `publishDate` for sort demo)
- [x] T019 [P] [US1] Add unpublished valid draft `data/articles/draft-example.json` (`published: false`, no public route/list)
- [x] T020 [US1] Implement home article list UI in `components/ArticleList.tsx` (title + optional description + accessible links)
- [x] T021 [US1] Implement home page using `list.ts` + `ArticleList` + home metadata from `lib/site.ts` in `app/page.tsx`

**Checkpoint**: MVP — visitors can browse published articles from home

---

## Phase 4: User Story 2 - Read an individual article (Priority: P2)

**Goal**: `/articles/{slug}` renders published article blocks via registry with full SEO/OG metadata; unpublished → 404

**Independent Test**: Open `/articles/welcome` for body + metadata; open draft slug → 404; confirm Image alt text (quickstart scenarios 2–3)

### Implementation for User Story 2

- [x] T022 [P] [US2] Implement Heading block renderer in `components/blocks/Heading.tsx`
- [x] T023 [P] [US2] Implement Paragraph block renderer in `components/blocks/Paragraph.tsx`
- [x] T024 [P] [US2] Implement Image block renderer with `next/image` in `components/blocks/ImageBlock.tsx`
- [x] T025 [US2] Register Heading, Paragraph, Image in `components/registry.ts`
- [x] T026 [US2] Implement `app/articles/[slug]/page.tsx` with `generateStaticParams` (published only), `notFound` for missing/unpublished, `BlockRenderer`, and metadata (title, description, canonical, Open Graph) per `contracts/routes.md`

**Checkpoint**: Articles readable with SEO; drafts not routable

---

## Phase 5: User Story 3 - Dependable content rendering (Priority: P3)

**Goal**: All `data/articles/*.json` validated at build (including drafts); invalid content fails build clearly; unknown types handled at render defensively

**Independent Test**: Break a JSON fixture → `npm run build` fails; restore → build passes; confirm load throws with clear errors (quickstart scenario 4)

### Implementation for User Story 3

- [x] T027 [US3] Ensure article load path used by home + `generateStaticParams` + article page always validates every discovered `*.json` and fails build on schema/parse errors in `lib/articles/load.ts` / call sites
- [x] T028 [US3] Document or assert filename slug safety rules (reject unsafe names) in `lib/articles/load.ts` or `lib/articles/discover.ts`
- [x] T029 [US3] Verify `BlockRenderer` development placeholder vs production skip for unknown `componentType` in `components/BlockRenderer.tsx` (defensive path after schema)

**Checkpoint**: Invalid content cannot ship; render path remains safe

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: README, quality gates, responsive/a11y pass, quickstart validation

- [x] T030 [P] Write root `README.md` with setup, `data/articles/` authoring notes, and env vars
- [x] T031 [P] Confirm semantic HTML, keyboard links, contrast, heading hierarchy on `app/page.tsx` and `app/articles/[slug]/page.tsx` / block components
- [x] T032 Run `npm run lint` and `npm run build` with zero warnings; fix any issues in project configs/source
- [x] T033 Manually execute `specs/001-content-page-foundation/quickstart.md` scenarios 1–7 and fix gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on Foundational; uses fixtures from US1 (T017–T019) ideally before full SEO verification
- **US3 (Phase 5)**: Depends on Foundational + load/list/render paths from US1/US2
- **Polish (Phase 6)**: Depends on desired stories complete (all three for full foundation)

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — home list works even before block renderers if article page is stubbed later; prefer completing T017–T021 as MVP
- **US2 (P2)**: Needs fixtures (US1) + registry/blocks; article routes independent of list UI details
- **US3 (P3)**: Hardens validation/build behavior across existing loaders; after US1/US2 paths exist

### Parallel Opportunities

- Phase 1: T003, T004, T005 in parallel after T001–T002
- Phase 2: T008 // T011 // T013 // T015 // T016; T007 then T009–T010 sequential after discover
- US1: T017 // T018 // T019 then T020 → T021
- US2: T022 // T023 // T024 then T025 → T026
- Polish: T030 // T031

---

## Parallel Example: User Story 1

```bash
# Fixtures in parallel:
Task: "Add published fixture data/articles/welcome.json"
Task: "Add published fixture data/articles/getting-started.json"
Task: "Add unpublished draft data/articles/draft-example.json"

# Then UI + page:
Task: "Implement components/ArticleList.tsx"
Task: "Implement app/page.tsx home list + metadata"
```

---

## Parallel Example: User Story 2

```bash
# Block components in parallel:
Task: "Implement components/blocks/Heading.tsx"
Task: "Implement components/blocks/Paragraph.tsx"
Task: "Implement components/blocks/ImageBlock.tsx"

# Then register + article page:
Task: "Register blocks in components/registry.ts"
Task: "Implement app/articles/[slug]/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (fixtures + home list)
4. **STOP and VALIDATE**: Home lists published articles in date order
5. Demo MVP entry point

### Incremental Delivery

1. Setup + Foundational → shared pipeline ready
2. US1 → Home list MVP
3. US2 → Article pages + SEO + blocks
4. US3 → Build-fail validation hardening
5. Polish → README, lint/build, quickstart pass

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2: one person on US1 fixtures/list; another on US2 block components (merge before article page)
3. US3 + polish after routes exist

---

## Notes

- [P] = different files, no incomplete-task dependencies
- [USn] maps to spec user stories
- No automated test tasks (constitution / spec)
- Commit after each task or logical group
- Validate at story checkpoints using quickstart.md

---

## Phase 7: Convergence

- [x] T034 SUPERSEDED — Draft URL access + Draft tag is now the approved intent in `spec.md` / `contracts/routes.md` (artifacts updated 2026-08-03). No code revert required; implementation already matches amended FR-002 / FR-019 / SC-007.
