# Implementation Plan: Blog Block Catalog

**Branch**: `002-blog-block-catalog` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-blog-block-catalog/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Extend the Randomism block catalog with CodeBlock, Accordion, Blockquote, List, Callout, and Divider—each schema-validated, registry-mapped, and demonstrated in fixtures—and render Markdown in documented prose fields via a shared Markdown helper (CommonMark; raw HTML not rendered as DOM elements). Accordion uses native `<details>`/`<summary>` so multiple sections can stay open without a Client Component. Builds on `001-content-page-foundation` without CMS, backend, auth, or automated tests.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router 15.x (existing)

**Primary Dependencies**: Existing Next.js, React 19, Zod. **New**: `react-markdown` for CommonMark → React (no `rehype-raw`; raw HTML not rendered). No syntax highlighter in this feature.

**Storage**: In-repo JSON at `data/articles/*.json` (unchanged discovery/validation pipeline)

**Testing**: Not required (manual verification via quickstart / acceptance scenarios)

**Target Platform**: Web (static/blog hosting; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: Static pages by default; Server Components for all new blocks; Accordion via native disclosure (no JS bundle for expand/collapse); Markdown parsed on server

**Constraints**: Content–code separation; single component registry; schema before UI; YAGNI; static-first; a11y/SEO/perf/code-quality gates; AI must not drive-by edit; Markdown rules from clarifications (strip HTML; full CommonMark in Paragraph / accordion titles+bodies / callout / blockquote; Heading + CodeBlock + metadata plain/literal; list items inline-only)

**Scale/Scope**: +6 `componentType`s (total 9 with Heading/Paragraph/Image); shared Markdown renderer; ≥1 showcase article exercising all new types + Markdown samples; callout variants fixed enum `info` | `tip` | `warning`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Clarified spec with scenarios, FRs, SC; plan + research + contracts + quickstart produced here; README touch only if setup/deps change at implement
- **Content–Code Separation**: ✅ New blocks authored only in article JSON; app extends schema + registry + renderers
- **Registry Discipline**: ✅ Each of six types gets Zod variant, one registry entry, fixture usage; shared Markdown helper is not a `componentType`
- **Schema Before UI**: ✅ Discriminated union extended; strict objects; empty code / empty accordion sections rejected
- **Simplicity**: ✅ Flat registry; one Markdown dep (`react-markdown`); no GFM/tables/highlighter; native accordion; Complexity Tracking records the justified new dep
- **Static First**: ✅ No backend/CMS; SSG path unchanged
- **Accessibility**: ✅ Semantic lists/quotes/hr/pre; accordion keyboard via `<details>`/`<summary>`; callouts not color-only; Markdown → semantic elements; usable accessible name from title content
- **Performance**: ✅ No Client Components required for accordion; RSC + server Markdown; code region internal scroll
- **SEO**: ✅ Article metadata unchanged (plain text); drafts still `noindex` as in foundation
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build gates unchanged
- **AI Collaboration**: ✅ Scope limited to schema, blocks, Markdown helper, fixtures, contracts/docs for this feature

**Post-design re-check**: ✅ Design artifacts aligned; `react-markdown` justified in Complexity Tracking; Accordion stays Server Component via native disclosures; no new constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-blog-block-catalog/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── article-schema.md      # Extended block catalog + Markdown field rules
│   └── markdown.md            # Dialect, strip-HTML, field modes (full vs inline)
└── tasks.md                   # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/                           # Unchanged routes; article page picks up new blocks via registry
components/
├── BlockRenderer.tsx
├── registry.ts                # + CodeBlock, Accordion, Blockquote, List, Callout, Divider
├── markdown/
│   └── Markdown.tsx           # Shared full / inline Markdown render helpers
└── blocks/
    ├── Heading.tsx            # Plain text (unchanged behavior)
    ├── Paragraph.tsx          # content → full Markdown
    ├── ImageBlock.tsx
    ├── CodeBlock.tsx          # Literal <pre><code>; optional language label
    ├── Accordion.tsx          # <details>/<summary>; Markdown title + body
    ├── Blockquote.tsx
    ├── List.tsx               # ol/ul; item text → inline Markdown
    ├── Callout.tsx            # variant: info | tip | warning
    └── Divider.tsx            # <hr>
data/
└── articles/
    └── getting-started.json   # Showcase: all componentTypes + Markdown samples
lib/
├── articles/                  # Unchanged load/discover/list
└── schema/
    └── article.ts             # Extend block discriminated union
```

**Structure Decision**: Extend the foundation layout in place. Shared Markdown lives under `components/markdown/` (presentation helper, not a registry type). Routes and article loading stay as in `001`. Contracts document schema + Markdown rules; routes contract from `001` remains authoritative for URLs/SEO.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency: `react-markdown` | Spec requires CommonMark prose with semantic HTML and no raw HTML execution | Hand-rolled Markdown parser is larger/riskier; MDX conflicts with JSON block model; shipping HTML in JSON reintroduces XSS surface |
| Accordion interactivity | Spec requires expand/collapse | Controlled Client Component unnecessary when native `<details>`/`<summary>` meets multi-open + keyboard + SSR |
