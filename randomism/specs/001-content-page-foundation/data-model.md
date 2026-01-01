# Data Model: Content Page Foundation

## Entities

### ArticleFile (source document)

One file: `data/articles/{slug}.json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| (identity) | filename stem | yes | Slug; not stored inside JSON |
| `published` | boolean | yes | `true` → listed + public route |
| `publishDate` | string (ISO date) | if `published` | `YYYY-MM-DD` or ISO datetime; omit OK when `published` is false |
| `title` | string | yes | Non-empty; SEO + list label |
| `description` | string | yes | Non-empty; SEO + optional list summary |
| `ogImage` | string | no | Site-relative path for OG image |
| `blocks` | Block[] | yes | Length ≥ 1 |

**Derived**:
- `slug`: filename without `.json`
- `path`: `/articles/{slug}`
- `canonicalUrl`: `{siteUrl}/articles/{slug}` (computed)
- Listed on home iff `published === true`

### Block (discriminated union)

Shared:
| Field | Type | Required |
|-------|------|----------|
| `componentType` | `"Heading" \| "Paragraph" \| "Image"` | yes |

**Heading**
| Field | Type | Required |
|-------|------|----------|
| `level` | 1–6 integer | yes |
| `content` | non-empty string | yes |

**Paragraph**
| Field | Type | Required |
|-------|------|----------|
| `content` | non-empty string | yes |

**Image**
| Field | Type | Required |
|-------|------|----------|
| `content.src` | non-empty string (site-relative URL path) | yes |
| `content.alt` | non-empty string | yes |

Unknown keys on article or block objects → validation failure.  
Unknown `componentType` → validation failure.

### ArticleListItem (home view model)

Derived from published ArticleFile:

| Field | Source |
|-------|--------|
| `slug` | filename |
| `title` | article.title |
| `description` | article.description |
| `publishDate` | article.publishDate |
| `href` | `/articles/{slug}` |

Sort: `publishDate` descending, then `slug` ascending.

### SiteConfig

| Field | Notes |
|-------|-------|
| `siteName` | e.g. Randomism |
| `defaultTitle` | Home document title |
| `defaultDescription` | Home meta description |
| `siteUrl` | From env with localhost default |

## Relationships

- `data/articles/*.json` —1:1→ ArticleFile —0..1 public→ Article page (only if published)
- ArticleFile.blocks —ordered→ Block renderers via registry
- Home ArticleList —aggregates→ all published ArticleFiles

## Validation rules (summary)

1. Only `*.json` directly under `data/articles/` are candidates.
2. Every candidate must parse + pass Zod schema (drafts included).
3. Filenames unique; slug pattern safe (no `/`, empty, etc.).
4. `published === true` ⇒ `publishDate` required.
5. `blocks.length >= 1`.
6. Image `alt` and `src` required.
7. Strict objects (no unknown keys).

## State

| State | `published` | Home list | Public route | Build validates |
|-------|-------------|-----------|--------------|-----------------|
| Draft | false | no | no (`notFound`) | yes |
| Published | true | yes | yes | yes |

No other lifecycle states in foundation.
