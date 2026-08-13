import { loadAllArticles } from "@/lib/articles/load";

export type MatchMode = "and" | "or";

export function formatTagLabel(identity: string): string {
  return identity
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/** All `tag` query values → unique non-empty strings (first-seen order). */
export function parseTagSelection(
  tag: string | string[] | undefined,
): string[] {
  const raw = tag === undefined ? [] : Array.isArray(tag) ? tag : [tag];
  const seen = new Set<string>();
  const identities: string[] = [];

  for (const value of raw) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    identities.push(value);
  }

  return identities;
}

/** `match=or` → or; omit / unknown → and. */
export function parseMatchMode(
  match: string | string[] | undefined,
): MatchMode {
  const first = Array.isArray(match) ? match[0] : match;
  return first === "or" ? "or" : "and";
}

/**
 * @deprecated Prefer `parseTagSelection`. Kept for single-tag callers.
 */
export function parseTagQuery(
  tag: string | string[] | undefined,
): string | undefined {
  return parseTagSelection(tag)[0];
}

export function toggleTagInSelection(
  selected: string[],
  identity: string,
): string[] {
  if (selected.includes(identity)) {
    return selected.filter((id) => id !== identity);
  }
  return [...selected, identity];
}

/** Build home filter href; empty tags → `/` (AND) or `/?match=or` (OR). */
export function buildHomeFilterHref(options: {
  tags: string[];
  match: MatchMode;
}): string {
  const unique = [...new Set(options.tags.filter((id) => id.length > 0))];
  const sorted = unique.sort((a, b) => a.localeCompare(b));
  const params = new URLSearchParams();

  for (const id of sorted) {
    params.append("tag", id);
  }

  if (options.match === "or") {
    params.set("match", "or");
  }

  const query = params.toString();
  return query.length === 0 ? "/" : `/?${query}`;
}

/** Unique tag identities from published articles, sorted alphabetically. */
export function listPublishedTags(): string[] {
  const identities = new Set<string>();

  for (const article of loadAllArticles()) {
    if (!article.published) {
      continue;
    }
    for (const tag of article.tags) {
      identities.add(tag);
    }
  }

  return [...identities].sort((a, b) => a.localeCompare(b));
}
