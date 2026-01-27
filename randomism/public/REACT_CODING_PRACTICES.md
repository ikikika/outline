# React Coding Practices

Agent instructions for React/TypeScript work. Prefer the project's existing stack and conventions when they conflict with this file.

## Goals

Write code that is readable, maintainable, testable, and safe at trust boundaries (forms, APIs, env).

## Stack defaults

Use what the repo already uses. When greenfield or choosing freely, prefer:

- React + TypeScript
- Vite (SPA) or Next.js (SSR/SSG/routing)
- TanStack Query for server/async state
- Zod for runtime validation of forms, env, and API payloads
- Vitest or Jest + React Testing Library
- ESLint (often with Prettier)

Do not add Redux, new state libraries, or new test runners unless the task requires them or the repo already uses them.

## Readability

- Prefer clear over clever; short functions with one job.
- Meaningful names; no abbreviations like `fN` for `firstName`; avoid spelling mistakes in identifiers and paths (searchability).
- One identifier, one purpose; avoid shadowing (e.g. state `year` vs param `year`).
- Extract repeated string literals to `const` (e.g. role strings used in multiple places).
- DRY without over-abstracting; extract helpers when logic repeats or conditions get dense.
- Avoid deep nesting and long lines; let Prettier/ESLint handle formatting consistently.
- Extract complex `&&` / `||` conditions into named booleans or helpers.
- Prefer destructuring for props, nested objects, and API payloads.

## Comments and dead code

- Comment non-obvious intent, tradeoffs, and constraints — not self-explanatory code.
- Delete commented-out code; use version control for history.

## Git

- Save and push work regularly; do not rely only on unsaved local buffers.
- Make small, coherent commits when asked to commit.

## Errors

- Handle failures so the UI stays usable and issues are diagnosable.
- Catch async work you own (`fetch`, parse, storage) at data/hook layers; return clear results to the UI.
- Never empty-catch. Log with context, then surface a user message or rethrow.
- Prefer specific errors (include operation + status) over generic messages.
- Use Error Boundaries for render crashes; use query/UI error state for failed fetches.
- With TanStack Query, surface `isError` / `error` and offer a Retry action — not a blank screen.
- Offer recovery: retry, go back, or a safe empty state.

## Input validation

- Validate all user-facing inputs on the frontend before submit or side effects.
- Prefer a schema (e.g. Zod) with field-level UI messages.
- Required fields: reject `null`, `undefined`, and blank/whitespace-only strings.
- Check types/formats (email, phone, date, id) — not only non-empty.
- Numbers/currency: reject NaN; limit decimal places (often 2); disallow negatives unless allowed.
- Enforce min/max and length where the product cares.
- Block or disable submit while invalid; do not rely only on API errors.
- Treat API and form data as untrusted; validate at boundaries.

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `NewsArticle.tsx` |
| Hooks, utils, non-components | camelCase | `useMyHook.ts`, `fetchApi.ts` |
| Tests | Same base name + `.test` | `NewsArticle.test.tsx` |
| Props / attributes | camelCase | `onClick`, `someCustomAttribute` |

## CSS class names

- Follow the project's existing styling approach (CSS Modules, Tailwind, MUI/`sx`, plain CSS).
- If using hand-written global/BEM-style classes: `{project}-{module}-{component}-{part}`.
- Wrapper = parts of one component; container = multiple components/wrappers.

## Folder architecture

Starting recommendation only — prefer the live repo when it diverges. Reference shape: [starter-mfe](https://github.com/ikikika/learning/tree/react/starter-mfe/react/starter-mfe) (Webpack Module Federation: `standalone` | `host` | `remote` | `hybrid`).

```
src/
  app/           # wiring: providers, routes, federated entries, remote loaders
  features/      # domain UI + api / hooks / types per feature
  pages/         # thin route containers that compose features
  components/    # shared UI primitives (not domain logic)
  core/          # shared constants, role/remotes helpers, shared hooks
  services/      # shared HTTP client (httpClient, apiUrl)
  layouts/       # shell chrome (e.g. MainLayout)
  styles/        # tokens + global styles
  types/         # shared TypeScript types
tests/           # contract + integration (unit tests stay co-located)
```

**Layers**

- **Feature** (`src/features/<name>/`) — vertical slice: UI, `api/`, `hooks/`, local `types/`. Build order: types → api → hooks → UI → page/route wiring.
- **Page** (`src/pages/`) — thin route container; composes features and layouts; no heavy domain logic or raw `fetch`.
- **App wiring** (`src/app/`) — `App.tsx`, providers, role route tables, Module Federation mounts and remote loaders.
- **Component** (`src/components/`) — reusable presentational primitives; no feature-specific API imports.
- **Core** (`src/core/`) — `apiRoutes`, `routePaths`, remotes metadata, env-derived values — not hardcoded in UI.
- **Service** (`src/services/`) — shared HTTP plumbing; feature `api/` modules call through here.
- **Layout** (`src/layouts/`) — nav and page chrome.

**Where to put work**

- New capability → `src/features/<name>/`, then thin `src/pages/` entry, then route in `src/app/routes/*Routes.tsx` using `routePaths` from `src/core/constants/`.
- Shared UI → `src/components/<Name>/`.
- API path segments → `src/core/constants/apiRoutes.ts`; route segments → `routePaths.ts`.
- HTTP client / base URL → `src/services/httpClient.ts` + env via `src/core/constants/app.ts`.
- Global styles → `src/styles/`; component styles → co-located `*.module.scss`.
- Unit tests → co-located `*.test.tsx`; contract/integration → `tests/`.
- Federated remote/hybrid entry → `src/app/FederatedRemoteApp.tsx` / `FederatedHybridApp.tsx`; domain UI stays in features.

**Rule of thumb:** pages compose, features own domain data, components stay presentational, core holds shared constants, services own HTTP. Do not call APIs from presentational components (including `useEffect` in the component body) — use `features/*/hooks` + `features/*/api`.

## Imports

Order imports consistently:

1. React
2. External libraries (alphabetical)
3. Absolute/project imports (alphabetical)
4. Relative imports (alphabetical)
5. `import * as …`
6. Side-effect / style imports (`import "./file.css"`)

## README (when creating or updating)

Include: intro, getting started, build and test, contribution notes.

## Do not

- Introduce secrets into client code.
- Use `dangerouslySetInnerHTML` with untrusted content.
- Expand scope beyond the requested change.
- Rewrite working patterns to match this file when the repo already has a clear local convention.
