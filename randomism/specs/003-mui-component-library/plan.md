# Implementation Plan: MUI Component Library

**Branch**: `003-mui-component-library` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-mui-component-library/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Adopt Material UI (`@mui/material`) as the shared public UI library: brand-tuned light/dark themes, system preference until the visitor toggles (then persist in `localStorage`), retire presentation rules from `app/globals.css`, restyle site chrome and all registry block/page surfaces with MUI, and replace Accordion with MUI Accordion (multi-expand, Client Component). Article JSON schemas and `componentType`s stay unchanged; registry pattern preserved.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Next.js App Router 15.x (existing)

**Primary Dependencies**: Existing Next.js, React 19, Zod, `react-markdown`. **New**: `@mui/material`, `@mui/icons-material` (toggle icons only), `@emotion/react`, `@emotion/styled`, `@emotion/cache` + Next.js App Router Emotion cache integration as required by MUI docs.

**Storage**: Article JSON unchanged (`data/articles/`). Color-mode preference: `localStorage` key after explicit toggle; until then use `prefers-color-scheme`.

**Testing**: Not required (manual verification via quickstart)

**Target Platform**: Web (blog; mobile-responsive)

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: Keep article content statically generated; confine Client Components to theme/color-mode provider, mode toggle, and Accordion; accept larger client JS vs pre-MUI baseline (documented in Complexity Tracking)

**Constraints**: Content–code separation; single registry; no new `componentType`s; no CMS/backend/auth/tests; brand-tuned themes; retire custom presentation CSS; constitution gates with Complexity Tracking for MUI + Client Components

**Scale/Scope**: Presentation migration of layout, `SiteHeader`, `ArticleList`, article page chrome, all nine block renderers; theme module; color-mode provider; README; slim `globals.css`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: ✅ Clarified spec; plan + research + contracts + quickstart; README update required at implement
- **Content–Code Separation**: ✅ No article schema/`componentType` changes; MUI only in presentational components
- **Registry Discipline**: ✅ No new types; existing registry mappings retained; Accordion renderer swapped in place
- **Schema Before UI**: ✅ Schema impact = None (explicit in spec)
- **Simplicity**: ⚠ Extra deps (MUI/Emotion) — **justified** by approved feature request + Complexity Tracking (not opportunistic)
- **Static First**: ✅ No backend/CMS; SSG routes unchanged; client islands for theme/accordion only
- **Accessibility**: ✅ Keyboard toggle + Accordion; contrast for light/dark; callout labels; focus visibility via theme
- **Performance**: ⚠ More Client Components + larger bundle — **justified** for ThemeProvider, color mode, MUI Accordion per clarify; minimize other `'use client'`
- **SEO**: ✅ Metadata generation untouched
- **Code Quality**: ✅ Strict TS, ESLint, zero-warning build gates unchanged
- **AI Collaboration**: ✅ Scope limited to theme/chrome/blocks/docs for this feature

**Post-design re-check**: ✅ Design artifacts align; Complexity Tracking records MUI/Emotion and Client Component islands; registry and content model unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/003-mui-component-library/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── theme.md           # Light/dark tokens, mode preference rules
│   └── ui-surfaces.md     # Which UI pieces use which MUI primitives
└── tasks.md               # /speckit-tasks (not created by plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                 # Wrap with AppThemeProvider; CssBaseline
├── globals.css                # Minimal resets only (retire block presentation rules)
├── page.tsx                   # Home list (MUI layout)
└── articles/[slug]/page.tsx   # Article chrome via MUI; BlockRenderer unchanged wiring
components/
├── theme/
│   ├── theme.ts               # createTheme light + dark (brand tokens)
│   ├── AppThemeProvider.tsx   # Client: Emotion cache + MUI ThemeProvider + mode
│   ├── ColorModeToggle.tsx    # Client: accessible light/dark control
│   └── colorModeStorage.ts    # localStorage + system preference helpers
├── SiteHeader.tsx             # MUI AppBar/Toolbar + ColorModeToggle
├── ArticleList.tsx            # MUI List / Typography / Link
├── BlockRenderer.tsx          # Unchanged registry dispatch
├── registry.ts                # Unchanged type map
├── markdown/Markdown.tsx      # Keep; theme-aware link colors via MUI theme / sx
└── blocks/*.tsx               # Restyle with MUI; Accordion → MUI Accordion (client)
```

**Structure Decision**: Keep App Router + `components/` layout from foundation. Add `components/theme/` for theme/provider/toggle. Do not introduce a second component registry or `content/` tree.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New deps: `@mui/material`, Emotion packages, optional `@mui/icons-material` | Approved feature: implement MUI as shared UI library | Hand-rolled design system duplicates MUI; user explicitly requested MUI |
| Client Components: `AppThemeProvider`, `ColorModeToggle`, `Accordion` | MUI theme + mode toggle + MUI Accordion require client runtime | Native details rejected by clarify (Option B); CSS-only theming cannot meet MUI Accordion + persisted mode |
| Larger client JS bundle | Inherent to MUI Accordion + Emotion + theme provider | Acceptable cost of approved library adoption; mitigate by not Client-ifying static Markdown/list/heading by default |
