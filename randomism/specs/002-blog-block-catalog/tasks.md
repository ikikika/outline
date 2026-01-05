---
description: "Task list for Blog Block Catalog implementation"
---

# Tasks: Blog Block Catalog

**Input**: Design documents from `/specs/002-blog-block-catalog/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT required by the Randomism constitution. Do NOT add test tasks unless the feature specification explicitly requests them.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

**Content/registry tasks**: Schema, registry mapping, renderers, and example JSON fixtures are explicit tasks below.

**Article/page quality tasks**: Accessibility for accordion/lists/callouts, responsive code regions, and Server Components (native `<details>` — no Client Component) are included in story and polish tasks. SEO metadata contracts from foundation are unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Randomism**: `app/`, `components/`, `components/blocks/`, `components/markdown/`, `components/registry.ts`, `data/articles/`, `lib/schema/`, `app/globals.css`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Markdown dependency and directory scaffolding on top of foundation

- [x] T001 Add `react-markdown` dependency in `package.json` (no `rehype-raw`, no GFM, no syntax highlighter)
- [x] T002 [P] Ensure `components/markdown/` and placeholders for new block files under `components/blocks/` exist per `specs/002-blog-block-catalog/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extended Zod union + shared Markdown helpers required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Extend block discriminated union in `lib/schema/article.ts` for `CodeBlock`, `Accordion`, `Blockquote`, `List`, `Callout`, `Divider` per `specs/002-blog-block-catalog/data-model.md` (strict objects; reject empty `code` / empty accordion sections / empty list items; `Callout.variant` ∈ `info`|`tip`|`warning`)
- [x] T004 [P] Implement full Markdown helper (CommonMark via `react-markdown`, no `rehype-raw`) in `components/markdown/Markdown.tsx` per `specs/002-blog-block-catalog/contracts/markdown.md`
- [x] T005 Implement inline Markdown helper (phrasing-only allowlist) in `components/markdown/Markdown.tsx` (same module as T004; not parallel) for List items
- [x] T006 Update `components/blocks/Paragraph.tsx` to render `content` with the full Markdown helper (Heading remains plain text in `components/blocks/Heading.tsx`)

**Checkpoint**: Schema accepts new types; Markdown helpers ready — stories can proceed

---

## Phase 3: User Story 1 - Read richer article content (Priority: P1) 🎯 MVP

**Goal**: Visitors see CodeBlock, Accordion, Blockquote, List, Callout, Divider (plus Markdown prose) on an article page in authored order

**Independent Test**: Open `/articles/getting-started`; confirm all six new block types render correctly alongside Heading/Paragraph/Image; code is preformatted and not Markdown-processed; Paragraph shows bold/link/inline code (quickstart scenarios 1–2); accordion can open multiple sections (scenario 3 partial)

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement CodeBlock renderer (`<pre><code>`, optional language label, literal `code`) in `components/blocks/CodeBlock.tsx`
- [x] T008 [P] [US1] Implement Accordion renderer with native `<details>`/`<summary>`, multi-open, `defaultOpen` → `open`, Markdown title + body in `components/blocks/Accordion.tsx`
- [x] T009 [P] [US1] Implement Blockquote renderer (Markdown `text`, plain optional `cite`) in `components/blocks/Blockquote.tsx`
- [x] T010 [P] [US1] Implement List renderer (`ordered` → `ol`/`ul`, items via inline Markdown) in `components/blocks/List.tsx`
- [x] T011 [P] [US1] Implement Callout renderer (`info`|`tip`|`warning` + text label, Markdown `body`) in `components/blocks/Callout.tsx`
- [x] T012 [P] [US1] Implement Divider renderer (`<hr>`) in `components/blocks/Divider.tsx`
- [x] T013 [US1] Register CodeBlock, Accordion, Blockquote, List, Callout, Divider in `components/registry.ts`
- [x] T014 [US1] Update published fixture `data/articles/getting-started.json` with all nine `componentType`s (including the six new types) + Markdown samples per `specs/002-blog-block-catalog/contracts/article-schema.md` (do **not** add `block-catalog.json`)
- [x] T015 [US1] Add styles for code region (internal horizontal scroll), callout, accordion, list, blockquote, divider in `app/globals.css` (~375px: no primary-page horizontal scroll)

**Checkpoint**: MVP — richer blocks + Markdown readable on showcase article

---

## Phase 4: User Story 2 - Author with documented block types (Priority: P2)

**Goal**: Authors can copy documented field shapes into JSON; invalid shapes fail publish/build; registry is the only render path

**Independent Test**: Copy a valid block from contracts into a draft/published file → builds and renders; deliberately invalid fields (e.g. bad `variant`, empty `code`) → `npm run build` fails clearly (quickstart scenario 5); confirm no page-local switch outside registry

### Implementation for User Story 2

- [x] T016 [P] [US2] Document new block types, Markdown field modes, and fixture path in root `README.md` (authoring notes aligned with contracts)
- [x] T017 [US2] Verify remaining fixtures (`data/articles/welcome.json`, `draft-example.json`) still validate after schema extension; update only if Paragraph Markdown or schema strictness requires it (`getting-started.json` is the showcase from T014)
- [x] T018 [US2] Confirm article pages still render exclusively via `components/BlockRenderer.tsx` + `components/registry.ts` (no one-off `componentType` switches in `app/articles/[slug]/page.tsx`)
- [x] T019 [US2] Manually validate invalid content fails build (temporarily break a fixture per quickstart scenario 5; restore afterward) using `lib/schema/article.ts` / `npm run build`

**Checkpoint**: Authoring path documented; invalid JSON cannot ship

---

## Phase 5: User Story 3 - Accessible interactive sections (Priority: P3)

**Goal**: Keyboard/AT users can operate accordion; lists, code, quotes, callouts, and Markdown structure remain understandable without color alone

**Independent Test**: Keyboard-only expand/collapse accordion with visible focus (SC-003); callout conveys tone via text label not only color; lists/links/code remain semantic (quickstart scenario 3 + US3 acceptance)

### Implementation for User Story 3

- [x] T020 [US3] Ensure Accordion focus-visible styles and usable accessible name from `<summary>` Markdown content in `components/blocks/Accordion.tsx` / `app/globals.css`
- [x] T021 [P] [US3] Ensure Callout exposes a non-color-only tone label (e.g. “Tip”, “Warning”, “Info”) in `components/blocks/Callout.tsx`
- [x] T022 [P] [US3] Confirm List/Blockquote/CodeBlock use semantic elements (`ul`/`ol`/`li`, `blockquote`, `pre`/`code`) in their block components
- [x] T023 [US3] Spot-check Markdown links/emphasis from full helper remain real `<a>` / emphasis elements via `components/markdown/Markdown.tsx` on `/articles/getting-started`

**Checkpoint**: Accordion and structured content meet accessibility baseline

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Raw-HTML behavior check, quality gates, full quickstart pass

- [x] T024 [P] Verify raw HTML in a Markdown field is not rendered as live elements / does not execute scripts (quickstart scenario 4) using showcase or a temporary fixture edit restored afterward
- [x] T025 [P] Run `npm run lint` and `npm run build` with zero warnings on valid fixtures
- [x] T026 Execute remaining scenarios in `specs/002-blog-block-catalog/quickstart.md` (mobile ~375px, multi-open accordion, SC-006)
- [x] T027 [P] Update root `README.md` if dependency/setup notes for `react-markdown` are still missing after T016

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; practically after US1 registry + at least one fixture so authoring checks are meaningful
- **User Story 3 (Phase 5)**: Depends on Foundational; needs Accordion/Callout/List from US1 for meaningful a11y checks
- **Polish (Phase 6)**: After desired stories complete

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2 only — delivers MVP blocks + showcase
- **User Story 2 (P2)**: After US1 recommended (docs + validation against real registry/fixtures)
- **User Story 3 (P3)**: After US1 recommended (polish a11y on shipped blocks)

### Within Each User Story

- Schema/helpers already in Phase 2
- Parallel `[P]` renderers before registry registration
- Fixture after registry (or with registry) so the page can resolve types
- Styles can follow renderers

### Parallel Opportunities

- T002 with T001 after planning
- T004 / T005 in parallel after T003 (or overlapping if types imported carefully)
- T007–T012 in parallel once Phase 2 done
- T016 parallel with T017–T018 in US2
- T021 / T022 parallel in US3
- T024 / T025 / T027 parallel in polish

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch block renderers in parallel:
Task: "Implement CodeBlock in components/blocks/CodeBlock.tsx"
Task: "Implement Accordion in components/blocks/Accordion.tsx"
Task: "Implement Blockquote in components/blocks/Blockquote.tsx"
Task: "Implement List in components/blocks/List.tsx"
Task: "Implement Callout in components/blocks/Callout.tsx"
Task: "Implement Divider in components/blocks/Divider.tsx"

# Then sequentially:
Task: "Register all six types in components/registry.ts"
Task: "Update data/articles/getting-started.json with all component types"
Task: "Add block styles in app/globals.css"
```

---

## Parallel Example: User Story 3

```bash
Task: "Callout text labels in components/blocks/Callout.tsx"
Task: "Semantic List/Blockquote/CodeBlock spot-check in block components"
# Accordion focus styles may touch Accordion.tsx + globals.css — run after or carefully with CSS task
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`react-markdown`)
2. Complete Phase 2: Schema + Markdown helpers + Paragraph update
3. Complete Phase 3: Six renderers, registry, showcase, styles
4. **STOP and VALIDATE**: Showcase article + Markdown + multi-open accordion
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → Markdown + schema ready
2. US1 → Richer reading experience (MVP)
3. US2 → Author docs + invalid-build confidence
4. US3 → A11y hardening
5. Polish → Full quickstart + lint/build

### Parallel Team Strategy

1. Together: Phase 1–2
2. Then: one developer on US1 renderers; another can draft README (US2) against contracts
3. US3 after Accordion/Callout exist

---

## Notes

- [P] = different files, no incomplete-task dependencies
- No automated test tasks (constitution)
- Accordion MUST remain Server Component using `<details>`/`<summary>` unless a later change justifies Complexity Tracking
- Do not add `rehype-raw`, `remark-gfm`, or syntax highlighters in this feature
- Commit after each task or logical group when requested by the user
