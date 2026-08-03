import Link from "next/link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ArticleListItem } from "@/lib/articles/list";

type ArticleListProps = {
  articles: ArticleListItem[];
};

export function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <Typography color="text.secondary">No published articles yet.</Typography>
    );
  }

  return (
    <List disablePadding sx={{ mx: -1 }}>
      {articles.map((article) => (
        <ListItemButton
          key={article.slug}
          component={Link}
          href={article.href}
          sx={{
            borderRadius: 1,
            alignItems: "flex-start",
            py: 1.5,
          }}
        >
          <ListItemText
            primary={
              <Typography component="span" variant="h6" sx={{ fontSize: "1.1rem" }}>
                {article.title}
              </Typography>
            }
            secondary={
              <Stack component="span" spacing={0.5} sx={{ mt: 0.5 }}>
                {article.description ? (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {article.description}
                  </Typography>
                ) : null}
                <Typography component="span" variant="caption" color="text.secondary">
                  {article.publishDate}
                </Typography>
              </Stack>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItemButton>
      ))}
    </List>
  );
}
