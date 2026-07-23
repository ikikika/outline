import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import {
  OrbitControls as DreiOrbitControls,
  OrthographicCamera as DreiOrthographicCamera,
} from '@react-three/drei'
import { MOUSE, OrthographicCamera, TOUCH } from 'three'
import { getCameraFrustum, getCameraReadout, getInitialCameraReadout } from './camera'
import { CAMERA_SETTINGS } from './config'

type CameraRigProps = {
  onCameraChange: (values: ReturnType<typeof getCameraReadout>) => void
}

export function CameraRig({ onCameraChange }: CameraRigProps) {
  const cameraRef = useRef<OrthographicCamera>(null)
  const controlsRef = useRef<ComponentRef<typeof DreiOrbitControls>>(null)
  const size = useThree((state) => state.size)
  const lastReadout = useRef(JSON.stringify(getInitialCameraReadout()))

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return

    // Set the camera pose once; resize handling below only changes projection bounds.
    camera.up.set(...CAMERA_SETTINGS.up)
    camera.position.set(...CAMERA_SETTINGS.position)
    camera.lookAt(...CAMERA_SETTINGS.target)
    camera.updateMatrixWorld()
  }, [])

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return

    const frustum = getCameraFrustum(size.width, size.height)
    camera.left = frustum.left
    camera.right = frustum.right
    camera.top = frustum.top
    camera.bottom = frustum.bottom
    camera.updateProjectionMatrix()
  }, [size.width, size.height])

  return (
    <>
      <DreiOrthographicCamera
        ref={cameraRef}
        makeDefault
        position={CAMERA_SETTINGS.position}
        up={CAMERA_SETTINGS.up}
        zoom={CAMERA_SETTINGS.zoom}
        near={CAMERA_SETTINGS.near}
        far={CAMERA_SETTINGS.far}
      />
      <DreiOrbitControls
        makeDefault
        target={CAMERA_SETTINGS.target}
        enableRotate
        enablePan
        enableZoom
        screenSpacePanning
        enableDamping
        dampingFactor={0.12}
        minZoom={0.65}
        maxZoom={2.2}
        ref={controlsRef}
        onChange={() => {
          const camera = cameraRef.current
          const target = controlsRef.current?.target
          if (!camera || !target) return

          const values = getCameraReadout(camera, target)
          const serialized = JSON.stringify(values)
          if (serialized === lastReadout.current) return

          lastReadout.current = serialized
          onCameraChange(values)
        }}
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        touches={{
          ONE: TOUCH.ROTATE,
          TWO: TOUCH.DOLLY_PAN,
        }}
      />
    </>
  )
}