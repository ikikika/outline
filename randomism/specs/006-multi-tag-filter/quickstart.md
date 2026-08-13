# Quickstart: Multi-Tag Filter

Manual validation after implementation. Assumes feature 005 (article tags) already works.

## Prerequisites

- Node.js 20+ and npm
- Feature implemented per [plan.md](./plan.md)
- Published fixtures include overlapping tags (e.g. `react` on multiple articles; distinct tags like `habits`)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation scenarios

### 1. Add a second tag (default AND)

1. Open `/`. Confirm Match all is current (default AND).
2. Activate `react`, then `habits` (or another pair where AND may be empty or narrow).
3. **Expect**: both chips current; address has two `tag` params and **no** `match=or`; list only articles that include **every** selected tag (or “No matching articles.”) (SC-001, SC-008).

### 2. Switch to OR

1. From a two-tag AND filter, activate **Match any**.
2. **Expect**: `match=or` in the address; same two tags selected; list shows articles with **either** tag (SC-002).
3. Activate **Match all** — **Expect**: `match` omitted; list back to AND.

### 3. Remove one tag / clear

1. With two tags selected, deactivate one.
2. **Expect**: one tag remains; list matches single-tag filter; mode unchanged if still non-empty (SC-003).
3. Deactivate the last tag **or** Show all.
4. **Expect**: `/` (or unfiltered); Match all current; mode AND (SC-004, SC-009).

### 4. Shareable URL

1. Copy a multi-tag OR URL; open in a new tab.
2. **Expect**: same tags, Match any current, same list (SC-005).
3. Open the same tags **without** `match` — **Expect**: AND behavior (SC-008).

### 5. Listing chips

1. With `react` selected, activate `habits` on a listing that has it.
2. **Expect**: both selected (add), not replace.
3. Activate `react` on a listing — **Expect**: `react` removed only.

### 6. Article page chip

1. From `/articles/react-fundamentals`, activate **React**.
2. **Expect**: `/?tag=react` (no `match=or`); only that tag selected; Match all current.

### 7. Keyboard / a11y

1. Tab through Show all, tags, Match all, Match any; activate without pointer (SC-006).
2. Confirm `aria-current` (or equivalent) on selected tags and active mode.

### 8. Stale tag

1. Open `/?tag=does-not-exist&tag=react`.
2. **Expect**: no chip for the unknown; under AND, empty or react-only depending on whether unknown is kept in filter set — per contract, AND with stale yields empty matching; Show all / mode still usable.

### 9. Lint / build

```bash
npm run lint
npm run build
```

**Expect**: clean lint; build succeeds; existing article JSON unchanged and valid.

## Reference

- [data-model.md](./data-model.md)
- [contracts/home-tag-filter.md](./contracts/home-tag-filter.md)
- [research.md](./research.md)
- Prior single-tag contract: [005 home-tag-filter](../005-article-tags/contracts/home-tag-filter.md)
