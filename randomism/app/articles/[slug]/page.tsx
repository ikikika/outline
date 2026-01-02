import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { loadAllArticles, loadArticleBySlug } from "@/lib/articles/load";
import { listAllSlugs } from "@/lib/articles/list";
import { getSiteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  // Touch all articles so invalid drafts fail the build
  loadAllArticles();
  return listAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = loadArticleBySlug(slug);
  if (!article) {
    return { title: "Not found" };
  }

  const canonicalPath = `/articles/${article.slug}`;
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;
  const title = article.published
    ? article.title
    : `${article.title} (Draft)`;

  return {
    title,
    description: article.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description: article.description,
      url: canonicalUrl,
      type: "article",
      ...(article.ogImage ? { images: [article.ogImage] } : {}),
    },
    ...(article.published
      ? {}
      : {
          robots: {
            index: false,
            follow: false,
          },
        }),
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = loadArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  return (
    <article>
      <header className="article-header">
        {!article.published ? (
          <p className="draft-tag" role="status">
            Draft
          </p>
        ) : null}
        {article.publishDate ? (
          <p className="article-list-meta">
            <time dateTime={article.publishDate}>{article.publishDate}</time>
          </p>
        ) : null}
      </header>
      <BlockRenderer blocks={article.blocks} />
    </article>
  );
}
