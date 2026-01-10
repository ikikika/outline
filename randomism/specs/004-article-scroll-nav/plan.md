# Implementation Plan: Article Scroll Navigation

**Branch**: `004-article-scroll-nav` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-article-scroll-nav/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add article-page chrome for a threshold-gated **Back to top** control (clears URL hash; respects reduced motion), and an opt-in **`TableOfContents`** content block with bare fragment ids linking to Heading anchors. Extend Heading with optional explicit `id` and derive unique ids when omitted. No scroll-spy. No new npm dependencies—MUI + a small Client Component island on article routes only.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router 15.x (existing)

**Primary Dependencies**: Existing Next.js, React 19, Zod, MUI. **No new packages.** Client island: `BackToTop` only.

**Storage**: In-repo JSON at `data/articles/*.json` (unchanged discovery; schema extended)

**Testing**: Not required (manual verification via quickstart / acceptance scenarios)

**Target Platform**: Web (static/blog hosting; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: Static pages by default; TOC as Server Component (`<a href="#…">`); single Client Component for back-to-top scroll threshold + hash clear; no scroll-spy listeners; home list unchanged (no extra client JS)

**Constraints**: Content–code separation; single registry; schema before UI; YAGNI; static-first; a11y/SEO/perf/code-quality; clarifications—unresolved TOC targets do not fail build; bare ids only; back-to-top clears hash; no scroll-spy

**Scale/Scope**: +1 `componentType` (`TableOfContents`); Heading optional `id`; article-page `BackToTop`; amend `data/articles/speckit.json` with TOC + Heading ids; catalog total 10 block types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Clarified spec with scenarios, FRs, SC; plan + research + data-model + contracts + quickstart produced here
- **Content–Code Separation**: ✅ TOC authored only in article JSON; back-to-top is page chrome (not content), matching FR-012
- **Registry Discipline**: ✅ `TableOfContents` gets Zod variant, one registry entry, fixture usage; Heading schema extended; `BackToTop` lives under `components/` (not a `componentType`)
- **Schema Before UI**: ✅ Discriminated union + Heading `id` + TOC item shape documented; `#`/URL in TOC `href` rejected; unresolved targets not cross-validated at build (clarify)
- **Simplicity**: ✅ No new deps; native hash links for TOC; no scroll-spy; Complexity Tracking justifies one Client Component
- **Static First**: ✅ No backend/CMS; SSG path unchanged
- **Accessibility**: ✅ Semantic TOC list + real heading targets with ids; back-to-top accessible name + keyboard; reduced-motion honored
- **Performance**: ✅ Client JS only for back-to-top on article pages; TOC is RSC; home unaffected
- **SEO**: ✅ Article metadata unchanged; fragments are same-document hashes
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build gates unchanged
- **AI Collaboration**: ✅ Scope limited to schema, Heading/TOC renderers, BackToTop, article page mount, fixtures, contracts/docs

**Post-design re-check**: ✅ Design artifacts aligned; Client Component justified; no unresolved Technical Context unknowns; no new constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-article-scroll-nav/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── article-schema.md   # Heading id + TableOfContents
│   └── article-nav.md      # Back-to-top + fragment / scroll behavior
└── tasks.md                # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/
└── articles/[slug]/page.tsx   # Mount BackToTop; keep BlockRenderer
components/
├── BackToTop.tsx              # Client: threshold visibility, scroll top, clear hash
├── BlockRenderer.tsx          # + TableOfContents case; resolve heading ids before render
├── registry.ts                # + TableOfContents
└── blocks/
    ├── Heading.tsx            # Render id attribute (explicit or pre-resolved)
    └── TableOfContents.tsx    # Semantic nav list of #fragment links
lib/
├── schema/
│   └── article.ts             # Heading.id?; TableOfContents items
└── articles/
    └── headingIds.ts          # slugify + uniqueness pass over blocks (pure)
data/
└── articles/
    └── speckit.json           # Amend: TOC near top + Heading ids on section targets
```

**Structure Decision**: Extend the existing App Router + registry layout in place. Pure helper `lib/articles/headingIds.ts` assigns stable unique ids so Heading and author-written TOC targets stay consistent when ids are omitted. `BackToTop` is article chrome only (mounted from `app/articles/[slug]/page.tsx`), not registered as a block. Demonstration content amends the existing Spec Kit article—no separate TOC demo file.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Client Component: `BackToTop` | Spec requires scroll-threshold visibility, programmatic scroll-to-top, and clearing the URL hash | Pure CSS/`<a href="#">` cannot clear hash reliably or gate visibility on scroll without JS; putting logic on the home layout would violate article-only scope and add JS to the list page |
| CSS `scroll-behavior: smooth` on `html` (with reduced-motion media query) and/or `scrollTo`/`scrollIntoView` with motion check | Spec wants smooth scroll when allowed and instant when `prefers-reduced-motion` | Always-smooth ignores a11y preference; always-instant is worse UX when motion is allowed |
