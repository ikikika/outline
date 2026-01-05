# Research: MUI Component Library

## Material UI version & packages

- **Decision**: Use Material UI v6 (`@mui/material` ^6) with Emotion (`@emotion/react`, `@emotion/styled`, `@emotion/cache`) per official Next.js App Router integration. Add `@mui/icons-material` only for the color-mode control icons (e.g. LightMode / DarkMode). Do not add Joy UI or MUI X.
- **Rationale**: Spec requires Material UI; v6 is current stable for React 19 / Next 15; Emotion is MUI’s default styling engine. Icons package is small and clearer than inline SVGs for a11y-labeled toggle.
- **Alternatives considered**: MUI v5 (older); Pigment CSS / zero-runtime (less mature for this migration); CSS Modules-only “Material look” (not actually MUI).

## App Router + Emotion cache

- **Decision**: Follow MUI Next.js App Router guide: client `AppThemeProvider` that installs Emotion cache for SSR/hydration and wraps children with `ThemeProvider` + `CssBaseline`. Root `app/layout.tsx` remains a Server Component that nests the client provider.
- **Rationale**: Prevents style flicker/mismatch; keeps layout metadata on the server.
- **Alternatives considered**: Theme only on client without SSR cache (FOUC risk); making entire layout a Client Component (worse for SEO/metadata).

## Color mode (system → toggle → persist)

- **Decision**: Mode state machine:
  1. If `localStorage['randomism-color-mode']` is `'light'` or `'dark'`, use it.
  2. Else use `window.matchMedia('(prefers-color-scheme: dark)')` (system).
  3. On toggle, write `'light'` | `'dark'` to that key and apply immediately.
  - Implement with a small custom hook inside `AppThemeProvider` (prefer custom over adding `next-themes` unless implement hits hydration bugs).
- **Rationale**: Matches FR-002 / clarify (system until toggle; persist across visits). Explicit key keeps behavior auditable.
- **Alternatives considered**: Session-only (rejected by clarify); always light default (rejected); MUI CssVarsProvider-only without persistence (incomplete).

## Brand theme tokens

- **Decision**: `createTheme` for light and dark:
  - Light: background ≈ `#f7f4ef` / paper warm; text `#1c1917`; primary/accent `#0f766e`; muted `#57534e`.
  - Dark: dark paper surfaces, light text, teal primary adjusted for contrast; exact hex documented in `contracts/theme.md` at implement.
  - Typography: readable serif/sans pair close to current site fonts via theme `typography.fontFamily`.
- **Rationale**: Clarify brand-tuned, not stock Material purple.
- **Alternatives considered**: Unmodified MUI default palette (rejected).

## Accordion

- **Decision**: Client Component `components/blocks/Accordion.tsx` using MUI `Accordion` / `AccordionSummary` / `AccordionDetails`. Control expansion with local React state allowing **multiple** expanded panels. Seed initial expanded from `defaultOpen`. Render Markdown titles/bodies via existing `MarkdownFull` inside summaries/details.
- **Rationale**: Clarify Option B; preserves multi-open from feature 002 behavioral baseline.
- **Alternatives considered**: Native `<details>` (rejected); single-expand Accordion (rejected).

## Migrating blocks & chrome

- **Decision**: Replace presentational markup with MUI primitives where natural (AppBar, List, Typography, Box, Paper, Alert, Divider, Chip). Keep `next/image` for Image blocks. Keep `BlockRenderer` + `registry` dispatch logic.
- **Rationale**: One visual system; registry discipline unchanged.
- **Alternatives considered**: MUI only on chrome (rejected by FR-001 / US2).

## Retiring `globals.css`

- **Decision**: Strip block/page presentation rules. Retain at most universal `box-sizing` / margin reset if not fully covered by `CssBaseline`. No parallel `.block-*` design system.
- **Rationale**: FR-011 / clarify Option A.
- **Alternatives considered**: Hybrid large globals (rejected).

## Markdown + MUI

- **Decision**: Keep `react-markdown` helpers. Style markdown output via theme-aware wrappers so links/code pick up light/dark. Do not map every Markdown node to MUI unless needed.
- **Rationale**: YAGNI inside Markdown tree; theme colors still apply.
- **Alternatives considered**: Full custom `components` map to MUI for every tag (more client weight).
