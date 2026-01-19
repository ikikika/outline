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
- Meaningful names; no abbreviations like `fN` for `firstName`.
- One identifier, one purpose; avoid shadowing (e.g. state `year` vs param `year`).
- DRY without over-abstracting; extract helpers when logic repeats or conditions get dense.
- Avoid deep nesting and long lines.
- Extract complex `&&` / `||` conditions into named booleans or helpers.
- Prefer destructuring for props, nested objects, and API payloads.

## Comments and dead code

- Comment non-obvious intent, tradeoffs, and constraints — not self-explanatory code.
- Delete commented-out code; use version control for history.

## Git

- Rely on version control; make small, coherent commits when asked to commit.
- Do not leave unfinished work only on a local unsaved buffer.

## Errors

- Handle failures so the UI stays usable and issues are diagnosable.
- Catch async work you own (`fetch`, parse, storage) at data/hook layers; return clear results to the UI.
- Never empty-catch. Log with context, then surface a user message or rethrow.
- Prefer specific errors (include operation + status) over generic messages.
- Use Error Boundaries for render crashes; use query/UI error state for failed fetches.
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
