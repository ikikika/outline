# Research: Content Page Foundation

## Validation library

- **Decision**: Zod for article and block schemas (strict object mode / unknown keys rejected).
- **Rationale**: Spec requires schema-before-UI, reject undeclared fields, and fail build on invalid JSON including drafts. Zod gives runtime validation + TypeScript types with one small dependency, fitting Next.js/TS projects.
- **Alternatives considered**: Hand-rolled validators (more code, easy to drift); AJV/JSON Schema (heavier for this scale); Yup (less idiomatic TS inference).

## Rendering & data loading

- **Decision**: Next.js App Router with static generation. Discover `data/articles/*.json` at build/request time via Node `fs` in server-only modules; `generateStaticParams` for **all** valid slugs (published and draft); `notFound()` only for missing slugs. Drafts omit from home list and show a Draft tag (`noindex`).
- **Rationale**: Constitution Static First; no backend. Authors can preview drafts via direct URL without listing them.
- **Alternatives considered**: `output: 'export'` only (optional later; not required for foundation); MDX (conflicts with JSON block model); runtime fetch API (out of scope); draft → 404 (rejected — drafts must remain URL-reachable).

## Build-time validation failure

- **Decision**: Validate every `data/articles/*.json` during module load used by build (list + static params). Throw on first schema/parse failure so `next build` exits non-zero.
- **Rationale**: Matches FR-007 and clarify decision that invalid drafts fail publish/build.
- **Alternatives considered**: Validate only published (rejected by clarify); separate CI script only (weaker — build itself must fail).

## Slug & discovery

- **Decision**: Slug = filename stem of files matching `data/articles/*.json` only (non-recursive). Ignore non-`.json` files. Duplicate stems impossible on case-sensitive FS; still assert uniqueness after normalize.
- **Rationale**: Spec clarifications. Filename rules: lowercase kebab-case `[a-z0-9]+(?:-[a-z0-9]+)*` recommended; reject empty / path separators / leading dots.
- **Alternatives considered**: Explicit slug field; recursive scan under `data/`.

## Published flag & dates

- **Decision**: Boolean field `published`. When `published === true`, require `publishDate` as ISO-8601 date (`YYYY-MM-DD` or full datetime). Home list: `published === true`, sort by `publishDate` descending; tie-break by slug ascending.
- **Rationale**: Clarify answers B + arrange by publish date; drafts may omit `publishDate`.
- **Alternatives considered**: String enum status; filename prefix `_draft-` (less explicit).

## Block model

- **Decision**: Discriminated union on `componentType`: `Heading` | `Paragraph` | `Image`.
  - Heading: `{ componentType, level: 1|2|3|4|5|6, content: string }`
  - Paragraph: `{ componentType, content: string }`
  - Image: `{ componentType, content: { src: string, alt: string } }` — `src` is site-relative path under `/public` (e.g. `/images/hero.jpg`)
- **Rationale**: Spec block catalog; alt required; local assets only.
- **Alternatives considered**: Flat `content` string for Image (loses alt/src structure); remote URLs (out of scope).

## Unknown componentType at render

- **Decision**: Zod rejects unknown `componentType` at validate/build (so shipped content cannot include unknown types). Defensive render path: if somehow present, skip block + `console.error` in production; visible placeholder in `development`.
- **Rationale**: Satisfies FR-011 without weakening build-time schema.
- **Alternatives considered**: Allow unknown types through schema (rejected — strict schema).

## SEO & site config

- **Decision**: `lib/site.ts` exports `siteName`, default home `title`/`description`, and `getSiteUrl()` from `process.env.NEXT_PUBLIC_SITE_URL` with local default `http://localhost:3000`. Articles store `title`, `description`, optional `ogImage`; canonical and OG URL computed as `${siteUrl}/articles/${slug}`. Home metadata from site defaults (FR-015).
- **Rationale**: Spec allows home defaults; articles need full SEO; canonical base configurable.
- **Alternatives considered**: Canonical stored verbatim in JSON only (fragile across environments).

## Images & performance

- **Decision**: Use `next/image` in Image block; sample assets in `public/images/`. No Client Components for foundation pages.
- **Rationale**: Constitution Performance Discipline.
- **Alternatives considered**: Raw `<img>` (worse defaults); remote loader (out of scope).

## Styling / responsive

- **Decision**: Minimal global CSS (or CSS modules) with fluid typography, max-width content column, list stacking on narrow viewports; verify ~375px no horizontal scroll. No UI framework dependency.
- **Rationale**: YAGNI + mobile responsive FR-016.
- **Alternatives considered**: Tailwind (extra toolchain — defer unless needed later).
