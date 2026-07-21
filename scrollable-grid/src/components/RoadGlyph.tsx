import type { AxialCoordinate, HexDirection } from '../domain/types'
import { getNeighborCoordinate } from '../geometry/hex'
import { getHexCenter } from '../geometry/hex'

interface RoadGlyphProps {
  coordinate: AxialCoordinate
  cellRadius: number
  connections: readonly HexDirection[]
  unconnectedConnections?: readonly HexDirection[]
  variant?: 'road' | 'bridge'
}

export function RoadGlyph({
  coordinate,
  cellRadius,
  connections,
  unconnectedConnections = [],
  variant = 'road',
}: RoadGlyphProps) {
  const center = getHexCenter(coordinate, cellRadius)
  const roadWidth = cellRadius * 0.48
  const laneWidth = Math.max(1.5, cellRadius * 0.055)
  const dash = `${cellRadius * 0.24} ${cellRadius * 0.19}`
  const edgeColor = variant === 'bridge' ? '#765841' : '#e4e3d6'
  const surfaceColor = variant === 'bridge' ? '#d8ad73' : '#4c5554'
  const laneColor = variant === 'bridge' ? '#fff0c9' : '#f1d786'

  return (
    <g
      className={`board-road board-${variant}`}
      data-road-connections={connections.join(',')}
      data-unconnected-connections={unconnectedConnections.join(',')}
    >
      {connections.map((direction) => {
        const neighbor = getNeighborCoordinate(coordinate, direction)
        const neighborCenter = getHexCenter(neighbor, cellRadius)
        const endX = (center.x + neighborCenter.x) / 2
        const endY = (center.y + neighborCenter.y) / 2
        const path = `M ${center.x} ${center.y} L ${endX} ${endY}`
        const isUnconnected = unconnectedConnections.includes(direction)

        return (
          <g key={direction} data-road-direction={direction}>
            <path
              d={path}
              fill="none"
              stroke={edgeColor}
              strokeWidth={roadWidth + 2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path}
              fill="none"
              stroke={surfaceColor}
              strokeWidth={roadWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path}
              fill="none"
              stroke={laneColor}
              strokeWidth={laneWidth}
              strokeDasharray={dash}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {isUnconnected && (
              <circle
                cx={endX}
                cy={endY}
                r={cellRadius * 0.095}
                fill="#d95f51"
                stroke="#fff5e8"
                strokeWidth={Math.max(1.5, cellRadius * 0.035)}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        )
      })}
    </g>
  )
}