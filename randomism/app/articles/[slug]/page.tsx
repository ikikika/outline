import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import {
  loadAllArticles,
  loadPublishedArticleBySlug,
} from "@/lib/articles/load";
import { listPublishedSlugs } from "@/lib/articles/list";
import { getSiteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  // Touch all articles so invalid drafts fail the build
  loadAllArticles();
  return listPublishedSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = loadPublishedArticleBySlug(slug);
  if (!article) {
    return { title: "Not found" };
  }

  const canonicalPath = `/articles/${article.slug}`;
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonicalUrl,
      type: "article",
      ...(article.ogImage ? { images: [article.ogImage] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = loadPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  return (
    <article>
      <header>
        <p className="article-list-meta">
          <time dateTime={article.publishDate}>{article.publishDate}</time>
        </p>
      </header>
      <BlockRenderer blocks={article.blocks} />
    </article>
  );
}
