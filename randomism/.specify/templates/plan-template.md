# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Next.js App Router) or NEEDS CLARIFICATION

**Primary Dependencies**: Next.js, React, content schema/validation approach or NEEDS CLARIFICATION

**Storage**: In-repo versioned JSON content (v1) or NEEDS CLARIFICATION

**Testing**: Not required by constitution (omit unless feature explicitly requests tests)

**Target Platform**: Web (blog) or NEEDS CLARIFICATION

**Project Type**: Next.js content-driven blog (JSON blocks → component registry)

**Performance Goals**: [domain-specific, e.g., fast first contentful paint on post pages or NEEDS CLARIFICATION]

**Constraints**: Content–code separation; single component registry; schema before UI; YAGNI; static-first; a11y/SEO/perf/code-quality gates; AI must not drive-by edit

**Scale/Scope**: [domain-specific, e.g., N post types, M componentTypes or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First**: Feature has an approved/drafted spec with user scenarios; doc/README/ADR updates identified when applicable
- **Content–Code Separation**: Page copy/structure stays in JSON; app code only loads content and renders via registry
- **Registry Discipline**: Every new/changed `componentType` has schema fields, one registry mapping, example JSON fixture; single-responsibility components under `components/`
- **Schema Before UI**: Schema impact (fields, nesting, page composition) is explicitly named; invalid content is rejected or flagged before render
- **Simplicity**: No CMS/page-builder/plugin abstraction, extra deps, or premature optimization unless justified in Complexity Tracking
- **Static First**: Prefer SSG; no backend/remote CMS unless the feature requires it; content remains local JSON unless explicitly specified
- **Accessibility**: Semantic HTML, keyboard access, contrast, image alt text, heading hierarchy addressed for touched pages
- **Performance**: Image strategy, lazy-load non-critical content, keep bundles small, Client Components only when required
- **SEO**: Articles include title, description, canonical URL, Open Graph; structured data where appropriate
- **Code Quality**: Strict TypeScript; no unjustified `any`; ESLint clean; build succeeds with zero warnings
- **AI Collaboration**: Changes match spec, avoid unrelated files, justify new libraries, explain significant architecture shifts

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Default: Next.js App Router blog (Randomism)
app/
├── layout.tsx
├── page.tsx
└── [routes]/
components/
├── blocks/           # One renderer per componentType
└── registry.tsx      # componentType → renderer map
content/              # Versioned JSON pages/posts (schema-documented)
lib/
├── content/          # Load + validate JSON
└── schema/           # Content schema types / validators
public/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above. Deviate only with Complexity Tracking justification.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., page-builder abstraction] | [current need] | [why flat registry insufficient] |
| [e.g., external CMS / backend in v1] | [specific problem] | [why local static JSON insufficient] |
| [e.g., new Client Component / dependency] | [specific problem] | [why server component / existing stack insufficient] |
