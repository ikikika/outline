import Stack from "@mui/material/Stack";
import type { Metadata } from "next";
import { ArticleList } from "@/components/ArticleList";
import { TagFilter } from "@/components/TagFilter";
import { listPublishedArticles } from "@/lib/articles/list";
import {
  listPublishedTags,
  parseMatchMode,
  parseTagSelection,
} from "@/lib/articles/tags";

type HomePageProps = {
  searchParams: Promise<{
    tag?: string | string[];
    match?: string | string[];
  }>;
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
  const selection = parseTagSelection(params.tag);
  const match = parseMatchMode(params.match);
  const publishedTags = new Set(listPublishedTags());
  const publishedSelected = selection.filter((id) => publishedTags.has(id));
  const filterActive = selection.length > 0;
  const articles = listPublishedArticles(
    filterActive ? { tags: selection, match } : {},
  );
  const emptyMessage = filterActive
    ? "No matching articles."
    : "No published articles yet.";

  return (
    <Stack spacing={2}>
      <TagFilter selectedTags={publishedSelected} match={match} />
      <ArticleList
        articles={articles}
        emptyMessage={emptyMessage}
        selectedTags={publishedSelected}
        match={match}
      />
    </Stack>
  );
}
