# Project Context

## Purpose

This repository is a React, TypeScript, and Vite prototype for an interactive orthographic isometric room. The current milestone establishes an initial room composition, user-controlled camera rotation, panning and zoom, horizontal reveal on wide scenes, horizontal scrolling on small viewports, and a floor interaction that reports world coordinates. The avatar and furniture are intentionally primitive placeholders rather than production assets.

## Stack

- React 19 and TypeScript
- Vite 8
- Three.js, React Three Fiber, and `@react-three/drei`
- CSS owns the viewport, horizontal scroll container, and minimum scene width
- R3F owns scene rendering, resize observation, raycasting, and world-space pointer events

## Scene Structure

- `src/App.tsx`: page shell, scroll viewport, canvas, lights, and floor-point readout
- `src/room/config.ts`: room dimensions, initial camera pose, scene sizing, and important-area bounds
- `src/room/camera.ts`: orthographic frustum calculation
- `src/room/CameraRig.tsx`: applies the fixed camera pose and responsive frustum
- `src/room/RoomScene.tsx`: floor, walls, placeholder furniture, avatar, and pointer handling
- `src/App.css` and `src/index.css`: presentation and viewport sizing

The world is Z-up. X and Y define the floor plane; walls and object heights use Z. The floor is a raycastable XY plane. The two wall meshes meet at the back corner, and no ceiling is present.

## Layout and Camera Contract

`.room-viewport` is the sole horizontal scroll container. Its child `.room-scene-container` has a CSS width of `max(100%, 1280px)` and a height of `100dvh`. The document root clips incidental horizontal overflow so the browser page itself does not become wider than its viewport.

R3F measures the actual canvas element with its resize observer. The vertical orthographic span remains `CAMERA_SETTINGS.verticalSpan` world units. At 1280 CSS pixels, the horizontal span is derived from the scene canvas aspect ratio and the scene height. On wider canvases, the left frustum edge stays fixed while the right edge moves outward. Thus the original composition keeps its apparent size and position, while the additional width reveals more world space to the right. Narrow browser viewports scroll the unchanged 1280-pixel canvas.

`ROOM.width` and `ROOM.centerX` set the fixed world-space X extent of the floor and rear wall; `ROOM.depth` sets their Y extent. These dimensions do not stretch with the canvas or camera zoom. At wider canvas sizes, the fixed room occupies less of the viewport and additional space is visible around it.

The camera's initial position, up vector, and target are set by `CameraRig`; resizing changes only orthographic bounds and the projection matrix. Left-drag or one-finger touch rotates the camera, right-drag pans, and the wheel zooms. Two-finger touch pans and zooms. There is no zoom-to-fit behavior or resize-triggered scroll adjustment.

The `IMPORTANT_AREA` config defines its center, dimensions, and avatar start position. That group is scene metadata and rendered content, not an HTML overlay. Keep the area within the initial 1280-pixel scene composition when changing the camera or room configuration.

## Pointer Contract

Only clicks on the dedicated floor mesh report a destination candidate. Its R3F click event supplies the raycast intersection in world coordinates (`event.point`); no browser coordinates or scroll offsets are used to calculate the point. Walls, furniture, the rug, and avatar stop propagation so clicks on them cannot be mistaken for floor clicks. Pointer movement beyond the click threshold is reserved for camera controls. The current prototype displays a small floor marker and coordinate readout; movement and pathfinding are out of scope.

## Current Limitations

- The human-shaped placeholder is assembled from simple meshes and has no rig or animation.
- Furniture and surfaces use neutral placeholder geometry and flat materials; there are no imported GLB assets or texture maps.
- The initial experience validates click-to-world-coordinate input but does not move the avatar.
- A production-quality visual pass, accessibility review of canvas interactions, and browser/device performance profiling remain future work.