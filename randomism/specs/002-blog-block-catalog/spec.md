# Feature Specification: Blog Block Catalog

**Feature Branch**: `002-blog-block-catalog`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "add more componentType, eg, code block, accordion, recommend to me what blocks i should include" + follow-up: "content should accept markdown"

## Clarifications

### Session 2026-08-03

- Q: Accordion — how many sections open at once? → A: Multiple sections can be open at the same time
- Q: Raw HTML in Markdown prose? → A: Strip all raw HTML — only Markdown syntax becomes markup; HTML tags are not rendered as elements
- Q: Markdown scope inside Paragraph? → A: Full CommonMark in the field (headings, lists, fences, etc. allowed inside Paragraph)
- Q: Heading block text — Markdown? → A: Plain text only
- Q: Accordion section titles — Markdown? → A: Full CommonMark (same dialect as Paragraph)
- Q: Divider block shape? → A: `componentType` only — no label or other fields (structural break)
- Q: Callout variant enum? → A: Exactly `info` | `tip` | `warning`
- Q: Raw HTML visible outcome after strip? → A: Must not become DOM elements; literal tag characters MAY remain visible as plain text
- Q: Markdown headings inside Paragraph vs page outline? → A: Render CommonMark headings as authored; no automatic level remapping; authors SHOULD prefer Heading blocks for primary outline
- Q: Accordion client-side script? → A: No mandatory client-side script — native disclosure (or equivalent)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read richer article content (Priority: P1)

A visitor opens a published article that uses the expanded block catalog and can read code samples, collapsible sections, quotes, lists, callouts, and section dividers as intended by the author—alongside existing heading, paragraph, and image blocks. Prose within content fields that use Markdown (emphasis, links, inline code, etc.) appears correctly formatted—not as raw Markdown punctuation.

**Why this priority**: Without these blocks and Markdown prose, technical and explanatory posts are forced into flat plain text, which hurts readability and authoring.

**Independent Test**: Open a sample article that includes each new block type plus Markdown in prose fields; confirm each renders correctly in order without leaving the article page.

**Acceptance Scenarios**:

1. **Given** an article that includes a code block, **When** a visitor views the article, **Then** the code appears in a distinct, readable preformatted block (not as ordinary paragraph text) and Markdown inside the code payload is NOT interpreted as formatting.
2. **Given** an article that includes an accordion with multiple sections, **When** a visitor expands several sections, **Then** multiple sections may remain open at once and the rest of the page remains usable.
3. **Given** an article that includes a quote, a list, a callout, and a divider, **When** a visitor views the article, **Then** each appears with clear visual distinction appropriate to its role and in authored order.
4. **Given** a paragraph (or other prose field) whose content includes Markdown for bold, a link, and inline code, **When** a visitor views the article, **Then** those formats render as bold, a working link, and inline code respectively—not as literal `**`, `[]()`, or backticks.

---

### User Story 2 - Author with documented block types (Priority: P2)

A content author adds the new block types to article JSON using documented fields and example fixtures, authors prose with Markdown where allowed, and invalid shapes are rejected at publish/build the same way existing blocks are.

**Why this priority**: Registry and schema discipline require every new type to be authorable and validated; fixtures are how authors learn the patterns, including Markdown examples.

**Independent Test**: Copy fields from each new type’s example fixture into a draft or published article file (including Markdown samples); valid content builds and renders; deliberately invalid fields fail publish/build.

**Acceptance Scenarios**:

1. **Given** documented schemas and example fixtures for each new block type (including Markdown prose samples), **When** an author includes a valid block in an article file, **Then** publish/build succeeds and the article page shows that block with Markdown rendered.
2. **Given** a new block with missing required fields or undeclared fields, **When** publish/build runs, **Then** validation fails clearly and the invalid file is not treated as shippable content.
3. **Given** the component registry, **When** each new block type is used, **Then** it resolves through the same single registry as existing types (no one-off page-specific rendering).

---

### User Story 3 - Accessible interactive sections (Priority: P3)

A visitor using keyboard and assistive technology can operate accordion sections and still understand code, lists, quotes, callouts, and Markdown-derived structure (links, emphasis, lists in prose) without relying on color alone.

**Why this priority**: Constitution accessibility baseline applies to new interactive and structured content.

**Independent Test**: Keyboard-only, expand/collapse accordion sections; confirm focus is visible and section titles are announced as controls; verify lists, links, and code remain understandable.

**Acceptance Scenarios**:

1. **Given** an accordion on an article page, **When** a visitor uses keyboard only, **Then** they can expand and collapse sections with visible focus.
2. **Given** a code block, list, quote, callout, or Markdown link/emphasis in prose, **When** content is read in a typical browser or with a screen reader, **Then** structure remains understandable (e.g. lists are real lists; links are real links; code is distinct from prose).

---

### Edge Cases

- Accordion with zero sections or empty section titles: MUST fail schema validation.
- Code block with empty code payload: MUST fail schema validation.
- Very long code content: page MUST remain usable (horizontal scroll inside the code region is acceptable; whole-page horizontal scroll is not).
- Accordion nested inside accordion: out of scope for this feature (MUST NOT be required; if present and unsupported, treat as invalid or document as unsupported).
- Unknown new `componentType` spelling: same as today—validation failure at build; defensive skip only for unexpected runtime cases.
- Malformed Markdown in prose fields: page MUST still render (degrade gracefully); MUST NOT crash publish/build solely due to imperfect Markdown.
- Raw HTML in Markdown: MUST NOT be rendered as HTML elements or execute scripts; only Markdown-derived markup becomes elements. Literal tag characters MAY remain visible as plain text.
- Markdown inside CodeBlock: MUST be treated as literal source text, never as Markdown.
- Accordion section titles with heavy block-level Markdown: MUST still yield a usable accessible name for the expand/collapse control (planning documents rendering approach).
- Markdown headings inside a Paragraph (or other full-Markdown field): MUST render at the authored CommonMark levels (no automatic remapping); authors SHOULD use Heading blocks for the primary article outline to avoid competing `h1`s.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add these block types to the catalog: CodeBlock, Accordion, Blockquote, List, Callout, Divider (in addition to existing Heading, Paragraph, Image).
- **FR-002**: Each new block type MUST have documented schema fields, exactly one registry mapping, and at least one example usage in article fixture JSON under `data/articles/`.
- **FR-003**: CodeBlock MUST present author-supplied source text as preformatted code; optional language label MAY be supported for display. CodeBlock payloads MUST NOT be rendered as Markdown.
- **FR-004**: Accordion MUST support multiple titled sections that visitors can expand and collapse independently; multiple sections MAY be open at the same time. Default closed/open state per section MUST be author-controllable or have a documented default (default: all collapsed unless authored otherwise). Accordion section titles and section body prose MUST both accept full CommonMark-compatible Markdown (same dialect as Paragraph). The expand/collapse control MUST remain keyboard-operable and MUST expose a usable accessible name derived from the title content.
- **FR-005**: Blockquote MUST display quoted text distinct from body paragraphs; optional attribution/cite MAY be supported. Blockquote text MUST accept Markdown.
- **FR-006**: List MUST support ordered and unordered lists of text items. List item text MUST accept inline Markdown (e.g. emphasis, links, inline code).
- **FR-007**: Callout MUST display highlighted guidance with a `variant` the author chooses from exactly `info` | `tip` | `warning`. Callout body MUST accept Markdown. Tone MUST NOT rely on color alone (include a text label).
- **FR-008**: Divider MUST render a non-textual section break between blocks. Schema shape MUST be `{ "componentType": "Divider" }` only (no label or other fields; undeclared keys rejected).
- **FR-009**: All new blocks MUST obey existing content rules: strict schema (reject undeclared fields), mobile-responsive layout, and accessibility baseline for keyboard and semantics.
- **FR-010**: This feature MUST NOT add a CMS, backend, auth, table builder, video/embed host integration, or image gallery block.
- **FR-011**: Existing Heading and Image contracts remain; Heading text MUST be plain text (no Markdown). Paragraph content MUST accept full CommonMark-compatible Markdown (including block constructs such as headings, lists, and fenced code). Other multi-line Markdown prose fields (accordion section title, accordion section body, callout body, blockquote text) MUST use the same dialect. List item text remains inline Markdown only (structure comes from the List block). Markdown headings inside full-Markdown fields MUST render at authored levels without automatic remapping; authors SHOULD prefer Heading blocks for the primary outline.
- **FR-012**: Prose Markdown MUST support at least CommonMark-compatible emphasis (bold/italic), links, inline code, hard line breaks, headings, lists, and fenced code blocks as produced by the documented dialect. GFM-style extras (e.g. tables, strikethrough) are optional and MUST be documented if enabled. Raw HTML handling MUST follow FR-013.
- **FR-013**: Rendered Markdown MUST produce semantic HTML suitable for accessibility (real links, emphasis elements, etc.), MUST NOT render author-supplied raw HTML as DOM elements, MUST NOT execute author-supplied scripts, and MAY leave literal tag characters visible as plain text.
- **FR-014**: Accordion expand/collapse MUST work without requiring mandatory client-side script (native disclosure elements or equivalent progressive enhancement).

### Key Entities

- **CodeBlock**: Preformatted code content (literal, not Markdown); optional language label.
- **Accordion**: Container of titled sections with expand/collapse behavior; titles and bodies are full CommonMark-capable Markdown.
- **Blockquote**: Quoted Markdown-capable text with optional attribution.
- **List**: Ordered or unordered collection of items with inline-Markdown-capable text.
- **Callout**: Emphasized note with variant `info` | `tip` | `warning` and Markdown-capable body.
- **Divider**: Separating break with no fields beyond `componentType` (structural block; no prose payload).
- **Markdown prose field**: A string field documented as Markdown-capable. Paragraph, accordion titles/bodies, callout body, and blockquote text accept full CommonMark-compatible Markdown; list items accept inline Markdown only; CodeBlock and Heading are never Markdown.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: Extend block discriminated union with CodeBlock, Accordion, Blockquote, List, Callout, Divider; document which string fields are Markdown vs literal (code); Divider is `componentType`-only.
- **componentType changes**: Add `CodeBlock`, `Accordion`, `Blockquote`, `List`, `Callout`, `Divider`.
- **Example fixture**: Update or add article JSON under `data/articles/` demonstrating each new type and Markdown in at least one Paragraph and one other prose field.

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: No change to article metadata requirements; new blocks do not replace title/description/canonical/OG. Metadata strings remain plain text (not Markdown-rendered in `<title>`).
- **Accessibility**: Accordion operable by keyboard; lists semantic; code distinguishable; callouts not color-only; Markdown links/emphasis semantic. Heading **blocks** keep authored `level` 1–6; Markdown headings inside Paragraph/other full-Markdown fields also render as authored (no remapping)—authors SHOULD prefer Heading blocks for the primary outline.
- **Responsive layout**: Code regions may scroll internally; page primary content must not force full-page horizontal scroll at ~375px.
- **Performance notes**: Accordion MUST NOT require mandatory client-side script for expand/collapse; prefer native disclosure or equivalent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can view a showcase article containing all six new block types and correctly identify each type’s role within 1 minute without author notes beyond on-page content.
- **SC-002**: 100% of new block types used in fixtures render on the article page in authored order.
- **SC-003**: Accordion sections can be opened and closed via keyboard in under 3 actions per section (focus + activate).
- **SC-004**: Invalid fixture content for any new block type fails publish/build on the first attempt with a clear validation message.
- **SC-005**: At ~375px viewport width, the showcase article remains readable without horizontal scrolling of the primary page (code block internal scroll allowed).
- **SC-006**: In a fixture Paragraph (or equivalent prose field) that uses bold, a link, and inline code Markdown, a visitor sees formatted bold, a clickable link, and inline code—not the raw Markdown characters—on first view.

## Assumptions

- Recommended catalog for this feature is exactly: CodeBlock, Accordion, Blockquote, List, Callout, Divider—chosen as high-frequency blog primitives that stay simple (YAGNI). Deferred: Table, Video/Embed, Gallery, Tabs, Button/CTA.
- Markdown dialect defaults to CommonMark-compatible full parsing for Paragraph, accordion titles/bodies, and other multi-line Markdown prose fields (GFM-style extras optional); exact library choice is a planning decision. List items use inline Markdown only.
- Accordion section bodies are Markdown prose strings (not nested catalog block trees).
- Syntax highlighting for CodeBlock is optional polish; readable monospace preformatted text is the minimum bar.
- Callout variants are exactly `info` | `tip` | `warning`—not free-form CSS.
- Divider is an intentional structural block with no content payload beyond `componentType` (allowed under constitution Content model for schema-documented structural blocks).
- Title, description, Image `alt`, and Heading text stay plain text (not Markdown-rendered).
- Foundation feature `001-content-page-foundation` remains the base; this feature extends the block catalog, fixtures, and Markdown rendering for prose fields (including existing Paragraph).
- No automated test suite required (project constitution).
