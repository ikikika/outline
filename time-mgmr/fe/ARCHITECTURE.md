# Project Guide

## Purpose

Single reference for project setup, structure, architecture rules, and UI conventions.

---

## Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run build  # runs tsc -b && vite build
```

### Linting
```bash
npm run lint
```

---

## Project Structure

```
react-starter/
├── ARCHITECTURE.md        ← this file
└── src/
    ├── app/               → Root wiring: providers, router, app-level orchestration
    │   ├── providers/
    │   │   ├── auth/      → AuthProvider + useAuthContext
    │   │   └── theme/     → ThemeProvider + useThemeContext
    │   └── routes/
    ├── components/        → Reusable UI (Atomic Design)
    │   ├── atoms/         → Smallest units: Button, Input, Label
    │   ├── molecules/     → Composed atoms: Forms, Cards
    │   ├── organisms/     → Complex sections
    │   └── templates/     → Shared layout patterns
    ├── core/              → Global types, constants, utilities, generic hooks
    ├── features/          → Domain modules (auth, dashboard, user)
    ├── layouts/           → Layout wrappers
    ├── pages/             → Route-level UI containers
    ├── services/          → Shared transport/infrastructure helpers (e.g. httpClient)
    ├── shared/            → Cross-feature, non-domain modules
    └── styles/            → Design tokens and global styles
```

### Feature module shape

```
features/myFeature/
├── api/
├── components/
├── hooks/
├── services/
├── state/
├── types/
└── index.ts
```

---

## Import Aliases

Use `@/` instead of relative paths:

```typescript
// ✓ Good
import { Button } from '@/components/atoms'
import { useAuth } from '@/features/auth'

// ✗ Avoid
import { Button } from '../../../../components/atoms'
```

---

## Architecture Principles

### High-Level

- Atomic Design for reusable UI composition
- Feature-first modularity for domain isolation
- Type-safe contracts at all boundaries
- SOLID principles for maintainability and testability

### SOLID in This Codebase

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Components, hooks, and services each do one focused job |
| **Open/Closed** | Extend via variants, composition, and new modules — not rewrites |
| **Liskov Substitution** | Interface-based service contracts allow strategy swapping |
| **Interface Segregation** | Keep interfaces small and purpose-specific |
| **Dependency Inversion** | Depend on abstractions (interfaces and context contracts) |

### Auth and Theme

- Auth and Theme providers are colocated in `app/providers/`.
- User theme preference is applied via provider orchestration when auth state resolves.

---

## UI System — Shadcn/UI + Tailwind CSS

### Available components

```tsx
import { Button, Card, CardContent, Input } from '@/components/ui'
```

- **Button** — variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes: `sm`, `default`, `lg`, `icon`
- **Card** — `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Input** — standard text input

### Using components

```tsx
<Card>
  <CardContent>
    <Input placeholder="Enter text..." />
    <Button variant="outline" size="lg">Submit</Button>
  </CardContent>
</Card>
```

### Adding more shadcn components

```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
```

Full list: https://ui.shadcn.com

### Tailwind

Use utility classes directly in JSX:

```tsx
<div className="flex items-center gap-4 p-6 rounded-lg bg-slate-50">
  <Button className="px-8">Wide Button</Button>
</div>
```

Dark mode: add `dark` class to any parent element.

### Theme CSS Variables

Edit `src/styles/_globals.scss` to customize:

```scss
--primary: 0 0% 9%;
--secondary: 0 0% 96.1%;
--accent: 0 84.2% 60.2%;
--destructive: 0 84.2% 60.2%;
--muted: 0 0% 96.1%;
```

### Key config files

| File | Purpose |
|------|---------|
| `tailwind.config.js` | Tailwind configuration |
| `components.json` | Shadcn/UI configuration |
| `src/components/ui/` | Pre-built shadcn components |
| `src/lib/utils.ts` | `cn` class name utility |
| `src/styles/_globals.scss` | CSS variables and global styles |

---

## Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `Button.tsx`, `LoginForm.tsx` |
| Component style | Same + `.module.scss` | `Button.module.scss` |
| Hook | `use` prefix, camelCase | `useAuth.ts` |
| Service | camelCase + `Service` | `authService.ts` |
| Types | `index.ts` or descriptive name | `types/index.ts` |
| Util | camelCase + `Utils` | `classNameUtils.ts` |

### General

- Use `@/` import aliases everywhere.
- Use barrel exports (`index.ts`) for public module surfaces.
- Keep style colors tokenized through `styles/variables`.
- Prefer feature-local logic over cross-feature coupling.

---

## Creating Components

### Atom

```tsx
// src/components/atoms/MyButton.tsx
import { cn } from '@/core/utils/classNameUtils'
import styles from './MyButton.module.scss'

interface IMyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const MyButton: React.FC<IMyButtonProps> = ({ className, ...props }) => (
  <button className={cn(styles.button, className)} {...props} />
)
```

### Molecule

```tsx
// src/components/molecules/MyCard.tsx
import { Button } from '@/components/atoms'

export const MyCard: React.FC<React.PropsWithChildren<{ title: string; onAction?: () => void }>> = ({
  title, onAction, children,
}) => (
  <div>
    <h2>{title}</h2>
    {children}
    <Button onClick={onAction}>Action</Button>
  </div>
)
```

### Barrel export

```typescript
// src/components/atoms/index.ts
export { Button } from './Button'
export { Input } from './Input'
```

---

## Creating a Feature

```
src/features/myFeature/
├── components/
├── hooks/
│   └── useMyFeature.ts
├── services/
│   └── myFeatureService.ts
├── types/
│   └── index.ts
└── index.ts
```

**Types → Service → Hook → Page** is the standard creation order.

```typescript
// types/index.ts
export interface IMyFeatureData { id: string; name: string }

// services/myFeatureService.ts
export class MyFeatureService {
  async getData(): Promise<IMyFeatureData[]> { return [] }
}

// hooks/useMyFeature.ts
export function useMyFeature() {
  const [data, setData] = useState<IMyFeatureData[]>([])
  const service = new MyFeatureService()
  const fetchData = async () => setData(await service.getData())
  return { data, fetchData }
}

// index.ts
export { MyFeatureService } from './services/myFeatureService'
export { useMyFeature } from './hooks/useMyFeature'
export type { IMyFeatureData } from './types'
```

---

## Best Practices

✅ Do
- Keep components small and focused (under 200 lines)
- Use TypeScript for type safety
- Create barrel exports
- Use SCSS modules for styles
- Extract repeated logic into hooks

✗ Don't
- Mix concerns in one component
- Use inline styles in production
- Import deeply nested files
- Skip TypeScript types
- Duplicate derived state

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `@/` import not resolving | Check `tsconfig.app.json` paths and `vite.config.ts` alias; restart dev server |
| TypeScript errors | Run `npm run build` for full compiler output |
| Styles not applying | Use CSS Modules + `cn` utility; check SCSS syntax |
| Component not rendering | Check barrel export and that component uses `export const` |
