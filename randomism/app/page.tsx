import Stack from "@mui/material/Stack";
import type { Metadata } from "next";
import { ArticleList } from "@/components/ArticleList";
import { TagFilter } from "@/components/TagFilter";
import { listPublishedArticles } from "@/lib/articles/list";
import { parseTagQuery } from "@/lib/articles/tags";

type HomePageProps = {
  searchParams: Promise<{ tag?: string | string[] }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: "/",
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeTag = parseTagQuery(params.tag);
  const articles = listPublishedArticles(
    activeTag === undefined ? {} : { tag: activeTag },
  );
  const emptyMessage =
    activeTag !== undefined
      ? "No matching articles."
      : "No published articles yet.";

  return (
    <Stack spacing={2}>
      <TagFilter activeTag={activeTag} />
      <ArticleList
        articles={articles}
        emptyMessage={emptyMessage}
        activeTag={activeTag}
      />
    </Stack>
  );
}
