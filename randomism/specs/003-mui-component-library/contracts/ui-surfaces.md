# Contract: UI surfaces → MUI

Presentation mapping for public UI. Content JSON / `componentType` contracts unchanged.

## Chrome

| Surface | MUI building blocks (intent) |
|---------|------------------------------|
| Root shell | `CssBaseline` + theme `background` |
| Header | `AppBar`, `Toolbar`, `Typography`, `Link` |
| Color mode | `IconButton` (or `Button`) + icons; see [theme.md](./theme.md) |
| Home article list | `List` / `ListItemButton` / `Typography` |
| Article title / draft | `Typography`, `Chip` (draft) |
| Content column | `Container` or `Box` with max width ≈ prior `42rem` |

## Blocks (registry)

| componentType | MUI / notes |
|---------------|-------------|
| Heading | `Typography` with `variant` mapped from `level` (plain text) |
| Paragraph | `Box`/`Typography` wrapper + existing Markdown helper |
| Image | `Box` + `next/image` (alt required) |
| CodeBlock | `Box`/`Paper` + `<pre><code>`; overflow-x auto; optional language caption |
| Accordion | MUI `Accordion` × N (multi-expand state); Markdown in summary/details (**Client Component**) |
| Blockquote | `Box` border + Markdown; plain `cite` |
| List | MUI `List`/`ListItem` or semantic `ul`/`ol` styled via theme; inline Markdown items |
| Callout | `Alert` (or `Paper`) with text label Info/Tip/Warning + Markdown body |
| Divider | MUI `Divider` |

## Explicit non-changes

- `components/registry.ts` remains the only `componentType` → renderer map.
- `lib/schema/article.ts` unchanged by this feature.
- Routes and metadata generation unchanged (`contracts` from `001` still apply).
