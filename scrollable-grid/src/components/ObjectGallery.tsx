import { HEX_DIRECTIONS, type HexDirection, type RoadObject } from '../domain/types'
import {
  GALLERY_GROUPS,
  GALLERY_ITEMS,
  type GalleryItem,
  type GallerySelection,
} from '../gallery/catalogue'

interface ObjectGalleryProps {
  selection: GallerySelection
  bridgeEntry: HexDirection
  bridgeExit: HexDirection
  onSelectionChange: (selection: GallerySelection) => void
  onBridgeEntryChange: (direction: HexDirection) => void
  onBridgeExitChange: (direction: HexDirection) => void
  selectedRoad: RoadObject | null
  unconnectedRoadDirections: readonly HexDirection[]
  onToggleRoadConnection: (direction: HexDirection) => void
}

function selectionsMatch(
  first: GallerySelection,
  second: GallerySelection,
): boolean {
  if (first.kind !== second.kind) return false
  if (first.kind === 'terrain' && second.kind === 'terrain') {
    return first.terrain === second.terrain
  }
  if (first.kind === 'object' && second.kind === 'object') {
    return first.objectType === second.objectType
  }
  return first.kind === second.kind
}

function formatDirection(direction: HexDirection): string {
  return direction.replace(/([A-Z])/g, ' $1').toLowerCase()
}

function GalleryButton({
  item,
  selected,
  onSelect,
}: {
  item: GalleryItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      className="gallery-item"
      type="button"
      aria-label={item.name}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <img src={item.art} alt="" />
      <span>{item.name}</span>
    </button>
  )
}

export function ObjectGallery({
  selection,
  bridgeEntry,
  bridgeExit,
  onSelectionChange,
  onBridgeEntryChange,
  onBridgeExitChange,
  selectedRoad,
  unconnectedRoadDirections,
  onToggleRoadConnection,
}: ObjectGalleryProps) {
  return (
    <aside className="object-gallery" aria-label="Object gallery">
      <div className="gallery-heading">
        <span>Gallery</span>
        <span className="gallery-current">
          {GALLERY_ITEMS.find((item) =>
            selectionsMatch(item.selection, selection),
          )?.name ?? 'No tool selected'}
        </span>
      </div>
      <div className="gallery-groups">
        {GALLERY_GROUPS.map((group) => (
          <section className="gallery-group" key={group.name}>
            <h3>{group.name}</h3>
            <div className="gallery-items">
              {group.items.map((sourceItem) => {
                const item: GalleryItem = {
                  ...sourceItem,
                  category: group.name,
                }
                return (
                  <GalleryButton
                    key={item.id}
                    item={item}
                    selected={selectionsMatch(item.selection, selection)}
                    onSelect={() =>
                      onSelectionChange(
                        selectionsMatch(item.selection, selection)
                          ? { kind: 'none' }
                          : item.selection,
                      )
                    }
                  />
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {selection.kind === 'terrain' && selection.terrain === 'bridge' && (
        <div className="bridge-direction-fields">
          <label>
            Entry
            <select
              aria-label="Bridge entry direction"
              value={bridgeEntry}
              onChange={(event) =>
                onBridgeEntryChange(event.target.value as HexDirection)
              }
            >
              {HEX_DIRECTIONS.map((direction) => (
                <option
                  key={direction}
                  value={direction}
                  disabled={direction === bridgeExit}
                >
                  {formatDirection(direction)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Exit
            <select
              aria-label="Bridge exit direction"
              value={bridgeExit}
              onChange={(event) =>
                onBridgeExitChange(event.target.value as HexDirection)
              }
            >
              {HEX_DIRECTIONS.map((direction) => (
                <option
                  key={direction}
                  value={direction}
                  disabled={direction === bridgeEntry}
                >
                  {formatDirection(direction)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {selection.kind === 'road-edit' && (
        <section className="road-connection-editor" aria-label="Road connection editor">
          <h3>Road connections</h3>
          {selectedRoad ? (
            <>
              <p className="road-edit-name">
                {selectedRoad.type.replaceAll('road-', '').replaceAll('-', ' ')}
              </p>
              <div className="road-direction-buttons">
                {HEX_DIRECTIONS.map((direction) => {
                  const connected = selectedRoad.connections.includes(direction)
                  const isUnmatched =
                    connected && unconnectedRoadDirections.includes(direction)
                  return (
                    <button
                      key={direction}
                      type="button"
                      className={isUnmatched ? 'is-unmatched' : undefined}
                      aria-label={`${formatDirection(direction)} road side`}
                      aria-pressed={connected}
                      title={isUnmatched ? 'No reciprocal neighbor connection' : undefined}
                      onClick={() => onToggleRoadConnection(direction)}
                    >
                      {directionLabel(direction)}
                    </button>
                  )
                })}
              </div>
              <p className="road-edit-help">
                {unconnectedRoadDirections.length
                  ? `${unconnectedRoadDirections.length} selected side${unconnectedRoadDirections.length === 1 ? '' : 's'} lack reciprocal connections.`
                  : 'All selected sides connect to neighboring roads or bridges.'}
              </p>
            </>
          ) : (
            <p className="road-edit-help">Select Edit road, then tap a placed road cell.</p>
          )}
        </section>
      )}
    </aside>
  )
}

function directionLabel(direction: HexDirection): string {
  switch (direction) {
    case 'northEast': return 'NE'
    case 'northWest': return 'NW'
    case 'southEast': return 'SE'
    case 'southWest': return 'SW'
    case 'east': return 'E'
    case 'west': return 'W'
  }
}