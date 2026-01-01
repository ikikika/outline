# Contract: Public Routes & Metadata

## Routes

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/` | Home: list of published articles (title, optional description, link), newest `publishDate` first |
| GET | `/articles/{slug}` | Render published article for filename stem `{slug}`; unpublished or missing → 404 |
| GET | other | Next.js default 404 |

## Static generation

- Prebuild paths for every **published** slug from `data/articles/*.json`.
- Do not generate paths for `published: false`.
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
| title | `article.title` |
| description | `article.description` |
| canonical | `{siteUrl}/articles/{slug}` |
| og:title | `article.title` |
| og:description | `article.description` |
| og:url | canonical |
| og:image | `article.ogImage` when present |

## UI contracts (non-API)

- Home list entry: accessible link control; visible title; description MAY show.
- Article: blocks rendered in array order via single registry.
- Site chrome: brand/home affordance; does not replace home list navigation.
- Mobile (~375px): no horizontal scroll of primary content.
