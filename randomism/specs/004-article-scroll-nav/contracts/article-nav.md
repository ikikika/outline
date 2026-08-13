# Contract: Article page navigation chrome

UI / behavior contract for article routes (`/articles/{slug}`). Not stored in article JSON.

## Back to top

| Rule | Requirement |
|------|-------------|
| Scope | Article pages only; home list MUST NOT mount this control |
| Visibility | Hidden/dormant until scroll past ~1 viewport height (min ~320px); hidden when page is not meaningfully scrollable |
| Activation | Scrolls viewport to top of document |
| URL | Clears hash (`pathname` + `search` preserved; no `#fragment`) |
| Motion | `smooth` unless `prefers-reduced-motion: reduce` → instant |
| A11y | Focusable control; accessible name e.g. “Back to top”; visible focus |
| Implementation | Client Component island; MUI control OK |

## Table of contents (content-rendered)

| Rule | Requirement |
|------|-------------|
| Markup | `<nav>` with accessible name + list of in-page links |
| Link `href` | `#` + bare id from JSON `href` |
| Scroll-spy | **Forbidden** — no “current section” tracking on scroll |
| Missing target | Link may be present; MUST NOT crash the page |
| Motion | Inherits document `scroll-behavior` / reduced-motion CSS |

## Heading anchors

| Rule | Requirement |
|------|-------------|
| DOM | Heading element exposes `id` matching resolved fragment |
| Uniqueness | Ids unique within the article after assignment pass |
| Deep link | Loading `/articles/{slug}#{id}` lands on that heading (browser default + smooth CSS when allowed) |

## Out of scope

- Back-to-top on home or non-article routes
- Scroll-spy / active TOC item styling driven by scroll position
- Build failure when TOC `href` does not match a Heading id
