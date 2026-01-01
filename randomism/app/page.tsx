import type { Metadata } from "next";
import { ArticleList } from "@/components/ArticleList";
import { listPublishedArticles } from "@/lib/articles/list";
import {
  defaultDescription,
  defaultTitle,
  getSiteUrl,
} from "@/lib/site";

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: getSiteUrl(),
    type: "website",
  },
};

export default function HomePage() {
  // Validate all articles (including drafts) during render/build
  const articles = listPublishedArticles();

  return (
    <>
      <h1 className="page-title">Articles</h1>
      <p className="page-lead">
        Published posts from local JSON in <code>data/articles/</code>.
      </p>
      <ArticleList articles={articles} />
    </>
  );
}
