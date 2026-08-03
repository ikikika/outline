# Quickstart: MUI Component Library

Manual validation after implementation. No automated test suite. Assumes features `001` and `002` already work.

## Prerequisites

- Node.js 20+ and npm
- Feature implemented per [plan.md](./plan.md)
- Dependencies installed (`@mui/material`, Emotion, etc.)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation scenarios

### 1. Shared visual system (chrome + article)

1. Open `/` and `/articles/getting-started`.
2. **Expect**: Header and article body share type/color/spacing (one system). Light theme feels like warm paper + teal accent—not stock Material purple (SC-001).

### 2. Color mode: system, toggle, persistence

1. Clear `localStorage` key `randomism-color-mode` (DevTools).
2. Set OS/browser preference to dark; reload `/`.
3. **Expect**: Dark surfaces without having toggled (SC-007).
4. Use header control to switch to light; reload.
5. **Expect**: Light remains after reload (persisted choice).
6. Toggle to dark; open `/articles/getting-started`.
7. **Expect**: Dark still applied; control remains keyboard-operable with a clear accessible name.

### 3. Blocks still behave

1. Open `/articles/getting-started`.
2. **Expect**: All block types in order; code is literal/preformatted; Markdown bold/link/code work; callout has text label; accordion opens multiple panels and works by keyboard (SC-002, SC-004).

### 4. Draft + SEO smoke

1. Open `/articles/draft-example` — Draft indicator present; not on home list.
2. View article document head — title/description/canonical/OG still present.

### 5. Responsive

1. Viewport ~375px; home + getting-started.
2. **Expect**: No primary-page horizontal scroll; code may scroll inside its region (SC-003).

### 6. Legacy CSS retired

1. Inspect `app/globals.css`.
2. **Expect**: No large `.block-*` presentation system; styling comes from MUI theme/components (FR-011).

### 7. Docs + quality gates

1. README mentions Material UI as public UI baseline and unchanged article JSON types (SC-006).
2. Run:

```bash
npm run lint
npm run build
```

**Expect**: ESLint clean; build succeeds with zero warnings on valid fixtures.

## References

- Spec: [spec.md](./spec.md)
- Theme contract: [contracts/theme.md](./contracts/theme.md)
- UI surfaces: [contracts/ui-surfaces.md](./contracts/ui-surfaces.md)
- Data model (color mode): [data-model.md](./data-model.md)
