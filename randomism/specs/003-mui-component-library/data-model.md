# Data Model: MUI Component Library

Presentation-only feature. **ArticleFile / Block schemas are unchanged** from features `001` and `002`.

## Entities

### ColorModePreference (client)

Visitor preference for public UI color mode.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mode` | `'light'` \| `'dark'` \| `null` | yes | `null` = follow system `prefers-color-scheme` |
| Storage key | string | yes | `randomism-color-mode` in `localStorage` when mode is explicitly set |

**Resolution algorithm**

1. Read `localStorage['randomism-color-mode']`.
2. If value is `light` or `dark`, active theme = that value.
3. Else active theme = system dark ? `dark` : `light`.
4. On toggle: set storage to the opposite of current **active** theme (or explicit target), then apply.

**State transitions**

| From | Event | To |
|------|-------|-----|
| system (null) | toggle | explicit light or dark (whichever was not active) |
| explicit light | toggle | explicit dark |
| explicit dark | toggle | explicit light |
| any | clear storage (dev only) | system |

No server-side user profile; preference is browser-local only.

### ThemeTokens (app config)

Not content JSON. Defined in code (`components/theme/theme.ts`):

| Token group | Light intent | Dark intent |
|-------------|--------------|-------------|
| `background.default` / `paper` | Warm paper | Dark surface |
| `text.primary` / `secondary` | Near-black / muted stone | Near-white / muted |
| `primary.main` | Teal accent `#0f766e` family | Teal adjusted for contrast |
| Typography | Serif body / UI sans close to current | Same families |

### Article / Block

Unchanged. See `specs/002-blog-block-catalog/data-model.md`. Accordion `defaultOpen` still seeds UI state only.

## Relationships

- `AppThemeProvider` reads/writes ColorModePreference → selects ThemeTokens → wraps public UI.
- Registry blocks consume active theme via MUI context; they do not read `localStorage` directly (except Accordion local expand state).

## Validation

- Article schema validation unchanged.
- Color mode storage: ignore unknown values; fall back to system.
