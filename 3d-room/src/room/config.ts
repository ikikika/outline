export const SCENE_MIN_WIDTH_PX = 1280
export const SCENE_HEIGHT_PX = 680

export const ROOM = {
  width: 10,
  depth: 10,
  wallHeight: 5,
  wallThickness: 0.28,
  centerX: 0, // Fixed world-space center
  centerY: 0,
}

export const ROOM_BOUNDS = {
  left: ROOM.centerX - ROOM.width / 2,
  right: ROOM.centerX + ROOM.width / 2,
  center: ROOM.centerX,
  width: ROOM.width,
}

export const CAMERA_SETTINGS = {
  verticalSpan: 14.3,
  zoom: 1,
  position: [24.66, -23.54, 28.2] as [number, number, number],
  up: [0, 0, 1] as [number, number, number],
  target: [4.66, 3.46, 4.2] as [number, number, number],
  near: 0.1,
  far: 100,
}

export const IMPORTANT_AREA = {
  center: [0, 0, 0] as [number, number, number],
  size: [18, 13] as [number, number],
  avatarPosition: [-1.2, -2.1, 0] as [number, number, number],
}