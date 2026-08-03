# Feature Specification: MUI Component Library

**Feature Branch**: `003-mui-component-library`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Implement mui component library"

## Clarifications

### Session 2026-08-03

- Q: Theme look? → A: Brand-tuned theme — approximate current Randomism look (warm paper, dark text, teal accent)
- Q: Accordion after MUI? → A: Use Material UI Accordion; multiple sections may be expanded; client-side Accordion behavior is acceptable
- Q: Legacy custom CSS? → A: Retire custom presentation CSS — migrate into MUI theme/components; only minimal document defaults may remain
- Q: Color mode? → A: Light + dark themes with a visitor-facing mode toggle
- Q: Default mode on first visit? → A: Follow system preference until the visitor toggles; then remember their choice across visits

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Material-based site chrome (Priority: P1)

A visitor opens the home page or any article and sees site chrome (brand header, primary navigation affordances, page shell, and a color-mode control) built from a single Material UI component system with coherent light and dark themes—rather than one-off styled markup that diverges over time.

**Why this priority**: Shared chrome is the first surface every visitor hits; adopting the library here proves theming, accessibility defaults, and layout primitives work before deeper content UI migration.

**Independent Test**: Open `/` and `/articles/getting-started`; confirm header/shell use the shared Material UI theme (typography, color, spacing), the mode toggle switches light/dark, and chrome remains keyboard-usable and readable at ~375px width.

**Acceptance Scenarios**:

1. **Given** the site is running with the new library integrated, **When** a visitor views the home page, **Then** the site header and main shell follow the shared brand-tuned light theme (warm paper-like surface, dark text, teal accent family) and the brand/home link still works.
2. **Given** a visitor uses keyboard only on the home page, **When** they move focus through chrome controls/links (including the color-mode control), **Then** focus is visible and activation still works as intended.
3. **Given** a first-time visitor whose system prefers dark (and who has not toggled yet), **When** they open the home page, **Then** dark theme surfaces are used initially.
4. **Given** a visitor activates the color-mode control, **When** they switch modes and later return in the same browser, **Then** chrome and page surfaces keep their chosen mode without requiring them to toggle again.

---

### User Story 2 - Article and block UI uses the same library (Priority: P2)

A visitor reading an article sees body chrome and block presentation (headings, paragraphs, lists, callouts, code regions, accordion, quotes, dividers, images) expressed through the same Material UI system and theme as the site shell, without losing existing block behaviors (Markdown prose, accordion multi-open, draft tag, SEO metadata).

**Why this priority**: Content pages are the product; the library only delivers full value when article bodies are consistent with chrome—not a mismatched second design language.

**Independent Test**: Open `/articles/getting-started` and confirm each block type still fulfills its prior behavior while visually aligning with the shared theme (including Markdown formatting and accordion expand/collapse).

**Acceptance Scenarios**:

1. **Given** the showcase article with all block types, **When** a visitor views it, **Then** blocks remain in authored order and keep their roles (code is preformatted, accordion toggles, lists/quotes/callouts remain distinguishable).
2. **Given** Markdown in a paragraph or other prose field, **When** the article renders, **Then** bold, links, and inline code still appear as formatted content—not raw Markdown punctuation.
3. **Given** a draft article URL, **When** a visitor opens it, **Then** the Draft indicator remains present and the page is still not listed on home.

---

### User Story 3 - Authors and contributors see a documented UI baseline (Priority: P3)

A content author or contributor consulting project docs understands that public UI is built with the Material UI library, where theme/customization lives at a high level, and that article JSON / `componentType` contracts are unchanged by this feature.

**Why this priority**: Prevents accidental reintroduction of ad-hoc styling and clarifies that content schema is not the migration target.

**Independent Test**: Read the updated README (or equivalent author-facing note); confirm it names the UI library baseline and states that article JSON block types are unchanged.

**Acceptance Scenarios**:

1. **Given** project setup docs, **When** a contributor looks for UI guidance, **Then** they find a clear statement that public UI uses the Material UI component library and theme.
2. **Given** existing article JSON fixtures, **When** publish/build runs after the migration, **Then** schemas and fixtures remain valid without requiring new `componentType` values solely for this feature.

---

### Edge Cases

- Interactive blocks (accordion) MUST remain operable by keyboard after migration; multiple sections MAY stay expanded at once.
- Accordion implementation MAY use Material UI client-side Accordion; it MUST NOT regress Markdown in titles/bodies or authored section order.
- Long code blocks MUST still allow internal horizontal scroll without forcing full-page horizontal scroll at ~375px.
- Callout tone MUST remain understandable without relying on color alone (text label retained).
- Home list and article SEO metadata (title, description, canonical, Open Graph) MUST remain correct after chrome/body restyle.
- If a Material UI control requires client-side behavior, the site MUST NOT regress static article content or draft/published listing rules.
- Color-mode toggle MUST be keyboard-operable and MUST NOT rely on color alone to convey current mode (e.g. accessible name / clear control labeling).
- Residual one-off CSS that reimplements theme colors/type for migrated surfaces MUST be treated as incomplete migration (remove or fold into theme).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST adopt Material UI (MUI) as the shared component library for public site chrome (header/shell) and for rendering existing article page UI surfaces (including block presentational wrappers).
- **FR-002**: The system MUST provide shared light and dark themes applied consistently across home and article pages. Light theme tokens MUST approximate the current Randomism character: warm paper-like background, dark body text, and teal accent (exact values are a planning decision)—not unmodified stock Material branding. Dark theme MUST provide readable contrast for the same surfaces. Visitors MUST be able to switch between light and dark via an on-page control. Until the visitor has chosen a mode, the site MUST follow the operating-system / browser color-scheme preference. After the visitor toggles, the chosen mode MUST persist across visits in the same browser (exact storage mechanism is a planning decision).
- **FR-003**: Existing article content contracts MUST remain: no new `componentType` values required solely to “use MUI”; JSON fixtures that were valid before MUST remain valid.
- **FR-004**: All existing block behaviors MUST be preserved except where this feature explicitly changes presentation controls: Heading (plain text), Paragraph/other Markdown fields, Image with alt, CodeBlock literal code, Blockquote, List (ordered/unordered + inline Markdown), Callout variants with text labels, Divider. Accordion MUST use Material UI Accordion (or equivalent MUI disclosure), MUST allow multiple sections expanded at once, MUST remain keyboard-operable, and MUST keep Markdown titles/bodies. Client-side behavior for Accordion is allowed for this control.
- **FR-005**: Home MUST continue to list only published articles ordered by publish date; drafts remain URL-reachable with Draft indication and not listed.
- **FR-006**: Accessibility baseline MUST hold after migration: semantic structure where applicable, keyboard operation for interactive controls, visible focus, sufficient contrast, image alt text, sensible heading hierarchy for Heading blocks.
- **FR-007**: Responsive readability MUST hold at ~375px viewport width (no primary-page horizontal scroll; code regions may scroll internally).
- **FR-008**: Project documentation MUST state that public UI uses Material UI and that content JSON/`componentType` authorship is unchanged by this feature.
- **FR-009**: This feature MUST NOT add a CMS, backend, auth, or automated test suite.
- **FR-011**: Presentational styling for public pages MUST live in the Material UI theme and components. Legacy custom presentation stylesheets MUST be retired or reduced to minimal document defaults (e.g. box-sizing / margin reset)—not a parallel design system beside MUI.

### Key Entities

- **Theme**: Shared light and dark visual tokens (color, type, spacing, shape) plus visitor color-mode preference.
- **Site chrome**: Header/brand/shell and color-mode control presented via Material UI primitives under the active theme.
- **Block presentation**: Existing registry-backed blocks restyled or composed with Material UI while keeping schema payloads unchanged.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: None required for this feature (presentation-only migration).
- **componentType changes**: None.
- **Example fixture**: No new fixture required; existing `data/articles/getting-started.json` remains the visual/behavior regression sample. Update only if a presentation bug forces content tweak (prefer not).

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: Keep existing article and home metadata behavior (title, description, canonical, Open Graph); drafts retain non-indexing preference as today.
- **Accessibility**: Preserve keyboard accordion, semantic lists/quotes/code, callout text labels, focus visibility, contrast under the new theme.
- **Performance notes**: Prefer server rendering where the library allows; Accordion MAY be a Client Component. Limit other client-only UI to what theming/interactivity truly requires; justify Material UI + Accordion client cost in plan Complexity Tracking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can open home and the getting-started article and confirm within 1 minute that chrome and article body share one visual system (type, color, spacing) rather than two unrelated styles.
- **SC-007**: A visitor can switch between light and dark via the on-page control in under 5 seconds and see both chrome and article surfaces update. After a full revisit in the same browser, the selected mode is still applied. Before any toggle, a visitor with system dark preference sees dark theme on first load.
- **SC-002**: 100% of existing block types on the getting-started article still render in authored order with prior behavioral roles intact (code literal, accordion toggle, Markdown formatting, draft rules unchanged on draft URL).
- **SC-003**: At ~375px width, home and getting-started remain readable without primary-page horizontal scroll.
- **SC-004**: Keyboard-only users can expand and collapse an accordion section in under 3 actions (focus + activate) after migration.
- **SC-005**: Publish/build succeeds with current valid fixtures and still fails clearly when article JSON is invalid.
- **SC-006**: README (or equivalent) documents the shared public UI component-library baseline in one short paragraph a new contributor can find in under 2 minutes.

## Assumptions

- “MUI” means Material UI for React (Material Design components), not a different product with a similar acronym.
- Scope is presentation migration of **existing** public surfaces (chrome + current block/page UI), not a redesign of information architecture and not new marketing pages.
- Theme customization MUST include brand-tuned **light** tokens (warm paper background, dark text, teal accent) and a readable **dark** counterpart—exact values are a planning decision. Unmodified stock Material branding is not acceptable for light mode.
- Visitors get an on-page light/dark toggle. Before any choice, mode follows system color-scheme preference; after a choice, preference persists across visits in the same browser (storage mechanism is a planning decision).
- Content–code separation and the single component registry remain non-negotiable; MUI wraps or replaces presentational markup inside existing components, not a parallel page-builder.
- Custom presentation CSS (e.g. large `globals.css` block styles) is retired in favor of MUI theme + components; only minimal document defaults may remain.
- Joy UI, MUI X premium grids/charts, and unrelated MUI packages are out of scope unless a later feature requests them.
- Foundation features `001` and `002` remain the behavioral baseline; this feature changes how UI is built, not what articles mean.
- No automated test suite (constitution).
- Accordion uses Material UI Accordion with multi-expand allowed; this intentionally accepts client-side Accordion behavior (overrides the “no mandatory client script for accordion” preference from feature `002` for this control only).
- Client-side theme/runtime pieces are allowed as required by Material UI integration, color-mode toggle, and Accordion; other Client Components still require justification under constitution Performance Discipline (plan Complexity Tracking).
