import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { ImportantArea, Room } from './room/RoomScene'
import { CameraRig } from './room/CameraRig'
import { CAMERA_SETTINGS, SCENE_MIN_WIDTH_PX } from './room/config'
import { getInitialCameraReadout } from './room/camera'
import './App.css'

function App() {
  const [floorPoint, setFloorPoint] = useState<Vector3 | null>(null)
  const [cameraReadout, setCameraReadout] = useState(getInitialCameraReadout)

  return (
    <main className="room-page">
      <section className="room-section" aria-label="Isometric room scene">
        <div className="room-viewport">
          <div className="room-scene-container" style={{ minWidth: SCENE_MIN_WIDTH_PX }}>
            <Canvas
              className="room-canvas"
              orthographic
              shadows="percentage"
              dpr={[1, 1.5]}
              camera={{
                position: CAMERA_SETTINGS.position,
                up: CAMERA_SETTINGS.up,
                near: CAMERA_SETTINGS.near,
                far: CAMERA_SETTINGS.far,
              }}
              gl={{ antialias: true, alpha: false }}
              onPointerMissed={() => setFloorPoint(null)}
            >
              <color attach="background" args={['#dfe1df']} />
              <CameraRig onCameraChange={setCameraReadout} />
              <ambientLight intensity={1.15} />
              <directionalLight
                castShadow
                position={[-6, -8, 18]}
                intensity={2.2}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
                shadow-bias={-0.0002}
              />
              <Room onFloorPoint={setFloorPoint} floorPoint={floorPoint} />
              <ImportantArea />
            </Canvas>
          </div>
          <div className="camera-readout" aria-label="Live camera values">
            <p className="camera-readout-title">CAMERA / LIVE</p>
            <div className="camera-readout-row">
              <span>ROTATION</span>
              <output>
                X {cameraReadout.rotation[0].toFixed(1)}° / Y {cameraReadout.rotation[1].toFixed(1)}° / Z{' '}
                {cameraReadout.rotation[2].toFixed(1)}°
              </output>
            </div>
            <div className="camera-readout-row">
              <span>ZOOM</span>
              <output>{cameraReadout.zoom.toFixed(2)}×</output>
            </div>
            <div className="camera-readout-row">
              <span>PAN TARGET</span>
              <output>
                X {cameraReadout.pan[0].toFixed(2)} / Y {cameraReadout.pan[1].toFixed(2)} / Z{' '}
                {cameraReadout.pan[2].toFixed(2)}
              </output>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
