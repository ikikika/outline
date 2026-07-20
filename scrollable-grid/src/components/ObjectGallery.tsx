import { HEX_DIRECTIONS, type HexDirection } from '../domain/types'
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
}: ObjectGalleryProps) {
  return (
    <aside className="object-gallery" aria-label="Object gallery">
      <div className="gallery-heading">
        <span>Gallery</span>
        <span className="gallery-current">
          {GALLERY_ITEMS.find((item) =>
            selectionsMatch(item.selection, selection),
          )?.name ?? 'Choose item'}
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
                    onSelect={() => onSelectionChange(item.selection)}
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
    </aside>
  )
}