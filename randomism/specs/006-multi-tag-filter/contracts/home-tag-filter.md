# Contract: Home tag filter (multi-tag delta)

Extends [005 home-tag-filter](../../005-article-tags/contracts/home-tag-filter.md). Implementation: `lib/articles/tags.ts`, `lib/articles/list.ts`, `components/TagFilter.tsx`, `components/ArticleTags.tsx`, `app/page.tsx`.

## Addresses

| Address | Meaning |
|---------|---------|
| `/` | Unfiltered published list. Show all current. Match mode **AND**. |
| `/?tag={id}` | Single-tag filter, mode **AND**. |
| `/?tag={id1}&tag={id2}` | Multi-tag filter, mode **AND** (all selected tags required). |
| `/?tag={id1}&tag={id2}&match=or` | Multi-tag filter, mode **OR** (any selected tag). |
| `/?match=or` | No tags selected; full published list; Match any current. |

- Repeated `tag` params: all values form the selection (dedupe; built hrefs sort by `localeCompare`).
- Omitting `match` means **AND**. Only `match=or` selects OR. Other `match` values → AND.
- Home `canonical` remains `/`.
- Stale tag identities: no chip invented; filtering still applies (AND+stale ⇒ empty list).

## Control hrefs

Let `S` be the current published-selected set and `M` the current mode (`and` \| `or`).

| Control | When | `href` | Current? |
|---------|------|--------|----------|
| Show all | always (if tag list shown) | `/` | yes iff `S` empty |
| Topic tag | not in `S` | filter with `S ∪ {id}`, mode `M` (omit `match` if and) | no |
| Topic tag | in `S` | filter with `S ∖ {id}`; if empty → `/` (mode and) | yes |
| Match all | always with tag list | same tags as now, no `match` param (or `/` if no tags) | yes iff `M === and` |
| Match any | always with tag list | same tags + `match=or` (or `/?match=or` if no tags) | yes iff `M === or` |
| Listing chip | same as topic tag | same as topic tag | same |
| Article-page chip | always | `/?tag={id}` only | n/a |

Accessible names: Show all; humanized tag labels; **Match all**; **Match any**.

## Empty states

Unchanged from 005, plus: tag list + Show all + match-mode control remain when a filter matches zero articles.

## Markup intent

- Home filter nav includes Show all, tags, and match-mode pair (or nested group with accessible name e.g. “Match mode”).
- Multiple topic chips may be current (`aria-current="page"` on each selected).
- Exactly one of Match all / Match any is current.
- No nested anchors in listings (unchanged).
