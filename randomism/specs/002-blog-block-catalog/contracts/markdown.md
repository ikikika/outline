# Contract: Markdown rendering

Shared rules for Markdown-capable article fields. Library choice: `react-markdown` (CommonMark). See [research.md](../research.md).

## Dialect

- **Supported**: CommonMark constructs produced by default `react-markdown` (emphasis, links, inline code, hard breaks, headings, lists, fenced/indented code, blockquotes, paragraphs, thematic breaks as Markdown syntax inside a field, etc.).
- **Not enabled this feature**: GFM extras (`remark-gfm`) — no autolink literals/tables/strikethrough/task lists unless a later feature opts in.
- **Raw HTML**: Must **not** be rendered as DOM elements. Do not use `rehype-raw`. Author-written tags must not execute scripts.

## Modes

### Full Markdown

Used for: Paragraph `content`, Accordion `title`, Accordion `body`, Blockquote `text`, Callout `body`.

- Render block and inline CommonMark to semantic React/HTML.
- Prefer real `<a>`, `<strong>`/`<em>`, `<ul>`/`<ol>`, `<pre>`/`<code>`, headings, etc.

### Inline Markdown

Used for: List `items[]`.

- Allow phrasing only (e.g. emphasis, links, inline code, line breaks).
- Disallow nested headings, lists, fenced code blocks, etc., from reshaping the List block’s single `<li>` structure.

### Non-Markdown (literal / plain)

- Heading `content`, CodeBlock `code`, Image `alt`, Blockquote `cite`, article `title` / `description` / `ogImage`.
- CodeBlock: show source exactly; do not run Markdown on `code` even if it looks like Markdown.

## Accordion titles

- Render full Markdown inside `<summary>`.
- Expand/collapse must remain keyboard-operable (native `<details>`).
- Accessible name comes from summary contents; authors should keep titles reasonably short.

## Failure behavior

- Malformed or odd Markdown: page still renders; build does not fail solely due to Markdown parse quirks.
- Schema still enforces non-empty strings where required.
