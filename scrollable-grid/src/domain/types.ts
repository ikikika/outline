export const HEX_DIRECTIONS = [
  'east',
  'northEast',
  'northWest',
  'west',
  'southWest',
  'southEast',
] as const

export type HexDirection = (typeof HEX_DIRECTIONS)[number]
export type BoardShape = 'rectangular' | 'hexagonal'
export type TerrainType = 'water' | 'ground' | 'bridge'

export interface AxialCoordinate {
  q: number
  r: number
}

export interface RectangularBoardConfig {
  shape: 'rectangular'
  columns: number
  rows: number
  cellSize: number
  name?: string
}

export interface HexagonalBoardConfig {
  shape: 'hexagonal'
  radius: number
  cellSize: number
  name?: string
}

export type BoardConfig = RectangularBoardConfig | HexagonalBoardConfig

export interface BridgeTransition {
  entry: HexDirection
  exit: HexDirection
}

export type Terrain =
  | { type: 'water' }
  | { type: 'ground' }
  | {
      type: 'bridge'
      ports: HexDirection[]
      transitions: BridgeTransition[]
    }

export interface BoardCell {
  coordinate: AxialCoordinate
  terrain: Terrain
}

export type ObjectType =
  | 'grass'
  | 'tree-deciduous'
  | 'tree-conifer'
  | 'building-2x2'
  | 'building-2x3'
  | 'road'

export type ObjectFootprint =
  | { type: 'single' }
  | { type: 'parallelogram'; columns: number; rows: number }

export interface ObjectDefinition {
  type: ObjectType
  displayName: string
  layer: 3
  footprint: ObjectFootprint
  permittedTerrain: readonly TerrainType[]
  blocksVehicles: boolean
}

interface PlacedObjectBase {
  id: string
  anchor: AxialCoordinate
}

export interface GrassObject extends PlacedObjectBase {
  type: 'grass'
}

export interface TreeObject extends PlacedObjectBase {
  type: 'tree-deciduous' | 'tree-conifer'
}

export interface BuildingObject extends PlacedObjectBase {
  type: 'building-2x2' | 'building-2x3'
}

export interface RoadObject extends PlacedObjectBase {
  type: 'road'
  connections: HexDirection[]
}

export type PlacedObject =
  | GrassObject
  | TreeObject
  | BuildingObject
  | RoadObject

export interface VehicleInstance {
  id: string
  type: 'car'
  coordinate: AxialCoordinate
  heading: HexDirection
}

export interface BoardModel {
  configuration: BoardConfig
  cells: Record<string, BoardCell>
  objects: PlacedObject[]
  vehicles: VehicleInstance[]
}

export const OBJECT_DEFINITIONS: readonly ObjectDefinition[] = [
  {
    type: 'grass',
    displayName: 'Grass',
    layer: 3,
    footprint: { type: 'single' },
    permittedTerrain: ['ground'],
    blocksVehicles: true,
  },
  {
    type: 'tree-deciduous',
    displayName: 'Deciduous tree',
    layer: 3,
    footprint: { type: 'single' },
    permittedTerrain: ['ground'],
    blocksVehicles: true,
  },
  {
    type: 'tree-conifer',
    displayName: 'Conifer tree',
    layer: 3,
    footprint: { type: 'single' },
    permittedTerrain: ['ground'],
    blocksVehicles: true,
  },
  {
    type: 'building-2x2',
    displayName: '2 x 2 building',
    layer: 3,
    footprint: { type: 'parallelogram', columns: 2, rows: 2 },
    permittedTerrain: ['ground'],
    blocksVehicles: true,
  },
  {
    type: 'building-2x3',
    displayName: '2 x 3 building',
    layer: 3,
    footprint: { type: 'parallelogram', columns: 2, rows: 3 },
    permittedTerrain: ['ground'],
    blocksVehicles: true,
  },
  {
    type: 'road',
    displayName: 'Road',
    layer: 3,
    footprint: { type: 'single' },
    permittedTerrain: ['ground'],
    blocksVehicles: false,
  },
]