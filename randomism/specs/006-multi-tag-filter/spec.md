# Feature Specification: Multi-Tag Filter

**Feature Branch**: `006-multi-tag-filter`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "allow users to select multiple tags when filtering"

## Clarifications

### Session 2026-08-14

- Q: Multi-tag match rule? → A: Visitor can switch between OR (match any selected tag) and AND (match every selected tag) on the home page.
- Q: Default match mode? → A: Default **AND**; the shareable address may omit mode when AND is active.
- Q: Match mode after clearing tags? → A: Reset to **AND** whenever the selection becomes empty (Show all or removing the last selected tag).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter the home list with several topics (Priority: P1)

A visitor on the home page wants articles about more than one topic at once. They activate a second (or further) tag without losing the first. They can choose whether the list should match **any** selected tag (OR) or **every** selected tag (AND). Each selected tag stays visibly and accessibly marked. They can still clear everything with **Show all**, or remove one topic by activating that selected tag again.

**Why this priority**: This is the requested change from single-tag filtering. Without additive selection and an explicit match mode, multi-topic browsing is incomplete.

**Independent Test**: On `/`, select tag A, then tag B under default AND — confirm only articles that include both remain (or empty). Switch to OR — confirm articles that include either appear. Deselect A; only B remains. Show all restores the full published list. Reload a multi-tag address (including OR when used) and see the same selection, mode, and list.

**Acceptance Scenarios**:

1. **Given** the home page with no tags selected (Show all current), **When** a visitor activates tag A, **Then** only published articles matching A appear and A is selected (same as today’s single-tag start), regardless of match mode.
2. **Given** tag A is already selected, **When** the visitor activates a different tag B, **Then** both A and B are selected (B is added, not a replacement), and the article list shows published articles that match the **current** match mode for {A, B}.
3. **Given** two or more tags are selected under OR mode, **When** the list is shown, **Then** every visible article includes at least one of the selected tags.
4. **Given** two or more tags are selected under AND mode, **When** the list is shown, **Then** every visible article includes every selected tag (or the empty-list message if none do).
5. **Given** two or more tags are selected, **When** the visitor switches match mode between OR and AND, **Then** the selection of tags is unchanged and the article list updates immediately to the new rule.
6. **Given** two or more tags are selected, **When** the visitor activates one of those selected tags, **Then** only that tag is removed from the selection; other selected tags remain; the list updates under the current match mode (or Show all if none remain).
7. **Given** one or more tags are selected, **When** the visitor activates Show all, **Then** every topic tag is cleared, Show all is current, every published article is listed, and match mode is **AND**.
8. **Given** exactly one tag is selected (after multi-select or alone), **When** the visitor deactivates that last selected tag, **Then** the selection is empty, Show all is current, the full published list returns, and match mode is **AND**.
9. **Given** a multi-tag filtered view, **When** the visitor reloads or opens the same address elsewhere, **Then** the same tags, the same match mode, and the same filtered list appear.
10. **Given** a keyboard-only visitor, **When** they add and remove tags and switch match mode via the home controls, **Then** selection and list updates work without a pointer; selected state and mode are not color-only.

---

### User Story 2 - Listing chips respect multi-select (Priority: P2)

On the home list, activating a tag on an article listing uses the same add/remove rules as the all-tags list: an unselected tag is added to the current selection; a selected tag is removed from it.

**Why this priority**: Listings already expose tags as filter controls; they must stay consistent with multi-select or visitors get conflicting behavior.

**Independent Test**: With no filter, activate a listing chip → that tag alone is selected. With A selected, activate listing chip B → A and B selected. With A and B selected, activate listing chip A → only B remains.

**Acceptance Scenarios**:

1. **Given** the unfiltered home list, **When** a visitor activates a tag on a listing, **Then** the home filter becomes that single tag (same as activating it in the all-tags list).
2. **Given** one or more tags already selected, **When** the visitor activates an unselected tag on a listing, **Then** that tag is added to the selection and the list updates.
3. **Given** a tag already in the selection, **When** the visitor activates that same tag on a listing, **Then** it is removed from the selection (not a full clear unless it was the only selected tag).

---

### User Story 3 - Article-page tags start a focused filter (Priority: P3)

From an article page, activating a topic chip still takes the visitor to the home page filtered to that topic. That action sets the home selection to **that tag alone** (it does not try to merge with a previous multi-tag selection the visitor may have had in another tab).

**Why this priority**: Preserves a clear “show me more like this topic” jump from reading; avoids surprising merge with an unrelated prior multi-filter.

**Independent Test**: Open a tagged article; activate a topic chip; land on home with only that tag selected. Confirm a second chip on the article would open home with only that second tag if activated instead.

**Acceptance Scenarios**:

1. **Given** a tagged article, **When** a visitor activates one topic chip, **Then** they arrive at the home page with exactly that tag selected and the list filtered accordingly.
2. **Given** that arrival, **When** they then add another tag on the home page, **Then** multi-select and the current match mode behave as in User Story 1.

---

### Edge Cases

- Selecting every published tag under OR: list shows every published article that has at least one tag (untagged published articles still hidden while any tag is selected).
- Selecting every published tag under AND: list shows only published articles that include every tag in the catalog (often empty on a real site).
- Selecting tags that together match no published article under the current mode: empty-list message; tag list, match-mode control, and Show all remain usable; selected tags remain indicated.
- Stale / unknown identities in the shareable address: ignore unknowns for matching; do not crash; still show empty or partial results for the valid selected tags; do not invent tag chips for identities that no published article uses.
- Duplicate identity in the address: treat as a single selection.
- Show all while already unfiltered: no change; Show all stays current; match mode remains **AND**.
- Drafts: never appear in the tag list or in filtered results.
- Narrow viewports: multiple selected chips and the match-mode control remain usable (wrap); do not hide Show all.
- Untagged published articles: appear only on the unfiltered (Show all) list; they never match a non-empty tag selection.
- Single tag selected: OR and AND produce the same article list; switching mode MUST NOT change the list until a second tag is added.
- Match mode with empty selection (Show all): mode control MAY still be visible for the next filter; the full published list is shown either way. Match mode MUST be **AND**.
- Address omits mode: treat match mode as **AND**.
- Address encodes an unknown mode value: treat as **AND** (default); do not crash.
- Visitor was in OR, then clears selection: mode returns to **AND**; a new tag selection starts in AND unless they switch to OR again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the home page, visitors MUST be able to have zero or more topic tags selected at once for filtering (multi-select). Selecting an additional unselected tag MUST add it to the selection rather than replace the previous selection.
- **FR-002**: The home page MUST offer a visitor-controlled match mode with exactly two options: **OR** (article matches if it includes at least one selected tag) and **AND** (article matches only if it includes every selected tag). The filtered article list MUST apply the **current** match mode to the current selection. When the selection is empty, the list MUST include every published article. The **default** match mode MUST be **AND** whenever the visitor has not chosen otherwise and whenever the shareable address omits mode.
- **FR-013**: Switching match mode MUST keep the current tag selection and MUST update the article list to the new rule without requiring the visitor to re-select tags.
- **FR-003**: Activating an already-selected tag on the home all-tags list or on a listing MUST remove only that tag from the selection. If none remain, Show all MUST become current and the full published list MUST return.
- **FR-004**: Show all MUST clear the entire selection and list every published article. Show all MUST be the current control only when the selection is empty. Show all MUST remain visible whenever the home tag list is shown. Clearing the selection via Show all or by removing the last selected tag MUST reset match mode to **AND**.
- **FR-014**: Whenever the tag selection becomes empty, match mode MUST be **AND** (the default), even if the visitor had previously chosen OR.
- **FR-005**: The multi-tag filtered view MUST have a distinct, reloadable, shareable address that encodes the full set of selected tag identities and the current match mode so the same selection, mode, and list can be restored later. When match mode is **AND** (the default), the address MAY omit an explicit mode value and still mean AND. When match mode is **OR**, the address MUST encode OR explicitly.
- **FR-006**: Home listing tag chips MUST use the same add/remove selection rules as the all-tags list.
- **FR-007**: Activating a topic chip on an article page MUST open the home page with a selection of exactly that one tag (replace any notion of prior multi-selection for that navigation). Match mode on that arrival MUST be **AND** unless the address explicitly encodes OR.
- **FR-008**: Selected tags (zero, one, or many) and the active match mode MUST be indicated by more than color alone. Keyboard operation MUST remain possible for add, remove, Show all, and match-mode switching.
- **FR-009**: This feature MUST NOT add tag-archive pages, a new body `componentType`, or change how authors store tags on articles. Article JSON `tags` authoring from the existing tags feature remains unchanged.
- **FR-010**: Invalid or empty multi-filter outcomes MUST NOT crash the home page; empty matching results MUST show a clear empty-list message while keeping the tag list, match-mode control, and Show all available.
- **FR-011**: The home page’s canonical URL MUST remain the unfiltered home; a multi-tag filtered view is not a separate indexable document.
- **FR-012**: Behavior that already works for a single selected tag (humanized labels, published-only tag list, draft exclusion, omit empty tag chrome) MUST continue to work under multi-select.

### Key Entities

- **Tag selection**: The set of currently selected tag identities on the home page (empty = Show all / unfiltered).
- **Match mode**: Visitor-chosen rule applied to a non-empty selection — **OR** (any selected tag) or **AND** (every selected tag). Default when unspecified: **AND**.
- **Shareable filter address**: Home URL that encodes the full selection and match mode for reload and sharing. Omitting mode means AND; OR must be explicit.

### Content Model Impact *(mandatory when pages, posts, or blocks change)*

- **Schema changes**: None. Article `tags` field and validation stay as in the article-tags feature.
- **componentType changes**: None.
- **Example fixture**: None required for content JSON. Existing multi-tagged published articles are enough to demonstrate selecting two tags. Do not add a tags-only demo article.

### Article / Page Quality *(mandatory when articles or public pages change)*

- **SEO**: Home canonical remains the unfiltered home. Article metadata unchanged by this feature.
- **Accessibility**: Multiple selected tags each expose a non-color-only selected/current state. The match-mode control MUST have a clear accessible name and indicate which mode is active without relying on color alone. Add/remove, Show all, and mode switching remain keyboard operable. Empty multi-filter results remain announced as text.
- **Performance notes**: Keep filtering on the home page without a heavy client-only filter layer; prefer the same server-first, shareable-address approach as the existing single-tag filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can select two distinct tags in two activations and see a list where 100% of visible articles match the **current** match mode for that pair.
- **SC-002**: After selecting two tags, switching from OR to AND (or AND to OR) in one activation updates the list so 100% of remaining items satisfy the new mode, without changing which tags are selected.
- **SC-003**: After selecting two tags, removing one tag in a single activation updates the list to match the remaining single-tag filter (or Show all if none remain).
- **SC-004**: Show all clears a multi-tag selection in one activation, restores the full published list, and leaves match mode as **AND**.
- **SC-009**: Removing the last selected tag leaves match mode as **AND** for the next selection.
- **SC-005**: Opening a shared multi-tag home address reproduces the same selected set, the same match mode, and the same article subset without extra steps.
- **SC-006**: Keyboard-only visitors can add and remove tags, switch match mode, and use Show all without a pointer.
- **SC-008**: With no mode in the address, a multi-tag filter behaves as **AND** (default) without requiring an extra step.

## Assumptions

- This feature **extends** the existing home tag filter (article-tags). Authoring, humanized display labels, Show all always visible with the tag list, and no `/tags/...` archive pages stay as already specified.
- Visitors can switch match mode between **OR** (any) and **AND** (every) on the home page. Fixed single-rule filtering is out of scope.
- **Default match mode is AND.** Opening `/`, following an article topic chip, or opening a filtered address that omits mode uses AND until the visitor switches to OR. OR must appear explicitly in the shareable address.
- Whenever the tag selection becomes empty (Show all or last tag removed), match mode resets to **AND**.
- Selecting a second tag **adds** to the selection; it does not replace the first.
- Article-page topic chips **set** the home selection to that single tag (focused jump), rather than merging into a prior multi-selection.
- Untagged published articles appear only when the selection is empty.
- Unknown identities in a shared address are ignored for matching and do not create chips; valid selected identities still apply.
- No change to content JSON schema or fixtures is required solely for this feature.
- No CMS, auth, analytics, or automated test suite is required (constitution v1 defaults).
- Exact control labeling (e.g. “Match any” / “Match all”) is a plan/UI detail as long as OR vs AND is clear and accessible.
- The match-mode control is available whenever the home tag list is shown (same visibility window as Show all), including when zero or one tag is selected.
