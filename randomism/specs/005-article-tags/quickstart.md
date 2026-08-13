# Quickstart: Article Tags

Manual validation guide after implementation. No automated test suite. Assumes `001`–`004` foundations already work.

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

### 1. Humanized tags on an article

1. Open a tagged article (e.g. `/articles/getting-started`).
2. **Expect**: chips near the title show display labels (e.g. **Randomism**, **Authoring**), not kebab-case.
3. **Expect**: Draft chip is absent on published posts; topic chips are distinct from Draft styling.
4. Activate a topic chip.
5. **Expect**: home opens filtered to that tag (`/?tag=…` in the address bar) (SC-001, FR-005).

### 2. Home tag list and Show all

1. Open `/`.
2. **Expect**: Show all is visible and current; unique published tags appear (alphabetically); at least two distinct tags (SC-004, SC-008).
3. **Expect**: every tagged published article shows its chips on the listing (SC-002).
4. Keyboard-only: tab to Show all and tags; activate without a pointer (SC-005).

### 3. Filter

1. On `/`, activate a tag used by some but not all published articles (e.g. `react`).
2. **Expect**: address is `/?tag=react`; 100% of listed items include that tag; articles without it are hidden (SC-007).
3. **Expect**: that tag is current (`aria-current`); Show all is not current.
4. Reload / open the same URL in a new tab — **Expect**: same subset (SC-009).

### 4. Clear filter

1. From a filtered view, activate **Show all**.
2. **Expect**: `/` with the full published list; Show all current.
3. Filter again; activate the **selected** tag (in the tag list or on a listing).
4. **Expect**: filter clears the same way (SC-008).

### 5. Listing chips vs article link

1. On `/`, click a tag chip on a listing (not the title).
2. **Expect**: home filters; you do **not** navigate into the article.
3. Click the article title.
4. **Expect**: article page opens.

### 6. Empty / stale filter

1. Open `/?tag=does-not-exist`.
2. **Expect**: “No matching articles.” (or equivalent); Show all + real tags still available; no crash (FR-017).
3. Draft-only tags never appear in the home list (open `/articles/draft-example` if it has no tags — still omitted from home).

### 7. No tag chrome when omitted

1. If a published article had no tags, it would list without chips (fixtures all have tags). Confirm `draft-example.json` omits `tags` and still builds.
2. **Expect**: no empty “Tags:” placeholder on that draft’s article page (SC-003).

### 8. Authoring / validation

1. Confirm published JSON files include `tags` per [contracts/article-schema.md](./contracts/article-schema.md).
2. Break a file: `"tags": ["React"]` or `"tags": ["react", "react"]` or `"tags": [{}]`.
3. Run `npm run build`.
4. **Expect**: build fails with a clear Zod message (SC-006).
5. Restore fixtures. Omit `tags` on a draft — **Expect**: build succeeds.

### 9. SEO

1. View source / metadata on a tagged article.
2. **Expect**: title, description, canonical, Open Graph still present; keywords (or equivalent topic metadata) include the stored tag identities.
3. On `/?tag=react`, **Expect**: canonical still `/` (unfiltered home).

### 10. Lint / quality gates

```bash
npm run lint
npm run build
```

**Expect**: lint clean; production build succeeds with zero warnings; all `data/articles/*.json` still validate.

## Reference

- [data-model.md](./data-model.md)
- [contracts/article-schema.md](./contracts/article-schema.md)
- [contracts/home-tag-filter.md](./contracts/home-tag-filter.md)
- [research.md](./research.md)
