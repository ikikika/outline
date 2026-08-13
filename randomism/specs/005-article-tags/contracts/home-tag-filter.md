# Contract: Home tag filter

Public URL and control behavior for filtering the home article list. No `/tags/...` routes.

## Addresses

| Address | Meaning |
|---------|---------|
| `/` | Unfiltered published list. Show all is current. |
| `/?tag={identity}` | Published articles whose `tags` include `{identity}`. |

- `{identity}` is the stored kebab-case tag (not the display label).
- Home `canonical` is always `/` (filtered views are not separate documents).
- Repeated `tag` params: first value wins.
- Unknown / malformed identity: **200** with empty list copy, not 404. Tag filter chrome still shown if any published tags exist.

## Control hrefs

| Control | When | `href` | Current? |
|---------|------|--------|----------|
| Show all | always (if tag list shown) | `/` | yes iff no `tag` query |
| Topic tag | not selected | `/?tag={identity}` | no |
| Topic tag | selected (`tag` query equals identity) | `/` | yes (`aria-current="page"`) |
| Listing chip | same rules as topic tag on home | same as above | same |
| Article-page chip | always | `/?tag={identity}` | n/a (not a home filter control) |

Show all accessible name: `Show all`. Topic accessible name: display form (`Coding Standards`).

## Empty states

| Condition | UI |
|-----------|-----|
| No published articles have tags | Omit Show all + tag list; article list unchanged |
| Filter matches zero published articles | Keep Show all + tag list; show “No matching articles.” (or equivalent); do not use the “No published articles yet.” copy |
| Unfiltered list empty (no published articles at all) | Existing empty list copy; omit tag chrome |

## Markup intent

- Home filter: `<nav aria-label="Filter articles by tag">` containing Show all + unique tags (wrap on narrow viewports).
- Selected control uses more than color (`aria-current="page"` plus filled/primary Chip).
- Listing title is the article link; tag chips are sibling links (no nested anchors).
- Draft status Chip on article pages is not a tag and is not a link.
