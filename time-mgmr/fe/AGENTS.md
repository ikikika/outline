
# Copilot Instructions - React Starter Agent Specification

## Purpose
Generate, review, and optimize React code for correctness, clarity, performance, and scalability.

## Scope
- Applies to this repository only.
- Repository-specific sections in this file are the source of truth.
- If a baseline React rule conflicts with a repository-specific rule, follow the repository-specific rule.
- Prefer patterns already implemented in this codebase over generic alternatives.

## Project Overview
- Stack: React 19, TypeScript, Vite, React Router, SCSS modules, Tailwind CSS 4, shadcn/ui, Radix UI.
- Data and validation: React Query, React Hook Form, Zod.
- Testing: Vitest + Testing Library + jsdom.
- Linting: ESLint with typescript-eslint, react-hooks, and react-refresh.

## Architecture and Structure
- Use feature-first modules under src/features.
- Use app-level providers and routing under src/app.
- Use Atomic Design organization under src/components.
- Use route-level containers under src/pages.
- Use shared HTTP utilities in src/services/httpClient.ts.
- Keep barrel exports in index.ts files for public module surfaces.
- Put each component in its own subfolder; co-locate the component, SCSS module, and tests (example: `DayTimetable/DayTimetable.tsx`, `DayTimetable.module.scss`, `DayTimetable.test.tsx`).
- Put each util module in its own subfolder; co-locate the source and tests (example: `overlapLayout/overlapLayout.ts`, `overlapLayout.test.ts`).
- For page-local UI and helpers, nest those folders under the page (example: `pages/TimetablePage/components/…`, `pages/TimetablePage/utils/…`); keep the page container files at the page root.

## React Baseline Rules
- Use functional components.
- Keep render logic pure and free of side effects.
- Use hooks only at the top level of React components or custom hooks.
- Use stable keys for lists and avoid array index keys when order can change.
- Use useEffect only for side effects (API calls, timers, subscriptions, imperative DOM work).
- Include correct effect dependencies and cleanup for persistent resources.
- Handle loading, success, and error states for async UI.

## Additional Generic React Guidance (Non-conflicting)
- JSX should contain expressions only (no imperative statements).
- Prefer composition via children and small reusable components.
- Keep props explicit and minimal.
- Keep state immutable and avoid storing values that can be derived.
- Use useRef for DOM access and persistent mutable values that should not trigger rerenders.
- Use preventDefault and stopPropagation only when behavior requires it.
- Use React.lazy with Suspense for large or infrequently used routes/components.

## Coding Standards
- Use TypeScript interfaces and types for contracts.
- Use alias imports with @/ and avoid deep relative imports.
- Components: PascalCase files, functional components, explicit prop interfaces.
- Hooks: use* naming, top-level invocation only.
- Services: use Service naming and isolate API or storage details behind service interfaces.
- Keep context values memoized and callbacks stable where values are passed down.

## Frontend Conventions
- Router and providers:
  - Route pages are lazy-loaded with Suspense fallback.
  - Providers are composed at app root (ThemeProvider, AuthProvider, QueryClientProvider).
- Forms:
  - Prefer React Hook Form + Zod resolver for form-heavy pages.
  - Keep field names centralized (example: PROFILE_FORM_FIELDS).
  - Show validation messages close to each field.
- Styling:
  - Prefer SCSS modules and tokenized variables.
  - Tailwind and shadcn utility usage is allowed where already used.

## API and Backend Conventions
- This repository is frontend-only; backend APIs are consumed via service or api modules.
- Prefer src/services/httpClient.ts helpers (getJson, postJson, HttpClientError) for new API calls.
- Read base URLs from constants or env values (API_BASE_URL), not hard-coded hostnames.
- Normalize API responses before storing in state.
- Keep fallback or mock behavior explicit and environment-gated.

## State and Data Management
- Server state: use React Query with stable query keys scoped by entity or user.
- Cross-cutting app state: use Context providers (auth, theme, profile).
- Local UI state: useState/useMemo/useCallback in components and hooks.
- For updates, prefer React Query cache updates or invalidation instead of duplicated local copies.

## Testing Expectations
- Use Vitest + React Testing Library.
- Keep tests in *.test.ts or *.test.tsx near source files.
- Test behavior and user-visible outcomes, not implementation details.
- Mock boundaries (context, services, api modules), not DOM internals.
- Preserve cleanup and mock reset behavior from src/test/setup.ts.

## Performance Guidelines
- Keep route-level code splitting with React.lazy and Suspense.
- Avoid unnecessary rerenders by stabilizing callbacks and derived values where needed.
- Memoize expensive work only when justified.
- Avoid oversized monolithic components; extract focused children or custom hooks.

## Do NOT (Anti-patterns observed in this codebase)
- Do NOT add new hard-coded API endpoints (an existing example uses localhost in profile api).
- Do NOT bypass shared httpClient for new feature APIs without a clear reason.
- Do NOT introduce additional inline style objects in page components; prefer SCSS module classes.
- Do NOT disable react-hooks/exhaustive-deps unless there is a documented and justified exception.
- Do NOT use JSON.parse(JSON.stringify(...)) for new state-copy logic.
- Do NOT leave mock auth or mock data toggles enabled for production builds.
- Do NOT add broad console logging in production paths.

## Guardrails for Future Code Changes
- Keep architecture boundaries:
  - app = wiring, providers, routes
  - features = domain logic
  - pages = route containers
  - components = reusable UI primitives and compositions
- Any new API integration must include:
  - typed request and response contracts
  - loading and error handling
  - tests for success and failure paths
- Any new form flow must include:
  - schema validation
  - user-facing error messages
  - tests for invalid and valid submissions
- Prefer minimal, incremental refactors over broad rewrites.