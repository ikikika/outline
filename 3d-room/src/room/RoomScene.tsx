import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { IMPORTANT_AREA, ROOM, ROOM_BOUNDS } from './config'

type RoomProps = {
  floorPoint: Vector3 | null
  onFloorPoint: (point: Vector3) => void
}

function Floor({ floorPoint, onFloorPoint }: RoomProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  return (
    <group>
      <mesh
        name="floor"
        receiveShadow
        position={[ROOM_BOUNDS.center, ROOM.centerY, 0]}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          pointerStart.current = {
            x: event.nativeEvent.clientX,
            y: event.nativeEvent.clientY,
          }
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          const start = pointerStart.current
          pointerStart.current = null
          if (!start) return

          const deltaX = event.nativeEvent.clientX - start.x
          const deltaY = event.nativeEvent.clientY - start.y
          if (Math.hypot(deltaX, deltaY) > 4) return

          onFloorPoint(event.point.clone())
        }}
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#b8aa93" roughness={0.86} />
      </mesh>
      {floorPoint && (
        <mesh position={[floorPoint.x, floorPoint.y, 0.025]}>
          <ringGeometry args={[0.12, 0.17, 32]} />
          <meshBasicMaterial color="#a64f36" />
        </mesh>
      )}
    </group>
  )
}

function Walls() {
  const maxY = ROOM.centerY + ROOM.depth / 2
  const minX = ROOM_BOUNDS.left

  return (
    <group
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <mesh
        castShadow
        receiveShadow
        position={[ROOM_BOUNDS.center, maxY, ROOM.wallHeight / 2]}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <boxGeometry args={[ROOM.width, ROOM.wallThickness, ROOM.wallHeight]} />
        <meshStandardMaterial color="#d5d3ca" roughness={0.94} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[minX, ROOM.centerY, ROOM.wallHeight / 2]}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <boxGeometry args={[ROOM.wallThickness, ROOM.depth, ROOM.wallHeight]} />
        <meshStandardMaterial color="#c8cbc7" roughness={0.94} />
      </mesh>
      <mesh position={[ROOM_BOUNDS.center, maxY - ROOM.wallThickness / 2 - 0.01, 0.12]}>
        <boxGeometry args={[ROOM.width - 0.1, 0.1, 0.24]} />
        <meshStandardMaterial color="#e8e5dc" roughness={0.78} />
      </mesh>
      <mesh position={[minX + ROOM.wallThickness / 2 + 0.01, ROOM.centerY, 0.12]}>
        <boxGeometry args={[0.1, ROOM.depth - 0.1, 0.24]} />
        <meshStandardMaterial color="#e1dfd7" roughness={0.78} />
      </mesh>
    </group>
  )
}

// function Rug() {
//   return (
//     <group
//       position={[-1.2, -0.45, 0.035]}
//       onPointerDown={(event) => event.stopPropagation()}
//       onClick={(event) => event.stopPropagation()}
//     >
//       <mesh receiveShadow>
//         <boxGeometry args={[5.1, 3.1, 0.06]} />
//         <meshStandardMaterial color="#92988e" roughness={1} />
//       </mesh>
//       <mesh position={[0, 0, 0.035]}>
//         <boxGeometry args={[4.82, 2.82, 0.01]} />
//         <meshStandardMaterial color="#a5a99e" roughness={1} />
//       </mesh>
//     </group>
//   )
// }

// function Sofa() {
//   return (
//     <group
//       position={[-2.1, 4.2, 0]}
//       onPointerDown={(event) => event.stopPropagation()}
//       onClick={(event) => event.stopPropagation()}
//     >
//       <mesh castShadow receiveShadow position={[0, 0, 0.38]}>
//         <boxGeometry args={[4.4, 1.35, 0.58]} />
//         <meshStandardMaterial color="#797d77" roughness={0.92} />
//       </mesh>
//       <mesh castShadow receiveShadow position={[0, 0.52, 0.96]}>
//         <boxGeometry args={[4.4, 0.34, 1.24]} />
//         <meshStandardMaterial color="#858981" roughness={0.94} />
//       </mesh>
//       {[-1.35, 0, 1.35].map((x) => (
//         <mesh key={x} castShadow receiveShadow position={[x, -0.06, 0.69]}>
//           <boxGeometry args={[1.24, 1.15, 0.46]} />
//           <meshStandardMaterial color="#92958d" roughness={0.96} />
//         </mesh>
//       ))}
//       {[-1.8, 1.8].map((x) => (
//         <mesh key={x} castShadow position={[x, -0.02, 0.48]}>
//           <boxGeometry args={[0.32, 1.48, 0.88]} />
//           <meshStandardMaterial color="#737871" roughness={0.92} />
//         </mesh>
//       ))}
//     </group>
//   )
// }

// function CoffeeTable() {
//   return (
//     <group
//       position={[1.8, 0.9, 0]}
//       onPointerDown={(event) => event.stopPropagation()}
//       onClick={(event) => event.stopPropagation()}
//     >
//       <mesh castShadow receiveShadow position={[0, 0, 0.68]}>
//         <boxGeometry args={[2.3, 1.22, 0.14]} />
//         <meshStandardMaterial color="#88765e" roughness={0.54} />
//       </mesh>
//       {[-0.92, 0.92].flatMap((x) =>
//         [-0.42, 0.42].map((y) => (
//           <mesh key={`${x}-${y}`} castShadow position={[x, y, 0.33]}>
//             <boxGeometry args={[0.09, 0.09, 0.64]} />
//             <meshStandardMaterial color="#6e6252" roughness={0.62} />
//           </mesh>
//         )),
//       )}
//     </group>
//   )
// }

// function Console() {
//   return (
//     <group
//       position={[9, 5.7, 0]}
//       onPointerDown={(event) => event.stopPropagation()}
//       onClick={(event) => event.stopPropagation()}
//     >
//       <mesh castShadow receiveShadow position={[0, 0, 0.55]}>
//         <boxGeometry args={[4.2, 0.68, 1.02]} />
//         <meshStandardMaterial color="#8b7c69" roughness={0.68} />
//       </mesh>
//       <mesh castShadow position={[0, -0.365, 0.56]}>
//         <boxGeometry args={[3.88, 0.035, 0.66]} />
//         <meshStandardMaterial color="#b4aa98" roughness={0.65} />
//       </mesh>
//       <mesh castShadow position={[0, 0, 1.13]}>
//         <boxGeometry args={[4.26, 0.74, 0.12]} />
//         <meshStandardMaterial color="#a6957d" roughness={0.52} />
//       </mesh>
//     </group>
//   )
// }

// function Plant() {
//   return (
//     <group
//       position={[20.5, 7, 0]}
//       onPointerDown={(event) => event.stopPropagation()}
//       onClick={(event) => event.stopPropagation()}
//     >
//       <mesh castShadow receiveShadow position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
//         <cylinderGeometry args={[0.34, 0.42, 0.7, 20]} />
//         <meshStandardMaterial color="#887866" roughness={0.76} />
//       </mesh>
//       <mesh castShadow position={[0, 0, 1.1]}>
//         <sphereGeometry args={[0.72, 20, 16]} />
//         <meshStandardMaterial color="#657462" roughness={0.94} />
//       </mesh>
//       <mesh castShadow position={[-0.38, 0.12, 1.34]}>
//         <sphereGeometry args={[0.48, 18, 14]} />
//         <meshStandardMaterial color="#77836f" roughness={0.96} />
//       </mesh>
//       <mesh castShadow position={[0.34, -0.1, 1.42]}>
//         <sphereGeometry args={[0.5, 18, 14]} />
//         <meshStandardMaterial color="#596a58" roughness={0.96} />
//       </mesh>
//     </group>
//   )
// }

function AvatarPlaceholder() {
  const localPosition = IMPORTANT_AREA.avatarPosition.map(
    (coordinate, index) => coordinate - IMPORTANT_AREA.center[index],
  ) as [number, number, number]

  return (
    <group
      position={localPosition}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <mesh castShadow receiveShadow position={[0, 0, 0.46]}>
        <boxGeometry args={[0.17, 0.22, 0.82]} />
        <meshStandardMaterial color="#343b3a" roughness={0.84} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0, 1.12]}>
        <boxGeometry args={[0.42, 0.25, 0.62]} />
        <meshStandardMaterial color="#68726d" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, -0.01, 1.62]}>
        <sphereGeometry args={[0.16, 20, 16]} />
        <meshStandardMaterial color="#b88d70" roughness={0.78} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} castShadow position={[x, 0, 1.12]}>
          <boxGeometry args={[0.12, 0.14, 0.57]} />
          <meshStandardMaterial color="#68726d" roughness={0.9} />
        </mesh>
      ))}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} castShadow position={[x, -0.035, 0.055]}>
          <boxGeometry args={[0.17, 0.32, 0.11]} />
          <meshStandardMaterial color="#343b3a" roughness={0.82} />
        </mesh>
      ))}
    </group>
  )
}

export function Room({ floorPoint, onFloorPoint }: RoomProps) {
  return (
    <group>
      <Floor floorPoint={floorPoint} onFloorPoint={onFloorPoint} />
      <Walls />
    </group>
  )
}

export function ImportantArea() {
  return (
    <group
      name="important-area"
      position={IMPORTANT_AREA.center}
      userData={{ bounds: IMPORTANT_AREA.size }}
    >
      <AvatarPlaceholder />
    </group>
  )
}