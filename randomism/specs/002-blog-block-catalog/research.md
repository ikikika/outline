# Research: Blog Block Catalog

## Markdown library & dialect

- **Decision**: Use `react-markdown` (CommonMark via micromark) for all Markdown-capable fields. Do **not** add `rehype-raw` or GFM (`remark-gfm`) in this feature. Do not enable syntax highlighting libraries.
- **Rationale**: Spec requires CommonMark-compatible full Markdown in Paragraph and other multi-line prose fields, with raw HTML stripped. Without `rehype-raw`, author HTML tags are not turned into elements (they appear as text or are ignored per parser behavior)—satisfies FR-013 and clarify “strip raw HTML.” GFM extras (tables, strikethrough) are optional and deferred (YAGNI; tables already out of catalog scope).
- **Alternatives considered**: `marked` + `dangerouslySetInnerHTML` (XSS risk unless sanitize pipeline); MDX (wrong model for JSON blocks); `markdown-it` + custom React bridge (more glue); hand-rolled subset (high maintenance).

## Full vs inline Markdown modes

- **Decision**: Two shared helpers:
  - **Full**: default `react-markdown` (headings, lists, fenced code, paragraphs, links, emphasis, etc.).
  - **Inline**: `react-markdown` with only phrasing-level elements allowed (e.g. `strong`, `em`, `a`, `code`, `br` / text); disallow `h1–h6`, `ul`/`ol`, `pre`, `blockquote`, etc., unwrap or omit disallowed nodes so list items stay single-line structure owned by the List block.
- **Rationale**: Matches clarifications—Paragraph / accordion title+body / callout / blockquote = full; List items = inline only; Heading & CodeBlock never Markdown.
- **Alternatives considered**: One mode everywhere (breaks List block purpose); parse Markdown to HTML string once (harder a11y/React composition).

## Accordion implementation

- **Decision**: Server Component using one `<details>` per section; optional `open` attribute when `defaultOpen: true`. Multiple `<details>` siblings stay independently open/closed (no exclusive accordion script). Section `title` → Markdown inside `<summary>`; `body` → Markdown in the details panel. Derive accessible naming from summary content (browser name-from-contents); if title Markdown is unusually block-heavy, still render inside `<summary>` and rely on text content for the accessible name (document author guidance: prefer short titles).
- **Rationale**: Spec multi-open + keyboard + minimal client JS; constitution Performance / Client Components only when required. Native disclosure meets SC-003 without hydration cost.
- **Alternatives considered**: Controlled Client Component with buttons/`aria-expanded` (more code, justified only if native proves insufficient); single-select accordion pattern (rejected by clarify).

## Accordion nesting

- **Decision**: Schema does not allow nested Accordion blocks inside accordion bodies (bodies are Markdown strings, not block trees). Nested Accordion as a sibling catalog composition is not required; if an author somehow embeds accordion-like HTML via Markdown, it is not a second registry Accordion.
- **Rationale**: Spec edge case: nested accordion out of scope.
- **Alternatives considered**: Nested block trees in accordion (rejected by assumptions / YAGNI).

## CodeBlock

- **Decision**: `{ componentType: "CodeBlock", code: string (min 1), language?: string }`. Render `<pre><code>` (optional `data-language` or visible label from `language`). Never pass `code` through Markdown.
- **Rationale**: FR-003; empty code fails validation; language optional display-only; highlighter deferred.
- **Alternatives considered**: Field named `content` (ambiguous with Paragraph); Shiki/Prism now (premature polish).

## Callout variants

- **Decision**: Fixed enum `variant`: `info` | `tip` | `warning`. Visual distinction via class + text label (not color alone). Body = full Markdown.
- **Rationale**: Spec assumptions; small documented set.
- **Alternatives considered**: Free-form string (unstable styling); more variants (note/danger)—can add later if needed.

## List block

- **Decision**: `{ componentType: "List", ordered: boolean, items: string[] }` with `items.length >= 1`, each item non-empty. Render `<ol>` or `<ul>`; each item inline Markdown.
- **Rationale**: FR-006; structure owned by block, not by Markdown list inside Paragraph (though Paragraph may also contain MD lists per full CommonMark—authors may use either).
- **Alternatives considered**: Nested item objects (unnecessary); Markdown-only lists without List type (List still valuable for explicit ordered/unordered without fence noise).

## Blockquote & Divider

- **Decision**: Blockquote: `{ text: string (Markdown), cite?: string (plain) }`. Divider: `{ componentType: "Divider" }` only → `<hr>`.
- **Rationale**: FR-005 / FR-008; cite stays plain for predictable attribution.
- **Alternatives considered**: Nested blocks inside quote (YAGNI); labeled dividers (optional in spec—omit for simplicity).

## Existing Paragraph / Heading

- **Decision**: Update Paragraph to render `content` with full Markdown. Heading remains plain text in `<h1>`–`<h6>`. Image unchanged.
- **Rationale**: Clarifications Q3/Q4.
- **Alternatives considered**: New `MarkdownParagraph` type (breaking/confusing).

## Showcase fixture

- **Decision**: Update `data/articles/getting-started.json` so `/articles/getting-started` demonstrates all nine `componentType`s (including the six new ones) plus Markdown in Paragraph and at least one other prose field. Do not add `block-catalog.json`. Keep `welcome.json` and `draft-example.json` valid.
- **Rationale**: FR-002, SC-001/SC-002/SC-006; single familiar article for authors; avoids a separate catalog-only post.
- **Alternatives considered**: Separate `block-catalog.json` (rejected by product preference); spread examples across many files only (harder SC-001 check).
