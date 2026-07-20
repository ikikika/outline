# Implementation Plan

This plan is phased and gated. A phase is complete only after its listed acceptance criteria have been implemented and verified. Phases 1 through 5 are complete; Phase 6 is next. Read [context.md](context.md) before implementation. Keep each phase focused and update the context when a design decision changes. Per the current instruction, do not add unit tests or testing-framework dependencies for now. Use build/typecheck/lint and manual browser acceptance checks; revisit automated tests only with user approval.

| Phase | Objective | Dependencies |
|---|---|---|
| 1. Context and architecture | Record requirements, conventions, risks, and this staged plan. Stop for review and approval. | None |
| 2. Scaffolding and domain model | Establish a maintainable source layout, typed model, and initial board creation. | Phase 1 approval |
| 3. Hex geometry | Implement shared pointy-top axial geometry and board generators. | Phase 2 |
| 4. Board rendering | Render both board shapes and configured logical cell sizes in SVG. | Phase 3 |
| 5. Viewport and navigation | Add centering, pan, zoom, bounds, resize handling, and shared coordinate transforms. | Phase 4 |
| 6. Terrain and grid controls | Add water, ground, bridges, terrain editing, and temporary grid visibility. | Phases 2-5 |
| 7. Gallery and placement | Add local original SVG assets, typed gallery, previews, footprint validation, placement, and removal. | Phases 2-6 |
| 8. Roads and connectivity | Add editable explicit road sides, bridge ports/transitions, and validated connectivity graph. | Phases 2-7 |
| 9. Autonomous vehicle | Add valid placement, deterministic traversal/reversal, elapsed-time animation, and controls. | Phase 8 |
| 10. JSON import/export | Add versioned schema, validation, migration, atomic import, and downloadable export. | Phases 2-9 |
| 11. Integration and QA | Exercise end-to-end workflows and responsive/accessibility behavior; fix regressions and document limits. | Phases 2-10 |

## Phase 1: Project context and architecture

**Objective:** Establish an authoritative design reference and an implementation sequence before application changes.

**Files:** `docs/context.md`, `docs/implementation-plan.md`.

**Deliverables:** Repository state recorded; geometry, domain boundaries, persistence, interaction, verification policy, assumptions, risks, and gates documented.

**Acceptance:** Both documents exist, are consistent with the actual starter, cover the requested requirements at an actionable level, and do not claim unverified implementation. Present a concise architecture and unresolved assumptions, then wait for explicit Phase 2 approval.

**Status:** Complete; documents were created and reviewed before Phase 2 approval.

**Automated tests:** None; documentation-only phase. Inspect existing project files and ensure no existing docs are overwritten.

**Risks and mitigations:** Requirements may imply choices not fully specified. Make defaults visible as proposals, capture open questions, and defer consequential alternatives for review.

## Phase 2: Project scaffolding and domain model

**Objective:** Replace starter assumptions with a clean editor foundation while preserving the existing React/TypeScript/Vite stack.

**Expected files/modules:** `src/domain/` types and board initialization; `src/components/` initial shell; update package scripts only as needed for build/typecheck/lint; update starter README if needed.

**Deliverables:** Typed board configuration, axial coordinate/cell types, terrain/object/road/bridge/vehicle definitions, separation between persistent and transient state, reducer or equivalent immutable board actions.

**Acceptance:** A valid rectangular or hexagonal configuration can be represented; valid cells initialize as water; invalid configuration is rejected; production type/build and lint checks pass, and behavior is manually verified.

**Status:** Complete. The production build and lint pass. Browser checks confirmed a 20x14 board initializes with 280 water cells; radius 8 initializes with 217 water cells; invalid radius 41 is rejected by both browser constraints and domain validation without replacing the existing board. The responsive shell has no horizontal overflow at a 390px viewport.

**Verification:** Production build/typecheck and lint passed; manually inspected default board initialization, hexagonal initialization, invalid dimensions, atomic rejection, and mobile-width layout.

**Risks and mitigation:** Premature coupling to UI makes later behavior hard to test; keep business rules framework-independent and defer UI-specific state to components.

## Phase 3: Hexagonal geometry

**Objective:** Establish one shared, verified source of truth for logical board geometry.

**Expected files/modules:** `src/geometry/coordinates.ts`, `hex.ts`, `board-layout.ts`, `transforms.ts` as appropriate.

**Deliverables:** Axial/rectangular conversions; pointy-top centers and vertices; six neighbors and opposites; rectangular/hex board generation; axial rounding and boundary checks; shared board/screen conversion primitives.

**Acceptance:** Both generators produce complete expected sets; conversions preserve valid cells; neighbor direction/opposite relationships are consistent; hexes have the documented dimensions and no layout gaps; out-of-board hits are rejected. Build/type and lint checks pass.

**Status:** Complete. `npm run build` and `npm run lint` pass. One-off geometry smoke checks confirmed rectangular conversion round-trips, 20-cell 4x5 and 19-cell radius-2 layouts, 217 cells at radius 8, correct pointy-top vertices and shared edges in all six directions, reciprocal neighbors, in-board center hit-tests, out-of-board rejection, and board/screen transform inversion. No unit tests or test dependencies were added.

**Verification:** Build/typecheck and lint passed; geometry acceptance checks were run manually through Vite's module loader.

**Risks and mitigation:** Offset-row convention mistakes can corrupt all later work; manually check odd/even rows and known neighbor locations before rendering.

## Phase 4: Board rendering

**Objective:** Render complete rectangular and hexagonal logical boards using shared geometry.

**Expected files/modules:** `src/components/BoardSvg.tsx`; board-bounds utility in `src/geometry/board-layout.ts`; application shell styling.

**Deliverables:** Fixed logical cell radius, aligned pointy-top hex cells, board shape controls/configuration, complete board-space SVG bounds, grid rendering.

**Acceptance:** Correct cell counts and positions render for both shapes at configured size; no auto-fit changes logical size; objects added later can share the same cell centers; rendering remains clipped by the viewport rather than changing the board model.

**Status:** Complete. `npm run build` and `npm run lint` pass. Browser checks confirmed 280 rendered cells for the 20x14 rectangle, 19 cells for radius 2, and 217 cells for radius 8. A radius-2 board at cell size 20 rendered a 175.2 by 162 SVG; the default 32-unit board remained 1,138 pixels wide inside a 301-pixel scroll viewport, confirming cells are not auto-fitted.

**Verification:** Build/typecheck and lint passed; manually inspected rectangle and hex renders, cell counts, fixed cell dimensions, and scrollable bounds. Pan/zoom and viewport centering remain Phase 5 work.

**Risks and mitigation:** Large SVG trees can be costly; begin with simple rendering and profile at documented maximum sizes before considering culling.

## Phase 5: Viewport and navigation

**Objective:** Make a large board navigable while keeping interaction transforms consistent.

**Expected files/modules:** `src/components/ViewportController.tsx`, `src/geometry/transforms.ts`, and viewport styles.

**Deliverables:** Geometric initial centering; pointer-captured mouse/one-finger pan; wheel and pinch zoom anchored to pointer/midpoint; pan bounds; resize handling; grid-hit conversion.

**Acceptance:** Pan and zoom never modify logical data; input and rendering share transforms; board cannot be dragged entirely out of reach; gallery/control gestures do not affect viewport; touch gestures do not scroll the page while actively used.

**Status:** Complete. `npm run build` and `npm run lint` pass. Browser checks confirmed initial and new-board geometric centering; 30x25 mouse pan and 25x20 touch pan; pan clamping at board bounds; wheel and pinch anchor preservation; pinch zoom to 200%; zoom limits of 35%-300%; center/reset; resize preservation when a resize event is delivered; toolbar gesture isolation; and no page-wide overflow at mobile width. A canceled pointer was followed by a working pan. Wheel input is non-passive and prevented default page scrolling over the board. The dedicated `/board` route, full-viewport page, back navigation, and shared board/zoom state are also verified. The browser harness does not emit resize events when changing its emulated viewport, so resize preservation was checked by dispatching the browser resize event after changing the viewport size.

**Verification:** Production build/typecheck and lint passed; viewport acceptance behavior was manually checked in the browser. No unit tests or test dependencies were added.

**Risks and mitigation:** Gesture/browser differences; use pointer events and explicit touch-action on the board, then verify on mobile browsers.

**Required follow-up before Phase 6: Dedicated full-viewport board page**

**Objective:** Add a separate board page where the board viewport container occupies the entire browser viewport and renders the game board.

**Expected files/modules:** `src/pages/BoardPage.tsx`; application route/page selection and navigation; shared `ViewportController` integration; responsive full-viewport styles.

**Deliverables:** A dedicated route (proposed `/board`) reachable from the setup/workspace page; a viewport-sized page container; the existing board SVG and viewport controls rendered inside it; one canonical board model shared across the setup and board pages. This is not browser fullscreen and must not use the Fullscreen API.

**Acceptance:** Navigating to the board page fills the available viewport on desktop and mobile; the board renders within the full-page viewport using the existing configured cell size and pan/zoom behavior; the document does not gain unintended scrollbars; navigating from setup does not reset or duplicate the logical board; browser back/navigation returns to the prior page appropriately.

**Verification:** Run build/typecheck and lint; manually check route entry, page sizing, board rendering, pan/zoom, navigation/back behavior, and no document overflow at desktop and mobile widths.

**Status:** Complete. Build/typecheck and lint pass. Manual browser checks confirmed direct `/board` loading; 1440x900 desktop and 390x844 mobile viewport fill; 280 rendered cells with no document overflow; setup-to-board navigation; browser Back; and preservation of board cells and 120% zoom across navigation.

## Phase 6: Terrain and grid controls

**Objective:** Add terrain editing without coupling logical terrain to visual grid state.

**Expected files/modules:** Terrain rules/actions, terrain SVGs/styles, and toolbar controls.

**Deliverables:** Water default; ground placement over water; bridge placement over water with explicit ports/transitions; grid toggle; clear selected-terrain mode and feedback.

**Acceptance:** Invalid terrain changes leave the board unchanged; grid toggle removes outlines only; terrain remains aligned under pan/zoom and is exported later from the model.

**Verification:** Run build/type and lint checks; manually verify water initialization, valid/invalid ground and bridge changes, bridge directions, and grid visibility without changing interaction.

**Risks and mitigation:** Ambiguous bridge behavior; retain explicit direction-pair data and use the documented undirected default unless review establishes another policy.

## Phase 7: Object gallery and placement
Grass blocks vehicle placement and traversal; manually verify that cars cannot enter or cross a grass cell.

**Objective:** Add bundled art and reliable selection-preview-placement-removal workflow.

**Expected files/modules:** `src/assets/objects/` SVGs or reusable SVG components; typed gallery definitions; placement/footprint/occupancy domain utilities; gallery, preview, and board object components.

**Deliverables:** Original local art for terrain/bridge, decorative grass, tree variants, 2x2 and 2x3 buildings, road variants, and top-down car; scrollable desktop gallery and compact mobile presentation; definitions for IDs, layers, footprints and constraints; valid/invalid preview and removal.

**Acceptance:** Gallery selection only enters placement mode; valid click/tap commits exactly one instance; pan does not place; invalid placement changes nothing; multi-cell render/validation/removal use the same derived footprint; controls are keyboard accessible.

**Verification:** Run build/type and lint checks; manually verify grass placement on ground, rejection on water/bridges and occupied cells, vehicle traversal over grass, other footprints, board edges, terrain compatibility, removal, preview feedback, placement under pan/zoom, and the selection-to-placement workflow.

**Risks and mitigation:** SVG art may obscure grid/feedback or scale poorly; keep artwork visually consistent, bundled, and vector-based, and test at zoom limits.

## Phase 8: Roads and explicit connectivity

**Objective:** Make road connections intentional and provide a trustworthy graph for simulation.

**Expected files/modules:** Road editing controls and artwork; pure `roads/` graph/validation utilities.

**Deliverables:** Six-side explicit road sets; matching opposite-side validation; bridge ports and transition pairs; connectivity graph; clear connected/unconnected visual states; road editing on valid ground.

**Acceptance:** Adjacent cells without reciprocal configured connections are disconnected; bridge traversal respects configured transitions; incompatible terrain/objects are rejected; graph is independent of viewport state.

**Verification:** Run build/type and lint checks; manually verify direction/opposite mapping, common junctions, mismatched/disconnected sides, bridge transitions, and blocking objects.

**Risks and mitigation:** Visuals can imply connectivity not present in data; derive visible road marks from the exact graph/connection data and test reciprocal cases.

## Phase 9: Autonomous vehicle

**Objective:** Drive a placed car through the explicit road graph safely and predictably.

**Expected files/modules:** Pure simulation transitions/route policy; SVG vehicle rendering; run/pause controls and animation hook.

**Deliverables:** Valid road/bridge placement, initially stopped; deterministic straight-first branch policy; smooth time-based movement and heading; dead-end reversal; safe stop; cleanup on pause/removal/board replacement.

**Acceptance:** Car never traverses disconnected edges or blocking objects; pan/zoom do not interrupt logical motion; start/pause/resume/remove work; no valid next edge means safely stopped.

**Verification:** Run build/type and lint checks; manually verify valid/invalid starts, route steps, turns, junction choice, reversal, stopping, blocking, pause/resume/removal, and motion at different frame rates.

**Risks and mitigation:** Frame lifecycle and logical/interpolated position can diverge; keep simulation transition pure and make rendered interpolation a disposable projection.

## Phase 10: JSON import/export

**Objective:** Make board designs portable with strict, atomic, versioned persistence.

**Expected files/modules:** `src/persistence/schema.ts`, parser/validator/serializer/migrations; import/export UI; context schema reference updates if needed.

**Deliverables:** Version 1 JSON schema, stable type IDs and axial coordinates, filename generation, file download, local file import, validation preview/error, replacement confirmation and atomic state replacement.

**Acceptance:** Exported JSON parses and round-trips meaningful board data; UI/runtime state is excluded; imported board centers and vehicles remain stopped at saved logical state; malformed/unsupported data never changes the current board; supported migrations are explicit.

**Verification:** Run build/type and lint checks; manually verify export/import round trips, malformed and unsupported files, migration behavior, duplicate IDs, invalid placement/connection data, and atomic failure.

**Risks and mitigation:** Silent compatibility changes can corrupt shared boards; reject future versions, test migrations, and do not mutate application state until full validation succeeds.

## Phase 11: Integration and quality assurance

**Objective:** Verify cross-feature behavior and polish responsive, accessible workflows.

**Expected files/modules:** Focused fixes across existing modules; usage/limitations documentation.

**Deliverables:** End-to-end create/edit/connect/drive/export/import workflows; responsive desktop/mobile gallery and controls; keyboard/focus/contrast checks; documented supported limits and unresolved limitations.

**Acceptance:** All phase gates remain green; representative desktop/mobile interactions work; no known data integrity or geometry regressions; final documentation states only verified capabilities.

**Verification:** Run production build/typecheck/lint; manually walk through create/edit/connect/drive/export/import workflows, responsive desktop/mobile behavior, keyboard/focus/contrast, and real-device gestures where available. Do not add unit-test suites under the current instruction; other verification approaches can be considered separately.

**Risks and mitigation:** Integrated pointer, simulation, and persistence workflows may expose lifecycle issues; prioritize user-visible correctness and repair regressions before declaring completion.