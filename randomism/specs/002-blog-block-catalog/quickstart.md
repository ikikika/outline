# Quickstart: Blog Block Catalog

Manual validation guide after implementation. No automated test suite. Assumes foundation (`001`) already works.

## Prerequisites

- Node.js 20+ and npm
- Feature implemented per [plan.md](./plan.md)
- `react-markdown` installed as a dependency

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation scenarios

### 1. Showcase article renders all new blocks

1. Open `/articles/getting-started`.
2. **Expect**: CodeBlock, Accordion, Blockquote, List, Callout, and Divider are all visible in authored order, plus Heading/Paragraph/Image.
3. **Expect**: Code appears in a preformatted region; Markdown characters inside the code payload are literal.

### 2. Markdown prose

1. On `/articles/getting-started` (or any article with Markdown Paragraph content), confirm **bold**, a working link, and inline code render (not raw `**` / backticks).
2. **Expect**: SC-006 satisfied on first view.
3. If a Paragraph includes a Markdown heading or list, **Expect**: those structures appear as real heading/list elements inside that block’s output.

### 3. Accordion multi-open + keyboard

1. Focus an accordion section summary; activate (Enter/Space as supported by the browser for `<summary>`).
2. Open a second section without closing the first.
3. **Expect**: Both remain open; focus is visible; sections can be closed again (SC-003).

### 4. Raw HTML stripped

1. Temporarily put `<em>html</em>` or `<script>alert(1)</script>` inside a Paragraph `content` string in a fixture.
2. Refresh the article.
3. **Expect**: No script execution; tags are not rendered as live HTML elements (visible as text or omitted—not as italic/`script` nodes).
4. Restore the fixture.

### 5. Authoring / validation

1. Copy a new block example from [contracts/article-schema.md](./contracts/article-schema.md) into a draft or published article; refresh.
2. **Expect**: Renders via the same registry as other blocks.
3. Break a block (e.g. `Callout` with `"variant": "danger"`, or empty `code`).
4. Run `npm run build`.
5. **Expect**: Build fails with a clear Zod/validation message; restore file afterward.

### 6. Mobile + code scroll

1. Viewport ~375px; open `/articles/getting-started`.
2. **Expect**: Primary page does not horizontally scroll; long CodeBlock may scroll inside its region (SC-005).

### 7. Lint / quality gates

```bash
npm run lint
npm run build
```

**Expect**: ESLint passes; production build succeeds with zero warnings when fixtures are valid.

## References

- Spec: [spec.md](./spec.md)
- Data model: [data-model.md](./data-model.md)
- Schema contract: [contracts/article-schema.md](./contracts/article-schema.md)
- Markdown contract: [contracts/markdown.md](./contracts/markdown.md)
- Foundation routes/SEO: [../001-content-page-foundation/contracts/routes.md](../001-content-page-foundation/contracts/routes.md)
