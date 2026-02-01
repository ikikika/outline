import type { Article } from "@/lib/schema/article";
import { loadAllArticles } from "@/lib/articles/load";
import type { MatchMode } from "@/lib/articles/tags";

export type ArticleListItem = {
  slug: string;
  title: string;
  description: string;
  publishDate: string;
  href: string;
  tags: string[];
};

export type ListPublishedArticlesOptions = {
  tags?: string[];
  match?: MatchMode;
};

function comparePublished(a: Article, b: Article): number {
  const dateA = a.publishDate ?? "";
  const dateB = b.publishDate ?? "";
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return a.slug.localeCompare(b.slug);
}

function matchesTagFilter(
  articleTags: string[],
  filterTags: string[],
  match: MatchMode,
): boolean {
  if (filterTags.length === 0) {
    return true;
  }
  if (match === "or") {
    return filterTags.some((tag) => articleTags.includes(tag));
  }
  return filterTags.every((tag) => articleTags.includes(tag));
}

export function listPublishedArticles(
  options: ListPublishedArticlesOptions = {},
): ArticleListItem[] {
  const filterTags = options.tags ?? [];
  const match: MatchMode = options.match ?? "and";

  return loadAllArticles()
    .filter((article) => {
      if (!article.published) {
        return false;
      }
      return matchesTagFilter(article.tags, filterTags, match);
    })
    .sort(comparePublished)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      publishDate: article.publishDate as string,
      href: `/articles/${article.slug}`,
      tags: article.tags,
    }));
}

export function listPublishedSlugs(): string[] {
  return listPublishedArticles().map((item) => item.slug);
}

/** All article slugs (published and draft) for static generation. */
export function listAllSlugs(): string[] {
  return loadAllArticles()
    .map((article) => article.slug)
    .sort((a, b) => a.localeCompare(b));
}
