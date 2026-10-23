import { memo } from 'react'
import { HEX_DIRECTIONS, type AxialCoordinate, type BoardModel, type HexDirection } from '../domain/types'
import type { BoardBounds } from '../geometry/board-layout'
import { getHexCenter, getHexVertices } from '../geometry/hex'
import { getGalleryArtForObject, CAR_ART } from '../gallery/catalogue'
import { getFootprintBounds, getObjectFootprint, isRoadType } from '../domain/placement'
import { getRoadConnectionIssues } from '../domain/roads'
import { RoadGlyph } from './RoadGlyph'

export interface VehicleProjection {
  vehicleId: string
  from: AxialCoordinate
  to: AxialCoordinate
  direction: HexDirection
  progress: number
}

interface BoardSvgProps {
  board: BoardModel
  bounds: BoardBounds
  gridVisible: boolean
  vehicleProjection?: VehicleProjection | null
}

function getTerrainFill(type: string): string {
  switch (type) {
    case 'ground':
      return '#829f6b'
    case 'bridge':
      return '#c59b67'
    default:
      return '#76b9c3'
  }
}

export const BoardSvg = memo(function BoardSvg({
  board,
  bounds,
  gridVisible,
  vehicleProjection = null,
}: BoardSvgProps) {
  const cellRadius = board.configuration.cellSize
  const cells = Object.values(board.cells)
  const unconnectedPorts = new Map<string, HexDirection[]>()
  for (const issue of getRoadConnectionIssues(board)) {
    const directions = unconnectedPorts.get(issue.objectId) ?? []
    directions.push(issue.direction)
    unconnectedPorts.set(issue.objectId, directions)
  }

  return (
    <svg
      className="board-svg"
      xmlns="http://www.w3.org/2000/svg"
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label={`${board.configuration.shape} hexagonal board with ${cells.length} cells`}
    >
      {cells.map((cell) => {
        const points = getHexVertices(cell.coordinate, cellRadius)
          .map(({ x, y }) => `${x},${y}`)
          .join(' ')

        return (
          <g key={`${cell.coordinate.q},${cell.coordinate.r}`}>
            <polygon
              className="board-cell"
              data-coordinate={`${cell.coordinate.q},${cell.coordinate.r}`}
              points={points}
              fill={getTerrainFill(cell.terrain.type)}
              stroke={gridVisible ? '#e4f2eb' : 'none'}
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
      {cells.filter((cell) => cell.terrain.type === 'bridge').map((cell) => (
        <RoadGlyph
          key={`bridge-${cell.coordinate.q},${cell.coordinate.r}`}
          coordinate={cell.coordinate}
          cellRadius={cellRadius}
          connections={cell.terrain.type === 'bridge' ? cell.terrain.ports : []}
          unconnectedConnections={unconnectedPorts.get(`bridge:${cell.coordinate.q},${cell.coordinate.r}`) ?? []}
          variant="bridge"
        />
      ))}
      {board.objects.map((object) => {
        if (isRoadType(object.type) && 'connections' in object) {
          return (
            <RoadGlyph
              key={object.id}
              coordinate={object.anchor}
              cellRadius={cellRadius}
              connections={object.connections}
              unconnectedConnections={unconnectedPorts.get(object.id) ?? []}
            />
          )
        }

        const footprint = getObjectFootprint(object.type, object.anchor)
        const definitionBounds = getFootprintBounds(footprint, cellRadius)
        const anchorCenter = getHexCenter(object.anchor, cellRadius)
        const isMultiCell = footprint.length > 1
        const width = isMultiCell ? definitionBounds?.width ?? cellRadius * 2 : cellRadius * 2.1
        const height = isMultiCell ? definitionBounds?.height ?? cellRadius * 2 : cellRadius * 2.1
        const x = isMultiCell
          ? definitionBounds?.minX ?? anchorCenter.x - width / 2
          : anchorCenter.x - width / 2
        const y = isMultiCell
          ? definitionBounds?.minY ?? anchorCenter.y - height / 2
          : anchorCenter.y - height / 2

        return (
          <image
            key={object.id}
            className="board-art board-object"
            data-object-id={object.id}
            data-object-type={object.type}
            href={getGalleryArtForObject(object.type)}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        )
      })}
      {board.vehicles.map((vehicle) => {
        const projection = vehicleProjection?.vehicleId === vehicle.id
          ? vehicleProjection
          : null
        const from = projection?.from ?? vehicle.coordinate
        const to = projection?.to ?? vehicle.coordinate
        const fromCenter = getHexCenter(from, cellRadius)
        const toCenter = getHexCenter(to, cellRadius)
        const center = {
          x: fromCenter.x + (toCenter.x - fromCenter.x) * (projection?.progress ?? 0),
          y: fromCenter.y + (toCenter.y - fromCenter.y) * (projection?.progress ?? 0),
        }
        const directionIndex = HEX_DIRECTIONS.indexOf(
          projection?.direction ?? vehicle.heading,
        )
        const headingAngle = [90, 30, -30, -90, -150, 150][directionIndex]
        const iconSize = cellRadius * 1.55

        return (
          <image
            key={vehicle.id}
            className="board-art board-vehicle"
            data-vehicle-id={vehicle.id}
            href={CAR_ART}
            x={center.x - iconSize / 2}
            y={center.y - iconSize / 2}
            width={iconSize}
            height={iconSize}
            transform={`rotate(${headingAngle} ${center.x} ${center.y})`}
            preserveAspectRatio="xMidYMid meet"
          />
        )
      })}
    </svg>
  )
})