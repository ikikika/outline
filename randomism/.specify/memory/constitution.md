<!--
Sync Impact Report
- Version change: 1.1.0 → 1.1.1
- Modified principles / constraints:
  - Technology & Content Constraints → Content model: allow schema-documented
    structural blocks (componentType-only) such as Divider; clarify named
    payload fields beyond `content`
- Templates requiring updates: none (constraint wording only)
- Follow-up TODOs: None
-->

# Randomism Constitution

## Core Principles

### I. Spec-First Delivery

Every feature MUST follow the Spec Kit pipeline: specify → plan → tasks →
implement. Implementation MUST NOT begin without a feature specification that
defines user-visible outcomes and acceptance scenarios. Significant changes MUST
update the relevant specification; README and architecture-decision notes MUST
be updated when the change affects setup, structure, or durable design choices.

Rationale: Keeps blog features, content-schema changes, and renderers aligned
before code lands, and keeps docs honest afterward.

### II. Content–Code Separation (NON-NEGOTIABLE)

Page copy and layout structure MUST live in versioned JSON content (fields such
as `componentType`, `content`, and documented companions). Application code MUST
only load content and map `componentType` values to React renderers. Content
edits MUST NOT require changing page route logic unless the content schema or
renderer contract changes.

Rationale: Randomism is a JSON-driven blog; separating content from renderers
keeps publishing changes cheap and code changes intentional.

### III. Component Registry Discipline

Every `componentType` MUST resolve through a single component registry to exactly
one React renderer. Unknown `componentType` values MUST fail loudly in
development and degrade safely in production (for example, skip the block with a
visible diagnostic in dev). Introducing a new `componentType` MUST include: (1)
documented schema fields, (2) a registered renderer, and (3) at least one example
JSON fixture under the content tree.

Block and shared UI components MUST have a single clear responsibility. Reusable
UI MUST live under `components/`. Prefer composition over inheritance when
building layouts and block wrappers.

Rationale: A single registry plus focused components prevents ad-hoc switch
statements, silent render gaps, and tangled UI as the catalog grows.

### IV. Schema Before UI

Content JSON MUST conform to a documented schema (types, required fields,
nesting, and page composition rules). Specs and plans that change content shape
MUST call out schema impact explicitly. Invalid content MUST be rejected or
flagged before it is treated as renderable page data.

Rationale: Schema-first design protects the renderer contract and makes content
authoring predictable.

### V. Simplicity (YAGNI)

Prefer the simplest solution that satisfies the approved requirements. Prefer a
flat registry and a small set of primitive block components over a CMS, page
builder, or plugin framework. MUST NOT add dependencies or abstractions without
a concrete need in an approved feature spec. MUST NOT perform premature
optimization. New abstractions MUST wait until a second real use case appears in
an approved feature spec. Complexity that violates this principle MUST be
recorded in the plan's Complexity Tracking table with justification.

Rationale: Early over-engineering and dependency sprawl slow a content-driven
blog more than they help.

### VI. Static First

Prefer static generation (SSG / static export-compatible patterns) whenever
possible. MUST NOT introduce a backend, server-only runtime dependency, or remote
CMS unless an approved feature requires it. Content MUST remain in-repo local
JSON unless a feature explicitly specifies otherwise.

Rationale: A static-first blog stays simple to host, preview, and reason about.

### VII. Accessibility Baseline

Every page MUST use semantic HTML, support keyboard navigation, provide
sufficient color contrast, include alt text for meaningful images, and maintain
a proper heading hierarchy.

Rationale: Accessibility is a baseline quality bar for a public blog, not an
optional polish pass.

### VIII. Performance Discipline

Optimize images (appropriate format, sizing, and Next.js image handling where
applicable). Lazy-load non-critical content. Keep JavaScript bundles small. Prefer
React Server Components by default; MUST NOT add Client Components unless
interactivity or browser-only APIs require them.

Rationale: Content sites win on fast loads; unnecessary client JS is the usual
regression.

### IX. SEO Completeness

Every article MUST include title, description, canonical URL, and Open Graph
metadata. Structured data SHOULD be included where appropriate for the content
type.

Rationale: Discoverability is a core product requirement for a blog.

### X. Code Quality Gates

Use TypeScript in strict mode. `any` MUST NOT appear unless justified in the
pull request or plan. ESLint MUST pass. Production builds MUST succeed with zero
warnings.

Rationale: Strict typing and clean builds keep a small Next.js codebase
maintainable as content and components grow.

### XI. AI Collaboration

AI-generated code MUST match the approved specification, preserve approved UI
when a UI artifact or design decision exists, explain significant architectural
changes, avoid introducing libraries without justification under Simplicity, and
MUST NOT modify unrelated files.

Rationale: Spec Kit + AI is the delivery path; these rules keep agents aligned
with governance instead of opportunistic refactors.

## Technology & Content Constraints

- **Stack**: Next.js (App Router) and TypeScript (strict).
- **Rendering default**: Static generation first; backend only when required by
  an approved feature.
- **Content storage (v1)**: In-repo versioned JSON under a dedicated content
  directory (exact path chosen in the first implementation plan).
- **Content model**: Blocks MUST include `componentType`. Blocks that carry author
  data MUST also include a schema-documented content payload field (commonly
  `content`, or another named field such as `code`, `body`, `text`, `items`, or
  `sections`). Schema-documented **structural** blocks (e.g. a divider with no
  prose) MAY omit a payload and consist of `componentType` only. Additional
  fields MUST be schema-documented before use.
- **Composition**: Pages MUST be ordered collections of blocks (or an equivalent
  schema-documented structure) rendered via the registry.
- **Out of scope for v1 unless specified**: CMS, auth, i18n, analytics, and
  automated test suites.

## Development Workflow

- Plans MUST include a Constitution Check that verifies principles I–XI before
  Phase 0 research and again after Phase 1 design.
- Features that add or change `componentType` values, schema fields, or registry
  entries MUST list those changes as explicit tasks.
- Pull requests that modify renderers MUST include or update an example content
  fixture demonstrating the change.
- Article or metadata features MUST include tasks for title, description,
  canonical URL, and Open Graph fields (and structured data when appropriate).
- Significant changes MUST update the feature spec; update README when setup or
  contributor workflow changes; record durable architecture choices when
  applicable.
- Spec Kit commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
  `/speckit-implement`) are the default delivery path for product work.

## Governance

This constitution supersedes conflicting informal practices. Amendments MUST be
made via `/speckit-constitution` (or equivalent documented process), with version
bumped using semantic versioning:

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principles/sections or materially expanded guidance
- **PATCH**: Clarifications, wording, and non-semantic refinements

All feature plans and reviews MUST verify compliance with MUST rules above.
Complexity beyond these principles MUST be justified in Complexity Tracking.
Runtime development guidance, when added, MUST NOT weaken these constraints.

**Version**: 1.1.1 | **Ratified**: 2026-08-03 | **Last Amended**: 2026-08-03
