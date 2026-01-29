import { loadAllArticles } from "@/lib/articles/load";

export function formatTagLabel(identity: string): string {
  return identity
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function parseTagQuery(
  tag: string | string[] | undefined,
): string | undefined {
  const first = Array.isArray(tag) ? tag[0] : tag;
  if (typeof first !== "string" || first.length === 0) {
    return undefined;
  }
  return first;
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
