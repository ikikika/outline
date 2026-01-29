import type { Article } from "@/lib/schema/article";
import { loadAllArticles } from "@/lib/articles/load";

export type ArticleListItem = {
  slug: string;
  title: string;
  description: string;
  publishDate: string;
  href: string;
  tags: string[];
};

export type ListPublishedArticlesOptions = {
  tag?: string;
};

function comparePublished(a: Article, b: Article): number {
  const dateA = a.publishDate ?? "";
  const dateB = b.publishDate ?? "";
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return a.slug.localeCompare(b.slug);
}

export function listPublishedArticles(
  options: ListPublishedArticlesOptions = {},
): ArticleListItem[] {
  const { tag } = options;

  return loadAllArticles()
    .filter((article) => {
      if (!article.published) {
        return false;
      }
      const matchesTag = tag === undefined || article.tags.includes(tag);
      return matchesTag;
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
