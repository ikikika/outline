import type { Article } from "@/lib/schema/article";
import { loadAllArticles } from "@/lib/articles/load";

export type ArticleListItem = {
  slug: string;
  title: string;
  description: string;
  publishDate: string;
  href: string;
};

function comparePublished(a: Article, b: Article): number {
  const dateA = a.publishDate ?? "";
  const dateB = b.publishDate ?? "";
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return a.slug.localeCompare(b.slug);
}

export function listPublishedArticles(): ArticleListItem[] {
  return loadAllArticles()
    .filter((article) => article.published)
    .sort(comparePublished)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      publishDate: article.publishDate as string,
      href: `/articles/${article.slug}`,
    }));
}

export function listPublishedSlugs(): string[] {
  return listPublishedArticles().map((item) => item.slug);
}
