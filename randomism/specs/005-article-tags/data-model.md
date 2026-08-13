# Data Model: Article Tags

Extends [001 data-model](../001-content-page-foundation/data-model.md) ArticleFile / ArticleListItem. Block catalog unchanged (004 TableOfContents still applies).

## Entities

### ArticleFile (source document)

One file: `data/articles/{slug}.json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| (identity) | filename stem | yes | Slug; not stored inside JSON |
| `published` | boolean | yes | Unchanged |
| `publishDate` | string | if published | Unchanged |
| `title` | string | yes | Unchanged |
| `description` | string | yes | Unchanged |
| `ogImage` | string | no | Unchanged |
| **`tags`** | string[] | no | Unique lowercase hyphenated identities. Omit or `[]` = no tags. After validation, treat missing as `[]` |
| `blocks` | Block[] | yes | Unchanged; **no** Tags `componentType` |

**Tag identity** (each `tags[]` element):

| Rule | Constraint |
|------|------------|
| Non-empty | Reject `""` |
| Pattern | `^[a-z0-9]+(?:-[a-z0-9]+)*$` (e.g. `react`, `coding-standards`) |
| Unique in one article | Duplicate identities fail validation |
| Display | Derived, not stored: hyphen → space; capitalize each word |

Unknown keys on the article → validation failure (strict). Nested tag objects → failure.

### Tag (derived)

Not a separate file. Identity = the stored string. Display label = `formatTagLabel(identity)`. Many articles may share an identity.

### Home tag list (derived)

| Field | Source |
|-------|--------|
| identities | Unique `tags` from articles with `published === true`, sorted `localeCompare` |
| Show all | Always a member of the control set when this list is shown; not a stored tag |

If the unique set is empty, the home tag list is **not** modeled in the UI (omit chrome).

### ArticleListItem (home view model)

| Field | Source |
|-------|--------|
| `slug` | filename |
| `title` | article.title |
| `description` | article.description |
| `publishDate` | article.publishDate |
| `href` | `/articles/{slug}` |
| **`tags`** | article.tags (empty array if none) |

Sort of listings: unchanged (`publishDate` desc, then `slug` asc). Filter (optional): keep items whose `tags` include the active identity.

### Active tag filter (ephemeral)

| State | Address | Listings | Current control |
|-------|---------|----------|-----------------|
| Unfiltered | `/` | All published | Show all |
| Filtered | `/?tag={identity}` | Published articles that include `identity` | That topic tag |
| Unknown / stale identity | `/?tag={identity}` | Empty published list | That identity is **not** in the tag list; Show all is not current; empty copy shown |

No persistence beyond the URL.

## Relationships

- ArticleFile `tags[]` —many-to-many (by shared identity)→ other ArticleFiles
- Home tag list —derived from→ published ArticleFiles only
- `/?tag=` —filters→ published ArticleListItems
- Article page chip —navigates to→ `/?tag={identity}` (always apply, never toggle)

## Validation rules (additive)

1. All prior article/block rules still apply.
2. `tags` if present: array of identity strings matching the pattern; unique; strict (no objects).
3. Omitted `tags` is valid.
4. `published === true` still requires `publishDate`; tags do not affect that rule.
5. Draft-only identities do not appear on the home tag list (runtime derivation, not a schema rule).

## State

| Article `published` | Home list | Home tag list | Filtered results | Page |
|---------------------|-----------|---------------|------------------|------|
| false | no | identities ignored | no | Draft chip + topic chips if tags present |
| true | yes (unless filtered out) | identities included | yes if tag matches | Topic chips |

Indexability: drafts `noindex` unchanged. Filtered home is the same document as `/` (canonical `/`).
