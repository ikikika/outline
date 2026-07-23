# Implementation Plan

## Milestone 1: Fixed Room Prototype

Status: implemented in this repository.

- Establish a React Three Fiber canvas in a dedicated horizontally scrollable viewport.
- Keep the scene at least 1280 CSS pixels wide and fill the viewport height; let it fill wider viewports.
- Define room, camera, layout, and important-area values outside rendering logic.
- Set the room's fixed world-space width and center with `ROOM.width` and `ROOM.centerX`; keep room geometry independent of canvas width.
- Render an XY floor, two Z-up walls meeting at the rear corner, no ceiling, placeholder furniture, and a human-shaped avatar stand-in.
- Use an orthographic camera with a configurable startup angle and fixed vertical world-space span. Extend the right frustum edge as the actual canvas grows without recentering or automatic zooming; allow user-controlled rotation, pan, and zoom.
- Use the floor mesh's R3F raycast point to report world coordinates. Stop propagation on non-floor geometry.
- Verify production build, lint, viewport behavior at 390, 1280, 1440, and 1920 CSS pixels, and pointer mapping after horizontal scroll.

## Milestone 2: Room Composition and Materials

- Tune room dimensions, camera pose, light direction, and important-area bounds against desktop and narrow viewport screenshots.
- Replace flat placeholder surfaces with a restrained set of physically based material maps where they improve readability.
- Add furniture as isolated components with dimensions and origins documented in room/world coordinates.
- Keep scene geometry and avatar movement independent of the camera and browser layout.

## Milestone 3: Avatar Asset and Animation

- Add a rigged GLB avatar and verify model scale, up-axis, origin, and animation names at import time.
- Introduce an avatar component that owns the model and animation mixer while exposing a world-space position interface.
- Add idle and locomotion animations, transitions, and basic collision-aware movement only after asset scale and floor interaction are stable.
- Preserve the current `IMPORTANT_AREA.avatarPosition` as the initial spawn configuration.

## Milestone 4: Click-to-Move

- Convert floor clicks into a typed movement destination using the existing raycast world point.
- Add pathfinding only if obstacles require it; keep path coordinates in the same XY plane and Z-up world system.
- Make floor, wall, and furniture interaction outcomes explicit and test them after horizontal scrolling at multiple viewport sizes.
- Add keyboard and touch alternatives with clear focus and input behavior.

## Verification Gates

1. `npm run build` and `npm run lint` pass.
2. The floor and two rear-corner walls render without a ceiling, with a visibly wedge-like projected floor.
3. At widths below 1280px, the canvas remains 1280px wide and scrolls inside `.room-viewport`; the document has no unintended horizontal overflow.
4. At 1280px, the important-area avatar and core room arrangement appear in the initial view. At wider widths, the fixed-size room stays unchanged while more of the surrounding viewport is revealed.
5. Resizing does not alter world object proportions, camera pose, vertical world span, or scroll position.
6. Floor clicks before and after manual scrolling report raycast world coordinates; wall and object clicks do not update the floor readout.
7. Avoid automatic framing; verify user-controlled rotation, pan, and zoom do not alter geometry proportions or floor raycasting.