# Feature Specification: Content Page Foundation

**Feature Branch**: `001-content-page-foundation`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Build the Randomism foundation: a Next.js App Router TypeScript site that loads in-repo JSON pages/articles, validates them against a documented block schema (componentType, content, …), renders blocks through a single component registry, and ships one sample home page plus one sample article with title/description/canonical/Open Graph metadata. Include Heading, Paragraph, and Image block types with example fixtures. No CMS, backend, auth, or tests."

## Clarifications

### Session 2026-08-03

- Q: How do visitors navigate from the home page to the sample article? → A: ~~Site chrome/nav link outside content JSON; home body stays Heading/Paragraph/Image only~~ **Superseded:** Home is an article list generated from `data/` JSON files; each list entry links to its article. Site chrome may still include brand/home affordances. No Link content block required for listing.
- Q: What is the sample article URL path? → A: `/articles/welcome` (additional articles use `/articles/{slug}` derived from each article’s identity)
- Q: How should undeclared/extra fields on blocks be handled? → A: Reject — content with undeclared fields is invalid (same as other schema failures)
- Q: What happens if shipped home/article content is schema-invalid at publish/build time? → A: Fail the publish/build
- Q: What SEO metadata does the home page require? → A: Title + description required; canonical/Open Graph MAY derive from site defaults
- Q: Must pages be mobile responsive? → A: Yes — all public pages MUST be usable on mobile viewports without horizontal scrolling of primary content
- Q: What is the home page? → A: A list of articles generated from article JSON files stored in `data/articles/`; each article has its own JSON file
- Q: Which `data/` files appear on the home list / public routes? → A: Only articles with an explicit published/visible flag; list ordered by publish date
- Q: How is an article’s slug determined? → A: Filename is the slug (`welcome.json` → `welcome` → `/articles/welcome`)
- Q: Where under `data/` do article JSON files live? → A: Nested — only `data/articles/*.json` are articles
- Q: How should non-`.json` files inside `data/articles/` be handled? → A: Ignore them; only `*.json` files are considered articles
- Q: Must unpublished (draft) article JSON still pass schema validation on publish/build? → A: Yes — validate every `data/articles/*.json`; invalid drafts also fail publish/build

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse articles on the home page (Priority: P1)

A visitor opens the Randomism home page and sees a list of **published** articles. The list is generated from article JSON files in `data/articles/` that are marked published/visible (not hand-maintained separately). Entries are ordered by publish date. Each entry links to that article’s page.

**Why this priority**: The home page is the primary entry point for discovering reading material; without an accurate generated list of published articles, new posts would not appear automatically and drafts could leak.

**Independent Test**: Place published and unpublished article JSON files in `data/articles/`, open the home page, and confirm only published articles appear (ordered by publish date) and each entry navigates to the correct article URL.

**Acceptance Scenarios**:

1. **Given** one or more valid article files under `data/articles/` marked published/visible, **When** a visitor opens the home page, **Then** they see a list entry for each published article (titles from article metadata), ordered by publish date.
2. **Given** an article file under `data/articles/` that is not marked published/visible, **When** a visitor opens the home page, **Then** that article does not appear in the list.
3. **Given** the home page list is displayed, **When** the visitor activates an article’s list entry, **Then** they arrive at that article’s public path (`/articles/{slug}`, e.g. `/articles/welcome`).
4. **Given** a new valid article JSON file is added under `data/articles/` with published/visible set and a publish date, and the site is rebuilt/refreshed for static delivery, **When** a visitor opens the home page, **Then** the new article appears in the list in publish-date order without editing a separate homepage content file.
5. **Given** the home page, **When** document metadata is inspected, **Then** title and description are present (canonical/Open Graph MAY come from site defaults).

---

### User Story 2 - Read an individual article (Priority: P2)

A visitor opens an article URL and reads its full body as structured blocks from that article’s JSON file, with correct document metadata (title, description, canonical URL, Open Graph).

**Why this priority**: Articles are the core blog deliverable; each article’s JSON is the source of truth for body and metadata.

**Independent Test**: Open `/articles/welcome` (and any other sample article) directly and verify body content plus metadata fields match that article’s JSON file.

**Acceptance Scenarios**:

1. **Given** an article JSON file exists for slug `welcome`, **When** a visitor opens `/articles/welcome`, **Then** heading, paragraph, and image blocks from that file render in authored order.
2. **Given** an article page, **When** metadata is inspected, **Then** title, description, canonical URL, and Open Graph title/description/URL (and image when defined) match that article’s JSON metadata.
3. **Given** a meaningful image block on the article, **When** the page is rendered, **Then** the image includes appropriate alternative text.

---

### User Story 3 - Dependable content rendering (Priority: P3)

A content author (or developer acting as author) relies on documented content rules so articles are built from known block types stored as JSON under `data/articles/`. Invalid or unknown blocks do not silently corrupt the reading experience: problems are obvious during local development, and production remains safe for readers. Invalid shipped article files fail publish/build.

**Why this priority**: The foundation’s value is a trustworthy content→page pipeline; without validation and unknown-type handling, later articles will be fragile.

**Independent Test**: Attempt to load content that is missing required fields or uses an unknown block type; confirm development surfaces the problem clearly, publish/build fails for invalid shipped files, and production does not crash the whole page for defensive unknown-type skips.

**Acceptance Scenarios**:

1. **Given** an article JSON file that violates the documented schema (including undeclared fields), **When** it is loaded in a development context, **Then** the failure is clearly reported and the content is not treated as a valid article.
2. **Given** content that includes an unknown block type, **When** the page is rendered in development, **Then** the unknown block is clearly indicated and does not fail silently.
3. **Given** content that includes an unknown block type, **When** the page is rendered for readers in production (defensive path), **Then** the rest of the page still renders and the unknown block is skipped without crashing the page.
4. **Given** a schema-invalid article JSON under `data/articles/` (published or unpublished) that is part of the shipped set, **When** publish/build runs, **Then** the build fails.

---

### Edge Cases

- Missing required metadata on an article (title or description): content MUST NOT be treated as valid; publish/build MUST fail for that `*.json` file whether published or draft.
- Empty `data/articles/` folder (no article files): home MAY show an empty list in development; shipped foundation MUST include at least one valid **published** sample article file.
- Unpublished (not published/visible) article files MAY exist under `data/articles/` for authoring; they MUST NOT appear on the home list and MUST NOT be publicly routable, but they MUST still pass full schema validation on publish/build.
- Non-`.json` files in `data/articles/`: MUST be ignored for discovery; MUST NOT fail publish/build by presence alone.
- JSON files elsewhere under `data/` (outside `data/articles/`) MUST NOT be treated as articles.
- Published articles missing a publish date: MUST fail schema validation / publish/build. Publish date is required when published/visible is true; unpublished drafts MAY omit publish date.
- Duplicate article slugs / filenames across files: publish/build MUST fail (filename-derived slug identity MUST be unique).
- Invalid slug filenames (empty, unsafe path characters, etc.): MUST fail schema/discovery validation per documented filename rules.
- Empty block list on an article: MUST fail publish/build validation (every article JSON, including drafts, MUST have at least one block).
- Image block without alt text for a meaningful image: content MUST NOT be treated as valid; publish/build MUST fail.
- Broken or missing image source at runtime: page still renders surrounding blocks when an asset fails to load; missing required `src` in content is a schema failure (reject / fail build).
- Extra unknown fields on an otherwise valid block or article document: content MUST be rejected as invalid; extras MUST NOT be silently ignored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Visitors MUST be able to open a public home page that displays a list of **published** articles generated from article JSON files stored in `data/articles/` (not from a CMS or live backend, and not from a separately maintained homepage article list file).
- **FR-002**: Each article MUST be defined by exactly one corresponding JSON file under `data/articles/` (e.g. `data/articles/welcome.json`). Visitors MUST be able to open each **published** article at `/articles/{slug}` (sample includes `/articles/welcome`). Unpublished articles MUST NOT be publicly routable.
- **FR-003**: Article bodies MUST be ordered collections of content blocks defined in that article’s JSON file.
- **FR-004**: Each block MUST declare a block type identifier (`componentType`) and a content payload (`content` or documented equivalent fields).
- **FR-005**: The system MUST support exactly these block types in the foundation: Heading, Paragraph, and Image (no Link block required for the home listing).
- **FR-006**: Each supported block type MUST map through a single shared registry to exactly one renderer; article pages MUST NOT use ad-hoc per-page rendering switches for these types.
- **FR-007**: Every `*.json` file under `data/articles/` MUST be validated against a documented schema before publish/build succeeds—including unpublished/draft articles. Undeclared fields MUST cause validation failure (rejection), not silent ignore. Schema-invalid shipped article files under `data/articles/` MUST fail the publish/build. Unpublished articles that pass validation still MUST NOT appear on the home list or be publicly routable.
- **FR-008**: Example fixtures MUST exist: at least two published sample article JSON files under `data/articles/` with different publish dates (including `welcome`), covering Heading, Paragraph, and Image block usage; an unpublished draft fixture MAY be included to demonstrate exclusion.
- **FR-009**: Every article MUST provide title, description, canonical URL, and Open Graph metadata for sharing/discovery.
- **FR-010**: Pages MUST use semantic structure (appropriate landmarks/headings), maintain heading hierarchy consistent with Heading blocks, support keyboard access for interactive elements (including list links), meet sufficient text contrast for default styling, and require alt text for meaningful images.
- **FR-011**: Unknown block types MUST fail loudly in development and degrade safely in production (skip block, keep page usable).
- **FR-012**: The foundation MUST NOT include a CMS, application backend, authentication, or automated test suites.
- **FR-013**: Site delivery MUST prefer static generation; no server-only backend feature is required for this foundation.
- **FR-014**: The home page article list MUST be generated by discovering article JSON files in `data/articles/` that are marked published/visible. Adding or removing a published article file (or toggling published/visible) MUST change the home list after rebuild/refresh without editing a separate homepage content document.
- **FR-015**: The home page MUST provide title and description metadata (site defaults are acceptable). Canonical URL and Open Graph for home MAY be derived from site defaults.
- **FR-016**: All public pages (home, article, and shared chrome) MUST be mobile responsive: primary content and navigation MUST remain readable and usable on common phone-width viewports without requiring horizontal scrolling of the page content.
- **FR-017**: Each article’s slug MUST be derived from its JSON filename under `data/articles/` (without extension). Example: `data/articles/welcome.json` → slug `welcome` → path `/articles/welcome`. Filenames MUST be unique among article files.
- **FR-018**: Each home list entry MUST expose at least the article title and a navigable control to the article URL; description MAY be shown as a summary when present in article metadata.
- **FR-019**: Each article JSON MUST include an explicit published/visible flag. Only articles with that flag set to published/visible MUST appear on the home list and receive a public article route.
- **FR-020**: Published articles MUST include a publish date. The home list MUST be ordered by publish date (newest first). Unpublished drafts MAY omit publish date.
- **FR-021**: Article discovery MUST consider only `*.json` files directly under `data/articles/`. Non-`.json` files in that folder MUST be ignored and MUST NOT cause publish/build failure by presence alone. Unreadable or malformed `.json` files that cannot be parsed MUST fail validation/build when they are part of the article candidate set.

### Key Entities

- **Article file**: One JSON document under `data/articles/` whose filename (without extension) is the article slug, containing published/visible flag, publish date when published, SEO metadata, and ordered blocks. Source of truth for that article’s page (when published) and its home-list entry.
- **Article**: A public long-form page at `/articles/{slug}` for published articles only (`{slug}` = filename stem), with required SEO metadata and an ordered list of blocks, rendered from its article file.
- **Article list (home)**: The public home page view generated by aggregating metadata from published article files in `data/articles/`, ordered by publish date (newest first).
- **Block**: A single content unit with `componentType`, content payload, and type-specific fields (e.g., heading level/text, paragraph text, image source and alt text).
- **Block type catalog**: The set of known `componentType` values for this feature: Heading, Paragraph, Image—each with documented fields and example usage in sample article files.
- **Content registry mapping**: The rule that each known `componentType` resolves to exactly one renderer.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: Introduce article document shape stored under `data/articles/` (identity via filename slug, published/visible flag, publish date, SEO metadata, ordered blocks) and block schemas for Heading, Paragraph, and Image. Home has no separate page body JSON; it is derived from **published** article files, ordered by publish date.
- **componentType changes**: Add `Heading`, `Paragraph`, and `Image`.
- **Example fixture**: At least two published article JSON files in `data/articles/` with different publish dates (including `welcome`); optionally one unpublished draft file to demonstrate exclusion; block usage demonstrated inside article fixtures.

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: Each article MUST include title, description, canonical URL, and Open Graph title/description/URL (and image when defined). Home MUST include title and description; home canonical/Open Graph MAY use site defaults. Structured data is optional for this foundation.
- **Accessibility**: Semantic page structure, keyboard-usable list links and chrome, sufficient contrast in default theme, alt text on meaningful images, heading levels that form a coherent hierarchy on article pages.
- **Responsive layout**: All public pages MUST adapt to mobile viewports; text and images MUST reflow within the viewport; home list and chrome MUST remain usable on small screens.
- **Performance notes**: Prefer static pages; optimize images appropriately; avoid client-only interactivity unless required (none expected for this foundation).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can open the home page, see published articles derived from `data/articles/` in publish-date order, and open an article from a list entry in under 30 seconds.
- **SC-002**: 100% of foundation block types used in sample article JSON (Heading, Paragraph, Image) render visibly in the authored order on the sample article page(s).
- **SC-003**: For a sample article, title, description, canonical URL, and Open Graph tags match that article’s JSON metadata in a single inspection pass. Home title and description are present in a single inspection pass.
- **SC-004**: Given a deliberately invalid article JSON under `data/articles/`—published or unpublished—(missing required field, undeclared field, or unknown block type), a developer can identify the problem during local preview within one attempt, and a publish/build that includes that invalid file fails instead of succeeding.
- **SC-005**: The delivered foundation includes no CMS, auth flow, or backend content API—visitors only consume preauthored in-repo article JSON under `data/articles/`.
- **SC-006**: On a phone-width viewport (~375px wide), a visitor can browse the home article list and read a sample article without horizontal scrolling of primary content.
- **SC-007**: After adding a new valid **published** article JSON file under `data/articles/` (with publish date) and rebuilding, the home list entry count increases by one without editing any homepage-specific content file; unpublished files do not appear on the list or as public routes.
- **SC-008**: On the home list, articles appear in newest-first publish-date order (verifiable with at least two published sample articles that have different dates).

## Assumptions

- Brand name is Randomism; visual design may be minimal but must meet the accessibility baseline (readable type, contrast, semantic HTML).
- Article JSON files live only under `data/articles/*.json` (not elsewhere under `data/`).
- Non-`.json` files under `data/articles/` are ignored (not articles; do not fail build by presence).
- Foundation ships with at least one sample **published** article file for slug `welcome` at `/articles/welcome` (`data/articles/welcome.json`); a second published sample with a different publish date is required to demonstrate list ordering (SC-008).
- Home is a generated article index of published articles only, not a block-composed marketing page; no separate homepage body JSON is required.
- Home list links are ordinary navigational links in the UI (not a content `Link` block type).
- Article JSON includes an explicit published/visible flag; only published articles are listed and publicly routed.
- Published articles require a publish date; home list is ordered newest-first by that date.
- Article slug is the JSON filename stem (no separate slug field required in foundation).
- List ordering no longer falls back to filename when published (publish date is mandatory for published articles).
- Canonical URL may use a configurable site base URL with a sensible local default for development previews.
- Heading blocks support common levels needed for article structure; exact level enum is defined in the schema during planning.
- Image content uses local or static asset paths suitable for in-repo hosting; remote image CDN is out of scope.
- Structured data (e.g., Article rich results) is deferred unless added in a later feature.
- No automated tests are produced; verification is manual via acceptance scenarios.
- Stack and delivery approach follow the project constitution (static-first, in-repo content, TypeScript/Next.js App Router at implementation time)—this spec states outcomes, not implementation steps.
- Schema validation is strict: undeclared fields are rejected the same as missing required fields.
- Every `data/articles/*.json` file (including unpublished drafts) MUST pass schema validation for publish/build to succeed.
- Publish/build MUST fail when any `data/articles/*.json` fails schema validation.
- Home requires title + description (site defaults OK); articles require full SEO set (title, description, canonical, Open Graph).
- All public pages are mobile responsive (readable/usable at ~375px width without horizontal scroll of primary content).
- “Production” unknown-block behavior means the publicly served build for content that already passed publish validation but still contains an unknown type at render time (defensive); “development” means local preview used while authoring content.
