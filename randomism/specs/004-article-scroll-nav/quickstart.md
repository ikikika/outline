# Quickstart: Article Scroll Navigation

Manual validation guide after implementation. No automated test suite. Assumes `001`–`003` foundations already work.

## Prerequisites

- Node.js 20+ and npm
- Feature implemented per [plan.md](./plan.md)
- No new packages required beyond existing MUI / Next stack

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation scenarios

### 1. Back to top on a long article

1. Open `/articles/speckit` (or another long article).
2. Stay at the top — **Expect**: back-to-top control not prominently visible.
3. Scroll down past roughly one screen.
4. **Expect**: control appears; activate it.
5. **Expect**: viewport returns to top within ~2s perceived time; URL has **no** hash (SC-001).

### 2. Back to top clears hash

1. On `/articles/speckit`, click a TOC link (or navigate to a `#…` URL).
2. Confirm address bar shows a fragment.
3. Scroll if needed so back-to-top is available; activate it.
4. **Expect**: page at top; fragment removed from the URL.

### 3. TOC section jump

1. Open `/articles/speckit` with a `TableOfContents` near the top and ≥3 section targets.
2. Activate each listed link.
3. **Expect**: matching Heading section scrolls into view; URL fragment matches the bare id (SC-002).
4. Keyboard-only: tab to links, activate — same behavior (SC-004).

### 4. No empty TOC chrome

1. Open `/articles/getting-started` (no TOC block).
2. **Expect**: no empty “on this page” list (SC-003).
3. Scroll down — **Expect**: back-to-top still available (chrome is independent of TOC).

### 5. Reduced motion

1. Enable OS/browser “reduce motion”.
2. Use TOC link and back-to-top.
3. **Expect**: jumps without forced smooth animation (SC-005).

### 6. No scroll-spy

1. With TOC visible on `/articles/speckit`, scroll through the article without clicking TOC links.
2. **Expect**: TOC does not change a “current” highlight solely due to scroll (SC-007).

### 7. Authoring / validation

1. Confirm `data/articles/speckit.json` includes TOC + Heading `id`s per [contracts/article-schema.md](./contracts/article-schema.md).
2. Break a TOC item: `"href": "#bad"` or `"href": "https://example.com"`, or empty `items`.
3. Run `npm run build`.
4. **Expect**: build fails with clear Zod message.
5. Point `href` at a non-existent bare id (valid shape) — **Expect**: build **succeeds**; clicking the link does not crash the page.
6. Restore fixtures.

### 8. Lint / quality gates

```bash
npm run lint
npm run build
```

**Expect**: lint clean; production build succeeds with zero warnings; all `data/articles/*.json` still validate.

## Reference

- [data-model.md](./data-model.md)
- [contracts/article-schema.md](./contracts/article-schema.md)
- [contracts/article-nav.md](./contracts/article-nav.md)
- [research.md](./research.md)
