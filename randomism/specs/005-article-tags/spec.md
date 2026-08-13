# Feature Specification: Article Tags

**Feature Branch**: `005-article-tags`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "implement tags" (add topic tags to each article) + follow-up: "in home page, can i show a list of all tags, clicking on each tag filters the articles"

## Clarifications

### Session 2026-08-13

- Q: Home page tag list and filter? → A: Yes. The home page shows the unique tags from published articles. Activating a tag filters the article list to published articles that include that tag. Filtering stays on the home page (no separate tag-archive pages). An equivalent “show all” control restores the full published list.
- Q: How should tag labels appear to visitors? → A: Humanize for display only (`Coding Standards`); storage and filter addresses stay hyphenated.
- Q: How does a visitor clear an active tag filter? → A: Show all clears the filter. Activating the already-selected tag also deactivates it and restores the full published list.
- Q: When should the Show all control appear? → A: Always visible with the tag list; it is the selected/current control when no tag filter is active.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See an article’s topics at a glance (Priority: P1)

A visitor opens an article and, near the title, sees short topic labels that describe what the piece is about (humanized for reading, e.g. `coding-standards` shown as **Coding Standards**). They can tell the subject area without reading the full body. If an article has no tags, the page looks as it does today—no empty tag area. Activating a tag takes them to the home page already filtered to that topic.

**Why this priority**: Tags only help if they are visible on the article itself. This is the core reader value and works even if the visitor never uses the home filter.

**Independent Test**: Open a tagged article and confirm the labels appear near the title. Open an article with no tags and confirm no empty tag chrome. Confirm the Draft status indicator (when present) is still distinct from topic tags. Activate a tag and land on the home list filtered to that tag.

**Acceptance Scenarios**:

1. **Given** a published article that lists one or more tags, **When** a visitor opens that article, **Then** those tags appear near the title as humanized topic labels (hyphens become spaces; each word capitalized), in the same order the author recorded them.
2. **Given** an article with no tags (omitted or empty), **When** a visitor opens that article, **Then** no empty tag list, placeholder, or “tags:” chrome is shown.
3. **Given** a draft article that has tags, **When** a visitor opens it by URL, **Then** the topic tags still appear, and the existing Draft status indicator remains clearly separate from topic tags.
4. **Given** a visitor using a screen reader or keyboard only, **When** they reach the article header, **Then** the topic labels are announced as a meaningful group of controls (not unlabeled decorations), are operable from the keyboard, and do not trap focus.
5. **Given** a tagged article, **When** a visitor activates one of its topic labels, **Then** they arrive at the home page with the article list filtered to that tag.

---

### User Story 2 - Filter the home list by tag (Priority: P2)

A visitor on the home page sees a list of all tags used by published articles, with a **Show all** control that stays visible and is the current selection when nothing is filtered. They activate one tag and the article list shows only published articles that include that tag. They can return to the full list with Show all, or by activating the selected tag again (which deactivates it). The filtered view is reloadable and shareable.

**Why this priority**: This is the requested home-page behavior. It turns tags into a way to choose what to read, not only labels to look at.

**Independent Test**: Open the home page; confirm Show all is visible and current, with every distinct published tag beside it. Activate a tag that appears on more than one article and confirm only matching published articles remain and that tag is current. Activate Show all and confirm the full published list returns and Show all is current again. Repeat from a filtered view by activating the selected tag again and confirm the filter clears. Reload the filtered address and confirm the same subset. Confirm drafts never appear in the tag list or the filtered results.

**Acceptance Scenarios**:

1. **Given** published articles that together use two or more distinct tags, **When** a visitor opens the home page with no tag selected, **Then** they see a list of those unique tags plus a Show all control that is the current/selected control, and the article list includes every published article (tagged or not).
2. **Given** the home page, **When** a visitor activates a tag in that list, **Then** the article list shows only published articles that include that tag, the selected tag is visually and accessibly indicated, and untagged published articles are hidden for that view.
3. **Given** a filtered home view, **When** a visitor activates the Show all control, **Then** the article list returns to every published article, no topic tag is selected, and Show all is the current/selected control.
4. **Given** a filtered home view, **When** a visitor activates the already-selected tag (in the all-tags list or on a listing), **Then** that tag is deactivated, the article list returns to every published article, no topic tag is selected, and Show all is the current/selected control.
5. **Given** a filtered home view, **When** a visitor reloads the page or opens the same address in a new tab, **Then** they still see the same tag selected and the same filtered article list.
6. **Given** a visitor using keyboard only, **When** they move through the home tag list and activate a tag, **Then** the list filters as above without requiring a pointer.
7. **Given** a draft article that uses a tag no published article uses, **When** a visitor views the home tag list, **Then** that tag does not appear and the draft does not appear in any filtered list.

---

### User Story 3 - Scan topics on each home listing (Priority: P3)

A visitor on the home page also sees each published article’s topic tags next to its title and summary. Activating a tag on a listing applies the same home filter rules as the all-tags list (select if inactive; deactivate if it is already the selected filter).

**Why this priority**: Per-article tags help skim subjects in the current list and give a second way to start a filter. The all-tags list (P2) remains the primary filter control.

**Independent Test**: Open the home page; confirm each tagged published article shows its tags; activate a tag on a listing and confirm the page filters to that tag; confirm a published article with no tags still lists normally without empty tag chrome.

**Acceptance Scenarios**:

1. **Given** published articles that have tags, **When** a visitor views the home list (all or filtered), **Then** each visible tagged article shows its tags with the listing (title, summary, date).
2. **Given** a published article with no tags, **When** a visitor views the unfiltered home list, **Then** that article still appears with title, summary, and date, and no empty tag chrome.
3. **Given** the home list with no tag selected, **When** a visitor activates a tag on an article listing, **Then** the home page filters to that tag the same way as activating it in the all-tags list.
4. **Given** a home list already filtered to a tag, **When** a visitor activates that same tag on an article listing, **Then** the filter clears (the tag is deactivated), matching the all-tags list.
5. **Given** a draft that has tags, **When** a visitor views the home list, **Then** the draft still does not appear (tags do not make drafts public).

---

### User Story 4 - Authors attach tags in article content (Priority: P4)

A content author adds topic tags on the article record (alongside title and description), not as a body block. Invalid tags are rejected at publish/build the same way other invalid article fields are. Existing published articles are given at least one tag so the live site demonstrates both labels and home filtering.

**Why this priority**: Content–code separation requires tags to live in article content. Authoring and validation make the reader stories durable.

**Independent Test**: Open several published articles and the home page and see tags plus a working filter. Copy a valid tag list into a draft. Deliberately invalid tags (empty, duplicate, undeclared fields, or malformed labels) fail publish/build. An article with no `tags` field still publishes.

**Acceptance Scenarios**:

1. **Given** documented schema, **When** an author includes a valid `tags` list on an article file, **Then** publish/build succeeds and those labels appear on the article page, on the home listing (if published), and in the home all-tags list (if published).
2. **Given** an article with no `tags` field, or with an empty list, **When** publish/build runs, **Then** validation succeeds and the article renders without tag chrome.
3. **Given** tags that are empty, duplicated within the same article, or that violate the documented label format, **When** publish/build runs, **Then** validation fails clearly and the file is not treated as shippable content.
4. **Given** the existing published articles in the content tree, **When** this feature ships, **Then** each of those published articles includes at least one tag, and the home all-tags list contains more than one tag so filtering is demonstrable.

---

### Edge Cases

- Article with a single tag: MUST show that one label; MUST NOT look like a broken or incomplete list.
- Article with several tags: MUST show all of them in author-specified order; MUST remain readable on a narrow viewport (labels wrap rather than overflow or truncate unreadably).
- Duplicate tag on one article: MUST fail publish/build.
- Empty string or whitespace-only tag: MUST fail publish/build.
- Mixed-case or spaced labels that violate the documented format: MUST fail publish/build.
- Unknown extra fields on the article (other than documented ones): still rejected as today; adding `tags` MUST NOT relax that rule.
- Tags are not a body block: placing a `Tags` (or similar) block in `blocks` MUST fail as an unknown block type.
- Home list with a mix of tagged and untagged published articles: untagged items appear on the unfiltered list and MUST NOT appear when a tag filter is active; they MUST NOT shift layout in a broken way when shown.
- Drafts: tags MUST NOT cause a draft to appear on the home list, in the all-tags list, or in filtered results, and MUST NOT be indexed.
- Very long individual tag labels: constrained by the documented format (short hyphenated labels); oversized or malformed values fail validation rather than breaking the layout.
- Display vs identity: visitors MUST see the humanized form everywhere tags are shown; matching, uniqueness, and the filtered address MUST use the stored hyphenated identity. A single-word tag such as `react` displays as `React`.
- No published article has tags: the home page MUST NOT show an empty all-tags list or filter chrome; the article list behaves as today.
- Only one distinct published tag exists: the all-tags list MUST still appear (that one tag plus Show all); filtering to it shows every published article that has that tag.
- Filter address for a tag that no published article uses (typed or stale): MUST NOT crash; MUST show an empty article list with a clear “no matching articles” (or equivalent) message, still offer the all-tags list and Show all, and MUST NOT show drafts.
- Selecting a second tag: replaces the current filter (single-tag filter only; multi-select is out of scope).
- Activating the already-selected tag on the home page (all-tags list or a listing): MUST deactivate it and restore the unfiltered published list (same outcome as Show all); Show all becomes the current selection.
- Activating Show all while already unfiltered: MUST keep the full published list; Show all remains the current selection.
- Activating a tag on an article page: MUST always open the home page filtered to that tag (article-page tags do not toggle).
- Narrow viewports: the all-tags list MUST wrap or otherwise remain fully usable; it MUST NOT overflow the page or hide article titles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Authors MUST be able to attach zero or more topic tags to an article as article-level metadata (same class of fields as title and description), not as a body block.
- **FR-002**: Each tag MUST be a non-empty short topic label in lowercase hyphenated form (example: `react`, `coding-standards`). Spaces, uppercase letters, and other punctuation MUST be rejected at publish/build. This stored form is the tag’s identity for uniqueness, filtering, and the shareable filtered address.
- **FR-019**: Visitors MUST see a derived display form of each tag: replace hyphens with spaces and capitalize the first letter of each word (example: `coding-standards` → `Coding Standards`; `react` → `React`). Accessible names MUST use this display form. Authors MUST NOT supply a separate display name in content.
- **FR-003**: Tags on one article MUST be unique; duplicates MUST fail publish/build.
- **FR-004**: The `tags` field MUST be optional. Omitting it or supplying an empty list MUST be valid and MUST render with no per-article tag chrome.
- **FR-005**: When tags are present, the article page MUST display them near the title, in the recorded order, as activatable labels distinct from the Draft status indicator. Activating one MUST open the home page filtered to that tag.
- **FR-006**: When tags are present, the home list MUST display them on each corresponding published article listing, in the recorded order. Activating one MUST follow the same select/deactivate rules as the all-tags list.
- **FR-007**: Tags MUST NOT change publish visibility: only `published: true` articles appear on the home list or in filtered results; drafts remain URL-reachable with Draft treatment and `noindex` as today.
- **FR-008**: Invalid tag values or an invalid `tags` shape (not a list of labels, undeclared nested fields) MUST fail publish/build with a clear validation message. Articles that omit `tags` MUST still validate.
- **FR-009**: This feature MUST NOT add a new body `componentType` for tags. Body composition stays an ordered list of existing blocks.
- **FR-010**: Whenever at least one published article has tags, the home page MUST show a list of all unique tags that appear on those published articles, plus a Show all control that is always visible with that list. Show all MUST be the selected/current control when no tag filter is active. The all-tags list MUST NOT include tags that exist only on drafts.
- **FR-013**: Activating an unselected tag on the home page MUST filter the article list to published articles that include that tag (single tag at a time). The selected tag MUST be indicated by more than color alone. Activating that already-selected tag MUST deactivate it and restore the unfiltered published list.
- **FR-014**: The filtered home view MUST have a distinct, reloadable, shareable address so a visitor who opens that address later sees the same tag selected and the same filtered list.
- **FR-015**: The Show all control MUST clear the filter and show every published article. Activating the already-selected tag MUST have the same clearing outcome. After either clear, Show all MUST be the selected/current control. Activating Show all when already unfiltered MUST keep the full published list (no change of filter). The unfiltered home address remains the site’s primary home.
- **FR-016**: This feature MUST NOT add separate tag-archive pages. Filtering happens on the home page.
- **FR-017**: When a filter matches no published articles, the home page MUST show an empty-list message and MUST remain usable (tag list and Show all still available).
- **FR-018**: When no published articles have tags, the home page MUST omit the all-tags list and filter chrome.
- **FR-011**: Search-engine article metadata MUST continue to include title, description, canonical URL, and Open Graph fields. When tags are present, those topic labels SHOULD also be exposed as article topic metadata so crawlers can associate the page with those subjects. The home page’s canonical URL MUST remain the unfiltered home; a filtered view is not a separate indexable document.
- **FR-012**: Every existing published article in the content tree MUST be updated with at least one appropriate tag so the shipped site demonstrates labels and filtering. Published fixtures MUST collectively use at least two distinct tags. The unpublished draft fixture MAY omit tags.

### Key Entities

- **Article**: Existing content record (slug from filename, title, description, publish state, blocks). Gains an optional list of tags.
- **Tag**: A short topic label attached to an article. Stored as a lowercase hyphenated identity; shown to visitors as a humanized display form. Many articles MAY share the same tag identity; uniqueness is required only within one article. Tags do not have their own archive page; they filter the home list.
- **Article listing**: Home-page summary of a published article (title, description, date, and tags when present).
- **Home tag list**: The unique set of tags from published articles, shown on the home page as filter controls, plus a Show all control that is always present with that list and is current when no tag is selected.
- **Active tag filter**: At most one selected topic tag on the home page; when set, the listing includes only published articles that contain that tag and Show all is not the current control. When unset, Show all is current and the listing includes every published article.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: Add optional top-level `tags` on the article document: a list of unique, non-empty lowercase hyphenated labels. Omit or `[]` is valid. No nested tag objects. Unknown keys on the article remain rejected. `blocks` catalog unchanged. No new content files for a tag vocabulary; the home tag list is derived from published articles.
- **componentType changes**: None. Tags are not a block.
- **Example fixture**: Amend existing published articles under `data/articles/` so each has at least one tag (including `welcome`, `getting-started`, `speckit`, `solid-principles`, `react-fundamentals`, `coding-standards-react`, `quiet-habits-that-sabotage-progress`). Use at least two distinct tags across those files so home filtering is visible. Keep `draft-example.json` valid with tags omitted or empty. Do **not** add a tags-only demo article.

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: Keep required title, description, canonical URL, and Open Graph on articles. When tags exist, include them as article topic metadata (keywords / article tags). Canonical URL and indexability rules for drafts are unchanged. Home canonical stays the unfiltered home address so filtered views do not compete as duplicate documents.
- **Accessibility**: The home all-tags list and per-article tags MUST be semantic groups of real controls (links or equivalent), with accessible names equal to the humanized display form and a selected/current state that is not color-only (including Show all as current when unfiltered). MUST remain readable against light and dark themes. MUST NOT be confused with the Draft status chip. Keyboard users MUST be able to reach, activate, and clear a filter. Empty filter results MUST be announced as text, not an empty silent page.
- **Performance notes**: Prefer a static, shareable filtered home view. MUST NOT add a heavy client-only filter layer solely for tags. Any interactivity MUST stay a small surface (constitution: server-first; client only if required).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a tagged article, a visitor can identify the article’s topics from the header in under 5 seconds without reading the body.
- **SC-002**: On the unfiltered home list, a visitor can compare topics across published articles in a single scan; 100% of tagged published articles show their tags on the list.
- **SC-003**: Articles with no tags show zero per-article tag chrome (no empty lists or “Tags:” placeholders) on both the article page and the home list. Home omits the all-tags list entirely when no published article has tags.
- **SC-004**: 100% of published articles already in the content tree show at least one tag after this feature ships, and the home all-tags list shows at least two distinct tags.
- **SC-005**: Keyboard-only and screen-reader visitors can perceive and activate topic labels in the article header and on the home page without unlabeled graphics or focus traps.
- **SC-006**: Schema-invalid tags fail publish/build; valid articles with omitted tags still build; drafts with or without tags stay off the home list, off the all-tags list, and out of filtered results.
- **SC-007**: Activating a tag on the home page filters the article list so that 100% of remaining items include that tag, and 0% of published articles that lack that tag remain visible.
- **SC-008**: A visitor can apply a tag filter and return to the full published list in two activations or fewer (select a tag, then either Show all or activate the selected tag again). On the unfiltered home page, Show all is visibly the current control.
- **SC-009**: Opening a shared filtered home address reproduces the same tag selection and article subset without extra steps.

## Assumptions

- Tags belong on the **article record**, next to title and description, because they classify the whole piece rather than a body section.
- Home filtering stays **on the home page**. Dedicated `/tags/...` archive pages are out of scope for this feature.
- Filter is **one tag at a time**. Combining tags (AND/OR multi-select) is out of scope.
- The all-tags list is the unique set of tags from **published** articles, ordered in a stable, predictable way (alphabetical by label).
- A separate controlled vocabulary file or tag registry is out of scope; authors type hyphenated identities directly. Visitors never see a second author-supplied name—display is derived (`coding-standards` → `Coding Standards`). Shared spelling is a convention (`react` vs `React` is prevented by the lowercase hyphenated format).
- Categories (a single primary bucket per article) are out of scope; tags are the only taxonomy in this feature.
- A small number of tags per article is expected; no numeric maximum is required beyond uniqueness and the hyphenated format.
- Existing unpublished draft fixtures may omit tags; published fixtures must be tagged, with at least two distinct tags across the set, so the filter is visible.
- Visual treatment should match existing compact status labels on the article header (readable chips/labels), without introducing a new brand system. Selected filter state must remain obvious in light and dark themes.
- Article-page tags navigate to the **home** filtered view rather than scrolling or filtering within the article.
- No CMS, auth, analytics, or automated test suite is required (constitution v1 defaults).
- Authoring documentation (README / schema contract) should mention `tags` so future articles can include them.
