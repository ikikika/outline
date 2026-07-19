# Hexagonal Game Board Editor: Project Context

This document is the architectural source of truth. It describes both the intended application and verified implementation status. The repository uses React 19, TypeScript, and Vite. Phase 2 provides typed board/domain models, rectangular and hexagonal board initialization with water defaults, configuration validation, immutable board actions, and a minimal responsive setup/status shell. Hex geometry utilities, SVG board rendering, editing workflows, and automated test tooling are not implemented yet.

## Purpose and experience

Build a browser-based editor for designing a hexagonal world. Users configure a board, paint water/ground/bridges, place grass, trees, buildings and explicitly connected roads, then place and run an autonomous car. Users can pan and zoom a large board, work on desktop or mobile, and exchange logical board designs as portable versioned JSON. The interface should feel like a practical creative tool: board workspace, responsive object gallery, concise controls, clear placement feedback, and accessible interaction.

## Requirements and constraints

- Support pointy-top hexes, rectangular and complete hexagonal board shapes, configurable logical cell size, and bounded board dimensions.
- Keep logical board data independent from viewport pan/zoom, temporary previews, grid visibility, and animation interpolation.
- Initialize every valid cell as water. Ground supports objects; bridges occupy water and have explicit drivable ports/transitions.
- Support single-cell grass, trees, and roads; multi-cell buildings; explicit six-side road connectivity; and cars restricted to connected drivable cells.
- Reject invalid placements/imports without mutating the existing board. Use stable object IDs and a single source of truth for footprints and occupancy.
- Bundle original local SVG artwork. No remote assets, backend, accounts, networking, or cloud persistence.
- Keep geometry, placement validation, road graph, simulation, and persistence as pure domain modules where practical. React owns presentation and user interaction; SVG renders the board and its contents.
- Bound the initial implementation at 80 columns x 80 rows for rectangular boards, radius 40 for hexagonal boards (at most 6,400 and 4,921 cells respectively), and at most one placed vehicle initially. Validate limits at creation and import. Keep rendering responsive and avoid whole-board updates for every animation frame.

## Technology and architecture

The repository already uses React, TypeScript, and Vite. Retain that stack, SVG board rendering, and CSS responsive layout. Unit tests and test-framework dependencies are deferred for now; do not add Vitest or React Testing Library unless the user later approves them. Use typed domain modules and a reducer for logical board actions; keep viewport/UI state separate. Do not add a large state library absent demonstrated need.

Proposed module boundaries (exact paths may follow the existing `src/` conventions):

- `domain/`: board, cell, terrain, object, road, bridge, vehicle, and gallery definition types; pure board creation and mutation/validation rules.
- `geometry/`: axial/board conversions, pointy-top centers and polygons, neighbors/opposites, board shape generation, hit-testing, and shared coordinate transforms.
- `placement/`: footprint derivation, occupancy checks, terrain compatibility, and valid/invalid placement results.
- `roads/` and `simulation/`: explicit connection graph and deterministic vehicle step/route decisions, independent of React and viewport.
- `persistence/`: versioned schema parsing, validation, migration, serialization, and atomic replacement.
- `components/`: application shell, toolbar/settings, gallery, viewport controller, SVG board/cells/layers, placement feedback, and vehicle controls.
- `assets/`: locally bundled original SVG artwork or small reusable SVG components, indexed by typed gallery definitions.

The logical board model is authoritative for rendering, validation, and export. Keep transient state (selection, preview, grid toggle, pan/zoom, pointer state, import dialog, animation frame and interpolated position) out of the persisted model. Use immutable updates and derive occupancy/road graph from canonical object/cell data rather than maintaining redundant copies.

## Hex geometry and board layouts

Use axial coordinates `(q, r)` internally and pointy-top hexes with logical radius `s` (center-to-vertex). The center in board-space units is:

`x = sqrt(3) * s * (q + r / 2)`

`y = 3 * s * r / 2`

This yields horizontal pointy-top rows with alternating half-column offsets. The six axial direction offsets, clockwise from screen-right, are `(1,0)`, `(1,-1)`, `(0,-1)`, `(-1,0)`, `(-1,1)`, `(0,1)`; opposite direction is index plus three modulo six. Use these exact shared utilities for roads, footprints, hit testing, and rendering.

For rectangular layout `(column, row)`, map to axial with `q = column - floor(row / 2)`, `r = row`; convert back with `column = q + floor(r / 2)`, `row = r`. The configured row/column bounds define valid cells. For a hex board of radius `R`, include axial cells satisfying `max(|q|, |r|, |q+r|) <= R`. Both shapes expose the same axial cell API. Cell size is logical board data, never auto-fit to the viewport; zoom is a separate viewport scale. Render each regular hex from the shared center/polygon utility so neighbors meet without gaps. Use axial rounding for hit-testing, then verify the candidate belongs to the generated board.

## Board, layers, and placement model

Board configuration contains schema-independent logical settings: optional name, shape and dimensions/radius, base cell radius, and orientation (`pointy`). A canonical cell collection keyed by axial coordinate stores terrain (`water`, `ground`, or `bridge`); omitted terrain may only imply water if that default remains unambiguous and is applied on parse. New boards explicitly initialize all valid cells as water.

Layer order is water/terrain, ground or bridge structures, layer-three objects (grass, trees, buildings, roads), then vehicles. Ground replaces water and supports compatible objects. Bridges replace water, store explicit directional ports and permitted entry-to-exit transitions, and can connect to roads only through compatible matching ports. Ordinary ground and bridge are mutually exclusive terrain states.

Gallery definitions are typed and stable: ID/type, display name, category/layer, footprint, allowed terrain, blocking behavior, and relevant constraints. Instances have a unique ID, type, axial anchor, and type-specific data. Grass, trees, and roads occupy one cell. Grass is decorative ground cover: it is allowed only on ground, blocks vehicle placement and traversal, and cannot share a cell with another layer-three object. A road stores an explicit set of zero to six connected sides; adjacency alone never creates an edge. Buildings support 2x2 and 2x3 parallelogram footprints, represented as fixed axial offset sets relative to one anchor. Derive occupied cells from the definition in one utility for both validation and drawing; require every cell to exist and have compatible ground, and reject overlap. Removal is by instance ID and frees its derived footprint.

Placement is a selection-preview-commit workflow. Convert pointer screen coordinates through the shared viewport transform to board coordinates and axial cell; derive full footprint; validate bounds, terrain, occupancy, and road/bridge constraints; show valid/invalid feedback; commit only a valid placement. Distinguish a click/tap from a pan gesture. Make removal and editing (including road sides and terrain) available without bypassing domain validation.

## Roads and vehicles

Represent road connections as explicit direction sets. A road graph has drivable cells as nodes; an edge exists only when neighboring cells both expose matching opposite ports, with bridge port/transition rules applied. Blocking objects and buildings cannot be traversed. Keep graph construction and route decisions independent from SVG and viewport state.

Vehicle persistent data includes ID/type, logical cell, and initial heading; simulation state (running/paused, prior direction, fractional segment progress) is transient. Place only on a drivable road/bridge cell, initially stopped. On start, require a valid next edge. At junctions use a documented deterministic policy: continue straight when possible, otherwise choose the first valid option in the shared clockwise direction ordering. At a dead end, reverse along the valid previous edge; stop if no safe edge exists. Animate between cell centers using elapsed time and `requestAnimationFrame`, not frame counts. Keep interpolation separate from logical occupancy and board rendering; pan/zoom must not affect route state. Clean up on pause, removal, board replacement, or unmount.

## Viewport and interaction

The bounded viewport owns screen-space pan and zoom, separate from base cell size. Render a board-space SVG group under one shared transform; use inverse transforms for hit-testing. On board creation/import, center its geometric bounds in the measured viewport at default zoom. On resize, preserve the viewed logical point where practical and clamp pan. Mouse wheel over the viewport and two-pointer pinch zoom around the pointer/midpoint; one pointer pans. Capture pointers and handle release/cancellation outside the viewport. Prevent page scrolling only while an active board gesture requires it. Apply reasonable pan bounds that keep board content reachable, including when the board is smaller than the viewport. Gallery and controls must not trigger board gestures or zoom. Hide-grid changes outlines only, never terrain, hit-testing, or logical data.

Desktop uses a main board workspace and independently scrollable adjacent gallery. Mobile uses a compact or collapsible gallery while preserving board area and touch-friendly controls. Use semantic controls, keyboard access, visible focus, accessible icon labels, and sufficient contrast for grid/placement states.

## Persistence format

Use a documented canonical JSON format with `schemaVersion: 1`, optional `name`, and `board` configuration (`shape`, relevant dimensions/radius, `cellSize`, `orientation`). Store logical cells/terrain and placed instances by stable `id`, `type`, axial `anchor`, and type-specific data: road `connections`, bridge `ports` and `transitions`, vehicle saved cell/heading. Building footprints are derived from stable type definitions rather than duplicated in every instance. Export type identifiers, not SVG or local paths.

Do not persist pan, zoom, grid visibility, selection, pointer/touch state, previews, DOM/runtime references, animation handles, or fractional vehicle animation. Import restores vehicles stopped at saved logical locations/headings and centers the board. Parsing, validation, migration, and serialization stay independent of React. Validate version, dimensions, coordinates, unique IDs, known types, footprints, terrain, occupancy, road/bridge connectivity, and vehicle locations before replacement. Parse into a candidate model and replace atomically only after all checks pass; ask confirmation before replacing an existing board. On failure, retain the existing board and show a useful error. Reject unsupported future schema versions and unknown required object types; keep migration functions explicit and manually verifiable. Export readable JSON with a date/name-based `.json` filename.

## Testing and acceptance

**Current testing policy:** No unit tests or test-framework dependencies for now. Do not add Vitest or React Testing Library unless the user later approves them. For each phase, run the available TypeScript/build and lint checks, then manually verify the phase's behavior in the browser, including desktop/mobile workflows where applicable. These checks do not mean unit-test coverage has been completed; test automation remains deferred.

Phase acceptance requires: stable shared geometry and fixed logical cells; both board shapes render and center; pan/zoom/placement remain coordinate-accurate; layer and occupancy rules hold; roads require explicit matching sides; car traverses only valid graph edges and safely reverses/stops; JSON round-trips logical data and failed imports do not mutate state; controls remain usable and accessible at desktop/mobile sizes. Do not mark a phase complete without its build/type/lint checks and manual acceptance checks.

## Assumptions, questions, and risks

- Proposed defaults: rectangular 20x14 board, hex radius 8, cell radius 32 logical units, default zoom 1, and zoom range 0.35-3.0. These are product defaults to review, not repository behavior.
- Building footprint orientation is a fixed axial parallelogram; decide which of the three equivalent axis orientations is presented in the gallery before implementing.
- Bridge transitions are explicit allowed direction pairs, not merely adjacency; whether one-way transitions are needed remains open. Default to undirected paired transitions unless product requirements say otherwise.
- Only one car is exposed initially; the model should use IDs and allow later extension to multiple cars.
- SVG rendering cost may become significant near the dimension limits; profile before adding virtualization, and preserve accurate hit-testing if culling is later introduced.
- Pointer capture, touch-action, zoom anchoring, panning bounds, and resize recentering can conflict; manually verify on real mobile browsers where available.
- The starter has no test dependencies or existing application architecture. Keep the initial implementation free of unit-test tooling; revisit automated tests only with user approval. Leave unrelated template cleanup out of scope unless it blocks the editor.