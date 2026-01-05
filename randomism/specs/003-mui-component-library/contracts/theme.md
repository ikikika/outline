# Contract: Theme & color mode

## Storage

| Key | Values | Meaning |
|-----|--------|---------|
| `localStorage['randomism-color-mode']` | `light` \| `dark` | Explicit visitor choice |
| (absent / invalid) | — | Follow `prefers-color-scheme` |

## Active theme resolution

```text
if localStorage mode in {light, dark}:
  active = localStorage mode
else:
  active = prefers-color-scheme dark ? dark : light
```

## Light theme intent (brand-tuned)

| Role | Approx value / intent |
|------|------------------------|
| Page background | Warm paper `#f7f4ef` |
| Paper / elevated | Warm `#efe8dc`–`#ffffff` range |
| Text | `#1c1917` |
| Muted text | `#57534e` |
| Accent / primary | `#0f766e` |
| Border | `#d6d3d1` |

Exact MUI `palette` mapping is set in `components/theme/theme.ts` at implement; must remain recognizably Randomism (not default Material purple).

## Dark theme intent

| Role | Intent |
|------|--------|
| Page background | Dark neutral (not pure black preferred) |
| Paper | Slightly elevated dark surface |
| Text | High-contrast light |
| Accent / primary | Teal family meeting contrast on dark surfaces |
| Borders | Subtle light-on-dark separators |

## Toggle UX

- Control lives in site header (chrome).
- Accessible name must indicate action/state (e.g. “Switch to dark mode” / “Switch to light mode”).
- Must not rely on icon color alone.
- Keyboard focus visible.

## Non-goals

- No server-side preference sync.
- No per-article theme overrides in JSON.
