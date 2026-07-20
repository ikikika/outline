# Hexboard

A browser-based hexagonal game-board editor built with React, TypeScript, and Vite.

## Development

```sh
npm install
npm run dev
```

Run the production typecheck/build with `npm run build` and lint with `npm run lint`.

## Current scope

The app supports rectangular and hexagonal water boards, pointy-top SVG rendering, pan/zoom, a full-viewport `/board` page, terrain painting, bridge direction configuration, grid visibility, a bundled object gallery, placement previews, and placement/removal for terrain, objects, and cars. Autonomous vehicle movement, road editing, persistence, and JSON import/export remain planned for later phases. Unit tests and test-framework dependencies are deferred.

See [docs/context.md](docs/context.md) for architecture and [docs/implementation-plan.md](docs/implementation-plan.md) for phase scope and acceptance criteria.
