import waterArt from '../assets/objects/water.svg'
import groundArt from '../assets/objects/ground.svg'
import bridgeArt from '../assets/objects/bridge.svg'
import grassArt from '../assets/objects/grass.svg'
import deciduousTreeArt from '../assets/objects/tree-deciduous.svg'
import coniferTreeArt from '../assets/objects/tree-conifer.svg'
import smallBuildingArt from '../assets/objects/building-2x2.svg'
import largeBuildingArt from '../assets/objects/building-2x3.svg'
import straightRoadArt from '../assets/objects/road-straight.svg'
import northWestSouthEastRoadArt from '../assets/objects/road-straight-nw-se.svg'
import cornerRoadArt from '../assets/objects/road-corner.svg'
import leftCornerRoadArt from '../assets/objects/road-corner-left.svg'
import southCornerRoadArt from '../assets/objects/road-corner-se-sw.svg'
import northCornerRoadArt from '../assets/objects/road-corner-ne-nw.svg'
import tJunctionRoadArt from '../assets/objects/road-t-junction.svg'
import crossroadArt from '../assets/objects/road-crossroad.svg'
import carArt from '../assets/objects/car.svg'
import removeArt from '../assets/objects/remove.svg'
import type { ObjectType, TerrainType } from '../domain/types'

export type GallerySelection =
  | { kind: 'terrain'; terrain: TerrainType }
  | { kind: 'object'; objectType: ObjectType }
  | { kind: 'vehicle' }
  | { kind: 'remove' }

export interface GalleryItem {
  id: string
  name: string
  category: string
  art: string
  selection: GallerySelection
}

type GalleryItemInput = Omit<GalleryItem, 'category'>

export const GALLERY_GROUPS = [
  {
    name: 'Terrain',
    items: [
      { id: 'terrain-water', name: 'Water', art: waterArt, selection: { kind: 'terrain', terrain: 'water' } },
      { id: 'terrain-ground', name: 'Ground', art: groundArt, selection: { kind: 'terrain', terrain: 'ground' } },
      { id: 'terrain-bridge', name: 'Bridge', art: bridgeArt, selection: { kind: 'terrain', terrain: 'bridge' } },
    ],
  },
  {
    name: 'Vegetation',
    items: [
      { id: 'grass', name: 'Grass', art: grassArt, selection: { kind: 'object', objectType: 'grass' } },
      { id: 'tree-deciduous', name: 'Deciduous tree', art: deciduousTreeArt, selection: { kind: 'object', objectType: 'tree-deciduous' } },
      { id: 'tree-conifer', name: 'Conifer tree', art: coniferTreeArt, selection: { kind: 'object', objectType: 'tree-conifer' } },
    ],
  },
  {
    name: 'Buildings',
    items: [
      { id: 'building-2x2', name: '2 x 2 building', art: smallBuildingArt, selection: { kind: 'object', objectType: 'building-2x2' } },
      { id: 'building-2x3', name: '2 x 3 building', art: largeBuildingArt, selection: { kind: 'object', objectType: 'building-2x3' } },
    ],
  },
  {
    name: 'Roads',
    items: [
      { id: 'road-straight', name: 'Straight road', art: straightRoadArt, selection: { kind: 'object', objectType: 'road-straight' } },
      { id: 'road-straight-nw-se', name: 'Straight road NW-SE', art: northWestSouthEastRoadArt, selection: { kind: 'object', objectType: 'road-straight-nw-se' } },
      { id: 'road-corner', name: 'Road corner', art: cornerRoadArt, selection: { kind: 'object', objectType: 'road-corner' } },
      { id: 'road-corner-left', name: 'Road corner NW-SW', art: leftCornerRoadArt, selection: { kind: 'object', objectType: 'road-corner-left' } },
      { id: 'road-corner-se-sw', name: 'Road corner SE-SW', art: southCornerRoadArt, selection: { kind: 'object', objectType: 'road-corner-se-sw' } },
      { id: 'road-corner-ne-nw', name: 'Road corner NE-NW', art: northCornerRoadArt, selection: { kind: 'object', objectType: 'road-corner-ne-nw' } },
      { id: 'road-t-junction', name: 'T-junction', art: tJunctionRoadArt, selection: { kind: 'object', objectType: 'road-t-junction' } },
      { id: 'road-crossroad', name: 'Four-way junction', art: crossroadArt, selection: { kind: 'object', objectType: 'road-crossroad' } },
    ],
  },
  {
    name: 'Vehicles and tools',
    items: [
      { id: 'vehicle-car', name: 'Car', art: carArt, selection: { kind: 'vehicle' } },
      { id: 'remove', name: 'Remove', art: removeArt, selection: { kind: 'remove' } },
    ],
  },
] as const satisfies readonly {
  name: string
  items: readonly GalleryItemInput[]
}[]

export const GALLERY_ITEMS: GalleryItem[] = GALLERY_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, category: group.name })),
)

export function getGalleryItem(selection: GallerySelection): GalleryItem | undefined {
  return GALLERY_ITEMS.find(
    (item) =>
      item.selection.kind === selection.kind &&
      (selection.kind === 'terrain'
        ? item.selection.kind === 'terrain' && item.selection.terrain === selection.terrain
        : selection.kind === 'object'
          ? item.selection.kind === 'object' && item.selection.objectType === selection.objectType
          : true),
  )
}

export function getGalleryArtForObject(type: ObjectType): string {
  return GALLERY_ITEMS.find(
    (item) => item.selection.kind === 'object' && item.selection.objectType === type,
  )?.art ?? grassArt
}

export function getGalleryArtForTerrain(terrain: TerrainType): string {
  return GALLERY_ITEMS.find(
    (item) => item.selection.kind === 'terrain' && item.selection.terrain === terrain,
  )?.art ?? waterArt
}

export const CAR_ART = carArt
export const REMOVE_ART = removeArt