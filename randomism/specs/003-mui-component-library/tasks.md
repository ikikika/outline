---
description: "Task list for MUI Component Library implementation"
---

# Tasks: MUI Component Library

**Input**: Design documents from `/specs/003-mui-component-library/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: No new `componentType`s. Accordion renderer is replaced in place; registry map stays the single dispatch path.

**Article/page quality tasks**: Light/dark contrast, keyboard color-mode toggle, Accordion a11y, SEO metadata untouched, Client Components limited to theme provider / toggle / Accordion.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `components/theme/`, `components/blocks/`, `components/registry.ts`, `data/articles/`, `app/globals.css`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add MUI/Emotion dependencies and theme directory scaffolding

- [ ] T001 Add `@mui/material`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`, and `@mui/icons-material` to `package.json` per `specs/003-mui-component-library/plan.md`
- [ ] T002 [P] Create `components/theme/` directory placeholders for `theme.ts`, `AppThemeProvider.tsx`, `ColorModeToggle.tsx`, and `colorModeStorage.ts` per plan structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Brand themes, color-mode storage, Emotion/MUI provider wired into root layout — required before chrome or block migration

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement brand-tuned light and dark `createTheme` palettes/typography in `components/theme/theme.ts` per `specs/003-mui-component-library/contracts/theme.md`
- [ ] T004 [P] Implement `localStorage` + system `prefers-color-scheme` helpers in `components/theme/colorModeStorage.ts` (key `randomism-color-mode`)
- [ ] T005 Implement client `AppThemeProvider` (Emotion cache + MUI `ThemeProvider` + `CssBaseline` + mode resolution) in `components/theme/AppThemeProvider.tsx`
- [ ] T006 Wire `AppThemeProvider` around children in `app/layout.tsx` (keep layout a Server Component for metadata)
- [ ] T007 Reduce `app/globals.css` to minimal document defaults only (remove `.block-*` / page presentation rules) per FR-011

**Checkpoint**: Theme provider active; light/dark tokens exist; legacy presentation CSS stripped

---

## Phase 3: User Story 1 - Consistent Material-based site chrome (Priority: P1) 🎯 MVP

**Goal**: Site header/shell and home list use MUI under brand themes; color-mode toggle follows system until chosen, then persists across visits

**Independent Test**: Open `/` and `/articles/getting-started`; confirm shared chrome theme; clear storage + OS dark → dark first load; toggle persists after reload (quickstart scenarios 1–2)

### Implementation for User Story 1

- [ ] T008 [P] [US1] Implement accessible `ColorModeToggle` in `components/theme/ColorModeToggle.tsx` (clear accessible name; not color-only)
- [ ] T009 [US1] Restyle `components/SiteHeader.tsx` with MUI `AppBar`/`Toolbar`/`Typography`/`Link` and mount `ColorModeToggle`
- [ ] T010 [US1] Restyle home list UI with MUI in `components/ArticleList.tsx` and ensure `app/page.tsx` layout uses theme-aware container/spacing
- [ ] T011 [US1] Apply MUI layout shell / content width on article page chrome in `app/articles/[slug]/page.tsx` (Draft `Chip`, title `Typography`) without changing metadata generation

**Checkpoint**: MVP — chrome + home + mode toggle work under MUI themes

---

## Phase 4: User Story 2 - Article and block UI uses the same library (Priority: P2)

**Goal**: All registry block renderers use MUI presentation; Accordion is MUI multi-expand Client Component; behaviors from `002` preserved aside from Accordion implementation

**Independent Test**: Open `/articles/getting-started`; all blocks in order; Markdown works; multi-open Accordion + keyboard; draft URL still Draft-tagged (quickstart scenarios 3–4)

### Implementation for User Story 2

- [ ] T012 [P] [US2] Restyle `components/blocks/Heading.tsx` with MUI `Typography` (plain text; level → variant)
- [ ] T013 [P] [US2] Restyle `components/blocks/Paragraph.tsx` with theme-aware wrapper around existing Markdown helper
- [ ] T014 [P] [US2] Restyle `components/blocks/ImageBlock.tsx` with MUI `Box` + keep `next/image` / required alt
- [ ] T015 [P] [US2] Restyle `components/blocks/CodeBlock.tsx` with MUI `Box`/`Paper` + internal horizontal scroll
- [ ] T016 [P] [US2] Restyle `components/blocks/Blockquote.tsx` with MUI layout + Markdown `text` / plain `cite`
- [ ] T017 [P] [US2] Restyle `components/blocks/List.tsx` with semantic list + theme (inline Markdown items unchanged)
- [ ] T018 [P] [US2] Restyle `components/blocks/Callout.tsx` with MUI `Alert` (or equivalent) + non-color text labels
- [ ] T019 [P] [US2] Restyle `components/blocks/Divider.tsx` with MUI `Divider`
- [ ] T020 [US2] Replace Accordion with client MUI `Accordion` multi-expand (honor `defaultOpen`) in `components/blocks/Accordion.tsx`; keep Markdown titles/bodies
- [ ] T021 [US2] Ensure `components/markdown/Markdown.tsx` link/code colors remain readable in light and dark themes
- [ ] T022 [US2] Confirm `components/registry.ts` and `components/BlockRenderer.tsx` still sole dispatch path (no page-local `componentType` switches; no schema changes in `lib/schema/article.ts`)

**Checkpoint**: Article body fully on MUI; Accordion multi-expand works

---

## Phase 5: User Story 3 - Authors and contributors see a documented UI baseline (Priority: P3)

**Goal**: README documents Material UI baseline and unchanged article JSON / `componentType` authorship

**Independent Test**: Find UI baseline note in README in under 2 minutes (SC-006); fixtures still validate via `npm run build`

### Implementation for User Story 3

- [ ] T023 [US3] Update root `README.md` with Material UI as public UI library, theme/color-mode note, and explicit statement that article JSON / `componentType` contracts are unchanged
- [ ] T024 [US3] Verify `data/articles/welcome.json`, `getting-started.json`, and `draft-example.json` still validate and build without schema edits

**Checkpoint**: Contributors have clear UI baseline docs; content contracts untouched

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Responsive/a11y pass, CSS retirement check, quality gates, quickstart

- [ ] T025 [P] Verify ~375px home + getting-started: no primary-page horizontal scroll; code internal scroll OK in block components / theme styles
- [ ] T026 [P] Verify color-mode toggle + Accordion keyboard focus-visible and accessible names across light/dark
- [ ] T027 Confirm `app/globals.css` has no residual `.block-*` presentation system (FR-011)
- [ ] T028 Run `npm run lint` and `npm run build` with zero warnings on valid fixtures
- [ ] T029 Execute remaining scenarios in `specs/003-mui-component-library/quickstart.md` (system preference, persistence, draft/SEO smoke)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; practically after US1 so chrome/theme already proven
- **User Story 3 (Phase 5)**: After US1 (docs); US2 recommended so README can mention full migration
- **Polish (Phase 6)**: After desired stories complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 only
- **US2 (P2)**: After Phase 2; after US1 recommended
- **US3 (P3)**: Docs + fixture verify; after US1 minimum

### Parallel Opportunities

- T012–T019 block restyles in parallel after Phase 2 (before T020 Accordion if desired)
- T008 parallel with early US1 work after T005
- T025 / T026 / T027 in polish

---

## Parallel Example: User Story 2

```bash
# After Phase 2 (+ preferably US1), restyle static blocks in parallel:
Task: "Heading.tsx MUI Typography"
Task: "Paragraph.tsx theme wrapper"
Task: "ImageBlock.tsx MUI Box"
Task: "CodeBlock.tsx MUI Paper"
Task: "Blockquote.tsx"
Task: "List.tsx"
Task: "Callout.tsx Alert"
Task: "Divider.tsx"

# Then:
Task: "Client MUI Accordion in Accordion.tsx"
Task: "Markdown light/dark contrast"
Task: "Confirm registry-only dispatch"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Install MUI/Emotion
2. Phase 2: Themes + provider + slim globals
3. Phase 3: Header, home list, color-mode toggle, article chrome
4. **STOP and VALIDATE**: System preference, toggle persistence, shared chrome look
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → theme system live
2. US1 → chrome MVP
3. US2 → full block migration + MUI Accordion
4. US3 → README
5. Polish → quickstart + lint/build

---

## Notes

- [P] = different files, no incomplete-task dependencies
- Do not add Joy UI / MUI X / new `componentType`s
- Accordion MUST be Client Component with multi-expand; other blocks prefer Server Components
- Color mode storage key: `randomism-color-mode`
- Commit after each task or logical group when requested by the user
