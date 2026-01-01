# Implementation Plan: Content Page Foundation

**Branch**: `001-content-page-foundation` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-content-page-foundation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Stand up Randomism as a static Next.js App Router blog: article JSON under `data/articles/` is schema-validated at build, published articles power a generated home list (newest publish date first) and `/articles/{slug}` pages, and article bodies render Heading / Paragraph / Image blocks through a single component registry. No CMS, backend, auth, or automated tests.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router (latest stable 15.x)

**Primary Dependencies**: Next.js, React 19, Zod (schema validation + inferred types). Optional: ESLint flat config via `eslint-config-next`.

**Storage**: In-repo JSON at `data/articles/*.json`; static assets under `public/`

**Testing**: Not required (manual verification via quickstart / acceptance scenarios)

**Target Platform**: Web (static/blog hosting; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: Static pages by default; Server Components only for foundation UI; optimized local images via `next/image`

**Constraints**: Content–code separation; single component registry; schema before UI; YAGNI; static-first; a11y/SEO/perf/code-quality gates; AI must not drive-by edit; path is `data/articles/` (not a separate homepage JSON)

**Scale/Scope**: Foundation with 3 `componentType`s (Heading, Paragraph, Image); ≥2 published sample articles + optional draft; home = generated list only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Spec with scenarios, FRs, clarifications present; plan + quickstart document setup; README to be added at implement
- **Content–Code Separation**: ✅ Article copy/blocks in `data/articles/*.json`; app loads + validates + registry-renders only
- **Registry Discipline**: ✅ Heading, Paragraph, Image each get schema + registry entry + fixture usage in sample articles
- **Schema Before UI**: ✅ Zod article/block schemas; unknown keys rejected; build fails on invalid JSON
- **Simplicity**: ✅ Flat registry, three blocks, Zod only extra dep (justified for strict schema); no CMS
- **Static First**: ✅ SSG via App Router static generation; no backend/CMS
- **Accessibility**: ✅ Semantic list/article layout, keyboard links, contrast defaults, required image alt, heading levels
- **Performance**: ✅ `next/image`, RSC default, no Client Components planned for foundation
- **SEO**: ✅ Article metadata + OG; home title/description from site config defaults
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build as gates
- **AI Collaboration**: ✅ Scope limited to this feature’s files/fixtures

**Post-design re-check**: ✅ Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) remain aligned; no new violations. Zod dependency recorded in research with YAGNI justification (Complexity Tracking N/A — not a principle violation).

## Project Structure

### Documentation (this feature)

```text
specs/001-content-page-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── article-schema.md
│   └── routes.md
└── tasks.md             # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                 # Site chrome (brand, home link), metadata defaults
├── page.tsx                   # Home: published article list
├── articles/
│   └── [slug]/
│       └── page.tsx           # Article body via registry
components/
├── SiteHeader.tsx             # Brand / home chrome
├── ArticleList.tsx            # Home list UI
├── BlockRenderer.tsx          # Maps blocks through registry
├── blocks/
│   ├── Heading.tsx
│   ├── Paragraph.tsx
│   └── ImageBlock.tsx
└── registry.ts                # componentType → renderer
data/
└── articles/                  # Only *.json are articles
    ├── welcome.json
    ├── getting-started.json   # second published sample (different date)
    └── draft-example.json     # optional unpublished valid draft
lib/
├── site.ts                    # Site name, default title/description, base URL
├── articles/
│   ├── discover.ts            # Read data/articles/*.json only
│   ├── load.ts                # Parse + validate + slug from filename
│   └── list.ts                # Published filter + sort by publishDate desc
└── schema/
    └── article.ts             # Zod schemas (article + blocks)
public/
└── images/                    # Local sample images for Image blocks
```

**Structure Decision**: Use App Router with `data/articles/` as the sole article source (per spec clarifications). Prefer `components/registry.ts` + `components/blocks/*` and `lib/articles/*` for discovery/validation. Site chrome lives in layout/header components, not in article JSON. No `content/` tree — superseded by `data/articles/`.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
