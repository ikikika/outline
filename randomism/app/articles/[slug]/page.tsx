import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToTop } from "@/components/BackToTop";
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
    <Stack component="article" spacing={2.5} sx={{ pb: "100px" }}>
      <Stack component="header" spacing={1.5}>
        {!article.published ? (
          <Chip label="Draft" color="warning" size="small" sx={{ alignSelf: "flex-start" }} />
        ) : null}
        <Typography
          component="h1"
          variant="h1"
          sx={{ fontSize: { xs: "1.75rem", sm: "2.25rem" }, lineHeight: 1.2 }}
        >
          {article.title}
        </Typography>
        {article.publishDate ? (
          <Typography variant="body2" color="text.secondary" component="p">
            <time dateTime={article.publishDate}>{article.publishDate}</time>
          </Typography>
        ) : null}
      </Stack>
      <Stack spacing={2.5} component="div">
        <BlockRenderer blocks={article.blocks} />
      </Stack>
      <BackToTop />
    </Stack>
  );
}
