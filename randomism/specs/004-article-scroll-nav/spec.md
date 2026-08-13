# Feature Specification: Article Scroll Navigation

**Feature Branch**: `004-article-scroll-nav`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "add a scroll back to top button on every article. for some articles, i would like to have a section at the top with anchor links that scrolls the user to another section in the article." + follow-ups: (1) generate a dedicated sample article — **superseded**; (2) "no need for a sample article… amend the existing data/articles/speckit.json to generate this TOC feature"

## Clarifications

### Session 2026-08-04

- Q: Missing TOC target at publish/build — fail build, allow unknown, or hybrid? → A: Allow unknown targets at build; at runtime the link does nothing harmful (no crash)
- Q: Back-to-top and the URL hash — clear, leave unchanged, or use `#top`? → A: Clear the URL hash when back-to-top is activated
- Q: How authors write TOC fragment targets in JSON — bare id, hash-prefixed, or either? → A: Bare id only (no `#` in JSON)
- Q: Highlight the current section in the TOC while scrolling (scroll spy)? → A: Out of scope — links only scroll on activation; no scroll-spy highlight
- Q: How is the TOC feature demonstrated to readers/authors? → A: ~~Ship a new dedicated published sample article~~ **Superseded:** Amend the existing published Spec Kit article (`data/articles/speckit.json` → `/articles/speckit`) with a `TableOfContents` and Heading `id`s. No separate demo article is required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Return to the top of a long article (Priority: P1)

A visitor reading a long article scrolls down the page. When they want to return to the beginning (title, intro, or on-page navigation), they activate a clear “back to top” control and the page scrolls smoothly to the top of the article view.

**Why this priority**: Every article benefits from a reliable way to jump back up without manually dragging a long scrollbar; this is the always-on navigation aid and works without any content changes.

**Independent Test**: Open any article, scroll well past the first viewport, activate the back-to-top control, and confirm the viewport returns to the top of the page. Repeat with keyboard only.

**Acceptance Scenarios**:

1. **Given** a visitor is viewing any article page and has scrolled down past the first screenful of content, **When** they activate the back-to-top control, **Then** the page scrolls to the top of the article view so the start of the page is visible and any URL fragment/hash is cleared.
2. **Given** a visitor is still near the top of an article (has not scrolled meaningfully), **When** they look for the back-to-top control, **Then** it is not prominently interrupting reading (hidden or visually dormant until scroll threshold is met).
3. **Given** a visitor using keyboard only on an article page after scrolling down, **When** they move focus to the back-to-top control and activate it, **Then** the page returns to the top, any URL fragment/hash is cleared, and focus management remains usable (control remains reachable or focus moves to a sensible landmark such as the page start).
4. **Given** a visitor arrived at (or jumped to) a section via a URL fragment, **When** they activate back-to-top, **Then** the address bar no longer includes that fragment.

---

### User Story 2 - Jump to a section via on-page links (Priority: P2)

On selected long articles, an author places an on-page navigation section near the top listing links to later sections. A visitor activates a link and the page scrolls to that section within the same article so they can skim or jump without leaving the page.

**Why this priority**: Opt-in section navigation helps long-form posts; not every article needs it, so authors choose when to include it.

**Independent Test**: Open an article that includes an on-page navigation section; activate each listed link and confirm the matching section moves into view. Open an article without that section and confirm no empty navigation chrome appears.

**Acceptance Scenarios**:

1. **Given** an article that includes an on-page navigation section with one or more section links, **When** a visitor activates a link, **Then** the page scrolls within the same article so the target section’s heading (or designated target) is brought into view.
2. **Given** an article that does **not** include an on-page navigation section, **When** a visitor opens the article, **Then** no empty or placeholder navigation list is shown.
3. **Given** an on-page navigation link, **When** a visitor activates it, **Then** the browser URL fragment reflects the target section so the link is shareable and reloadable to the same section.
4. **Given** a visitor using keyboard only, **When** they tab to an on-page navigation link and activate it, **Then** the page scrolls to the target and the destination remains understandable to assistive technology (target has an accessible name / heading).

---

### User Story 3 - Author section navigation in content (Priority: P3)

A content author adds an on-page navigation block near the top of an article’s JSON, listing human-readable labels that point at section headings elsewhere in the same article. Invalid shapes are rejected at publish/build the same way other blocks are. The existing Spec Kit article (`data/articles/speckit.json`) is amended to demonstrate the pattern: a TOC near the top, explicit Heading ids on section targets, and working jumps across its existing long-form sections—without creating a separate demo article.

**Why this priority**: Content–code separation requires opt-in navigation to live in article content; amending Spec Kit reuses an already long published post as the living example.

**Independent Test**: Open `/articles/speckit`; use every TOC link; confirm section jumps and back-to-top. Copy the fixture pattern into another draft; deliberately invalid fields fail publish/build; articles without the block (e.g. getting-started) are unchanged.

**Acceptance Scenarios**:

1. **Given** documented schema and the amended Spec Kit article fixture, **When** an author includes a valid `TableOfContents` block with one or more items in an article file, **Then** publish/build succeeds and the article shows those links near where the block was placed.
2. **Given** a navigation block with missing required fields, empty items, or undeclared fields, **When** publish/build runs, **Then** validation fails clearly and the file is not treated as shippable content.
3. **Given** section headings in Spec Kit that navigation items target, **When** the article renders, **Then** each target heading is addressable by a stable in-page fragment so links scroll to the correct section.
4. **Given** `/articles/speckit`, **When** a visitor opens the page, **Then** a TOC appears near the top with links to multiple existing major sections (at least three targets), without requiring a new article file under `data/articles/`.

---

### Edge Cases

- Very short articles: back-to-top MUST NOT appear (or MUST stay dormant) when there is nothing meaningful to scroll back from.
- Duplicate heading text in one article: fragment targets MUST remain unique so each navigation link reaches the intended section.
- TOC fragment targets that include a `#` or a full URL: MUST fail publish/build (bare id required).
- Navigation item pointing at a missing / unknown fragment: MUST NOT fail publish/build solely because the fragment is unresolved; at runtime the link MUST NOT crash or blank the article (no-op or equivalent safe degradation is acceptable).
- Reduced-motion preference: scrolling behavior MUST respect the visitor’s preference for reduced motion (instant jump allowed; animated scroll MUST NOT be forced).
- Home list and non-article pages: back-to-top and on-page navigation from this feature apply to **article pages**; the home list MUST NOT gain a spurious article-only chrome requirement from this feature.
- Deep link on load: opening an article URL that already includes a section fragment MUST land the visitor at that section (browser-default or equivalent), consistent with shareable fragments.
- Back-to-top after a fragment jump: activating back-to-top MUST clear the URL fragment so a refresh does not return mid-article.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every article page MUST provide a back-to-top control that, when activated after the visitor has scrolled down, returns the viewport to the top of the article page and clears any URL fragment/hash so the address bar matches the top of the page.
- **FR-002**: The back-to-top control MUST become available only after the visitor has scrolled past a meaningful threshold; it MUST NOT dominate the first viewport of a typical article.
- **FR-003**: The back-to-top control MUST be operable by pointer and by keyboard, with a clear accessible name (e.g. “Back to top”).
- **FR-004**: Authors MUST be able to opt an article into an on-page navigation section by including a documented content block in the article’s block list (typically near the top).
- **FR-005**: The on-page navigation block MUST render a list of links; each item MUST have a human-readable label and a fragment target. The fragment target in content JSON MUST be the bare id only (e.g. `solid-single-responsibility`) with no `#` prefix and no full URL; the renderer adds the hash when forming the in-page link.
- **FR-006**: Articles without an on-page navigation block MUST NOT show an empty navigation section.
- **FR-014**: On-page navigation MUST NOT highlight or track the section currently in view while the visitor scrolls (no scroll-spy). Section change in the TOC occurs only when the visitor activates a link (URL fragment updates per FR-008).
- **FR-007**: Heading blocks that serve as section targets MUST be addressable via in-page fragments (stable ids). Authors MAY supply an explicit fragment id on a Heading; when omitted, the system MUST derive a stable unique fragment from the heading text.
- **FR-008**: Activating an on-page navigation link MUST update the URL fragment to match the target so the section is bookmarkable and shareable.
- **FR-009**: Scroll behavior for back-to-top and section links MUST respect the visitor’s reduced-motion preference.
- **FR-010**: Invalid on-page navigation block shapes (missing items, empty labels/targets, undeclared fields, or fragment targets that include `#` / full URLs) MUST fail publish/build validation like other blocks. Unresolved fragment targets (no matching Heading id in the article) MUST NOT by themselves fail publish/build.
- **FR-013**: At runtime, activating an on-page navigation link whose fragment does not resolve to an in-page target MUST NOT crash or blank the article (safe no-op or equivalent degradation).
- **FR-011**: The on-page navigation block MUST resolve through the single component registry like other block types, with documented schema fields and an example fixture that demonstrates TOC usage.
- **FR-012**: Back-to-top is article-page chrome (not a content block); it MUST appear on article routes regardless of which blocks an article uses, and MUST NOT require authors to add a block for it.
- **FR-015**: The feature MUST amend the existing `data/articles/speckit.json` article (route `/articles/speckit`) to include a `TableOfContents` near the top with at least three items, explicit Heading `id`s on the targeted sections, and working in-page jumps. The feature MUST NOT require creating a separate new demo article file solely to showcase TOC.

### Key Entities

- **Back-to-top control**: Page-level affordance on article views; not stored in article JSON.
- **On-page navigation block**: Opt-in content block listing section links (label + fragment target).
- **Navigation item**: One labeled link; stores bare fragment id (no `#`) pointing at an in-article section.
- **Section target**: A Heading (or equivalent designated target) exposed with a unique in-page fragment id.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: Add an on-page navigation block type to the block union; each item requires a non-empty label and a non-empty bare fragment id (no `#`, no absolute/relative URL). Extend Heading to allow an optional explicit fragment `id`; when absent, fragment is derived and uniqueness is enforced per article.
- **componentType changes**: Add `TableOfContents` (on-page navigation / “on this page” section). Existing types unchanged except Heading’s optional `id`.
- **Example fixture**: **Amend** `data/articles/speckit.json` (route `/articles/speckit`): insert a `TableOfContents` near the top with ≥3 items linking to major existing sections; set explicit `id` on each targeted Heading. Do **not** create a separate TOC-only demo article. Articles without TOC (e.g. `getting-started`) remain the no-TOC control case.

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: No change to required title/description/canonical/Open Graph; fragment URLs remain the same article canonical with optional hash (hashes are not a separate indexable document requirement).
- **Accessibility**: Back-to-top and TOC links MUST have accessible names; TOC MUST be a semantic list of links; Heading targets MUST remain real headings with ids; keyboard focus and visible focus styles required; do not rely on color alone for the control.
- **Performance notes**: Interactivity for scroll/threshold MAY require a small client island on article pages; MUST NOT force heavy client JavaScript on the home list; prefer minimal client surface area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On any article longer than roughly one viewport, a visitor who has scrolled down can return to the top with one activation of the back-to-top control in under 2 seconds of perceived navigation time.
- **SC-002**: On `/articles/speckit` after the TOC amendment, 100% of listed section links scroll the matching section into view on activation (desktop and mobile viewports).
- **SC-003**: Articles without an on-page navigation block show zero navigation-list UI from this feature (no empty lists or placeholders).
- **SC-007**: While a visitor scrolls an article that has a TOC, the TOC does not change which item appears “current” solely due to scroll position (no scroll-spy behavior).
- **SC-004**: Keyboard-only visitors can operate back-to-top and on-page navigation links without requiring a pointer.
- **SC-005**: Visitors (or OS settings) who prefer reduced motion are not forced through animated scrolling for these controls.
- **SC-006**: Schema-invalid TOC/Heading content (empty required fields, undeclared keys) fails publish/build; unresolved TOC fragment targets alone do not fail build; the amended Spec Kit article builds and demonstrates both back-to-top (chrome) and section links (content).

## Assumptions

- “Every article” means individual article routes (`/articles/{slug}`), not the home article list.
- On-page navigation is **opt-in per article** via a content block, not automatically generated for all articles from headings.
- Authors place the navigation block where they want it (typically near the top); the system does not auto-inject it.
- Fragment targets are in-page only (same article); external URLs are out of scope for this block.
- Smooth scrolling is desirable when motion is allowed; instant jump is acceptable and required when reduced motion is preferred.
- TOC fragment targets in JSON are bare ids only (no `#` prefix); `#` is added when rendering links.
- Unresolved TOC fragment targets do not fail publish/build; runtime must degrade safely.
- Auto-derived heading ids follow a simple slug-from-text rule with suffixing for uniqueness; authors who need stable public deep links SHOULD set an explicit Heading `id`.
- Visual design of the back-to-top control stays minimal and consistent with the site; exact iconography is a plan/UI detail.
- Scroll-spy / “current section” highlighting in the TOC is out of scope for this feature.
- TOC demonstration is satisfied by amending `data/articles/speckit.json`; a separate `toc-navigation-demo` (or similar) article is **not** required.
- Home page and non-article routes are out of scope for back-to-top unless a later feature extends them.
- No CMS, auth, or automated test suite is required by this feature (constitution v1 defaults).
