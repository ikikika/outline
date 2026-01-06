import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArticleList } from "@/components/ArticleList";
import { listPublishedArticles } from "@/lib/articles/list";
import { defaultDescription } from "@/lib/site";

export default function HomePage() {
  const articles = listPublishedArticles();

  return (
    <Stack spacing={2}>
      <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", sm: "2rem" } }}>
        Articles
      </Typography>
      <Typography color="text.secondary">{defaultDescription}</Typography>
      <ArticleList articles={articles} />
    </Stack>
  );
}
