# Quickstart: Content Page Foundation

Manual validation guide after implementation. No automated test suite.

## Prerequisites

- Node.js 20+ and npm (or pnpm/yarn)
- Repository at project root with this feature implemented per [plan.md](./plan.md)

## Setup

```bash
npm install
cp .env.example .env.local   # if present; else set NEXT_PUBLIC_SITE_URL=http://localhost:3000
npm run dev
```

Open `http://localhost:3000`.

## Validation scenarios

### 1. Home lists published articles only

1. Confirm `data/articles/` has ≥2 published JSON files with different `publishDate` values and optional `draft-example.json` with `"published": false`.
2. Open `/`.
3. **Expect**: List shows published titles only; newest date first; draft absent.
4. Activate a list link.
5. **Expect**: Navigates to `/articles/{slug}`.

### 2. Article body + SEO

1. Open `/articles/welcome`.
2. **Expect**: Heading, Paragraph, and Image blocks in authored order; image has alt text.
3. View page source / document head.
4. **Expect**: title, description, canonical, Open Graph tags match article metadata (canonical uses site URL + path).

### 3. Unpublished is not public

1. Note a draft slug (e.g. `draft-example`).
2. Open `/articles/draft-example`.
3. **Expect**: 404 / not found.
4. Confirm it does not appear on `/`.

### 4. Invalid JSON fails build

1. Temporarily break a file under `data/articles/` (e.g. add `"extra": true` or remove `title`).
2. Run `npm run build`.
3. **Expect**: Build fails with a clear validation error.
4. Restore the file; build succeeds.

### 5. Add article updates list

1. Add `data/articles/another-post.json` with `published: true`, a `publishDate`, required metadata, and ≥1 block.
2. Rebuild / refresh dev server as needed.
3. Open `/`.
4. **Expect**: New entry appears in date order without editing homepage source files.

### 6. Mobile responsive

1. Resize viewport to ~375px wide (or device mode).
2. Open `/` and an article.
3. **Expect**: Content readable; no horizontal scroll of primary content; list links usable.

### 7. Lint / quality gates

```bash
npm run lint
npm run build
```

**Expect**: ESLint passes; production build succeeds with zero warnings (when fixtures are valid).

## References

- Data model: [data-model.md](./data-model.md)
- Article schema contract: [contracts/article-schema.md](./contracts/article-schema.md)
- Routes / metadata: [contracts/routes.md](./contracts/routes.md)
- Spec: [spec.md](./spec.md)
