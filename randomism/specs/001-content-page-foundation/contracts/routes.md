# Contract: Public Routes & Metadata

## Routes

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/` | Home: list of **published** articles only (title, optional description, link), newest `publishDate` first |
| GET | `/articles/{slug}` | Render article for filename stem `{slug}` whether published or draft; missing slug → 404. Drafts show a visible Draft indicator and SHOULD send `noindex` |
| GET | other | Next.js default 404 |

## Static generation

- Prebuild paths for **every** valid article slug from `data/articles/*.json` (published and draft).
- Build MUST fail if any `data/articles/*.json` fails schema/parse validation.

## Metadata

### Home (`/`)

| Field | Source |
|-------|--------|
| title | Site default title |
| description | Site default description |
| canonical / OG | MAY derive from `{siteUrl}/` |

### Article (`/articles/{slug}`)

| Field | Source |
|-------|--------|
| title | `article.title` (drafts MAY append a draft marker in the document title) |
| description | `article.description` |
| canonical | `{siteUrl}/articles/{slug}` |
| og:title | Same as title |
| og:description | `article.description` |
| og:url | canonical |
| og:image | `article.ogImage` when present |
| robots | Drafts SHOULD use `noindex, nofollow` |

## UI contracts (non-API)

- Home list entry: accessible link control; visible title; description MAY show; drafts never listed.
- Article: blocks rendered in array order via single registry.
- Draft article page: visible “Draft” tag/status indicator near the top of the article.
- Site chrome: brand/home affordance; does not replace home list navigation.
- Mobile (~375px): no horizontal scroll of primary content.
