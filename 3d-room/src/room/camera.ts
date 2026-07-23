import { OrthographicCamera, Vector3 } from 'three'
import { CAMERA_SETTINGS, SCENE_HEIGHT_PX, SCENE_MIN_WIDTH_PX } from './config'

export type CameraReadout = {
  rotation: [number, number, number]
  zoom: number
  pan: [number, number, number]
}

function round(value: number, places = 2) {
  return Number(value.toFixed(places))
}

export function getCameraReadout(camera: OrthographicCamera, target: Vector3): CameraReadout {
  return {
    rotation: [
      round((camera.rotation.x * 180) / Math.PI, 1),
      round((camera.rotation.y * 180) / Math.PI, 1),
      round((camera.rotation.z * 180) / Math.PI, 1),
    ],
    zoom: round(camera.zoom),
    pan: [round(target.x), round(target.y), round(target.z)],
  }
}

export function getInitialCameraReadout() {
  const camera = new OrthographicCamera()
  camera.up.set(...CAMERA_SETTINGS.up)
  camera.position.set(...CAMERA_SETTINGS.position)
  camera.lookAt(new Vector3(...CAMERA_SETTINGS.target))

  return getCameraReadout(camera, new Vector3(...CAMERA_SETTINGS.target))
}

export function getCameraFrustum(width: number, height: number) {
  const safeHeight = height || SCENE_HEIGHT_PX
  const initialWorldWidth = (SCENE_MIN_WIDTH_PX / safeHeight) * CAMERA_SETTINGS.verticalSpan
  // Keep the initial composition's left edge anchored and reveal more world on the right.
  const left = -initialWorldWidth / 2
  const currentWorldWidth = (width / safeHeight) * CAMERA_SETTINGS.verticalSpan

  return {
    left,
    right: left + currentWorldWidth,
    top: CAMERA_SETTINGS.verticalSpan / 2,
    bottom: -CAMERA_SETTINGS.verticalSpan / 2,
  }
}
