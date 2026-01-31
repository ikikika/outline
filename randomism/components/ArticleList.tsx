import Link from "next/link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArticleTags } from "@/components/ArticleTags";
import type { ArticleListItem } from "@/lib/articles/list";

type ArticleListProps = {
  articles: ArticleListItem[];
  emptyMessage?: string;
  activeTag?: string;
};

export function ArticleList({
  articles,
  emptyMessage = "No published articles yet.",
  activeTag,
}: ArticleListProps) {
  if (articles.length === 0) {
    return <Typography color="text.secondary">{emptyMessage}</Typography>;
  }

  return (
    <List disablePadding sx={{ mx: -1 }}>
      {articles.map((article) => (
        <ListItem
          key={article.slug}
          alignItems="flex-start"
          sx={{
            display: "block",
            borderRadius: 1,
            py: 1.5,
            px: 1,
          }}
        >
          <Typography
            component={Link}
            href={article.href}
            variant="h6"
            sx={{
              fontSize: "1.1rem",
              color: "inherit",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {article.title}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {article.description ? (
              <Typography variant="body2" color="text.secondary">
                {article.description}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {article.publishDate}
            </Typography>
            <ArticleTags
              tags={article.tags}
              linkMode="toggle"
              activeTag={activeTag}
            />
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
