# Hexboard

A browser-based hexagonal game-board editor built with React, TypeScript, and Vite.

## Development

```sh
npm install
npm run dev
```

Run the production typecheck/build with `npm run build` and lint with `npm run lint`.

## Current scope

The app supports rectangular and hexagonal boards, pointy-top SVG rendering, pan/zoom, a full-viewport `/board` page, terrain painting, bridge direction configuration, grid visibility, a bundled object gallery, footprint-aware placement/removal, explicit six-side road editing, autonomous vehicle movement, and versioned JSON import/export. Keyboard users can navigate cells with the arrow keys plus `Q`/`E` and activate the selected tool with Enter or Space. Hold Shift with an arrow key to pan. Unit tests and test-framework dependencies are deferred.

## Supported limits

- Rectangular boards: 1-80 columns and 1-80 rows.
- Hexagonal boards: radius 0-40.
- Vehicles: one car per board.
- Cell size: any finite positive value; performance at unusually large cell sizes has not been characterized.
- JSON persistence: schema version 1 only. Unsupported versions and unknown fields are rejected.

Create a board, edit cells and objects, connect matching road/bridge ports, place a car on a connected route and use Run to drive. Export JSON to save the logical board; import validates the whole file and asks before replacing the current board.

See [docs/context.md](docs/context.md) for architecture and [docs/implementation-plan.md](docs/implementation-plan.md) for phase scope and acceptance criteria.
