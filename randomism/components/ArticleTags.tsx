import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { formatTagLabel } from "@/lib/articles/tags";

type ArticleTagsProps = {
  tags: string[];
  /** Article pages always apply a filter (`/?tag=`). Home toggle arrives in US3. */
  linkMode?: "apply";
};

export function ArticleTags({ tags }: ArticleTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <Stack
      component="nav"
      aria-label="Topics"
      direction="row"
      useFlexGap
      flexWrap="wrap"
      spacing={1}
      sx={{ alignItems: "center" }}
    >
      {tags.map((identity) => {
        const label = formatTagLabel(identity);
        return (
          <Chip
            key={identity}
            component={Link}
            href={`/?tag=${encodeURIComponent(identity)}`}
            clickable
            size="small"
            variant="outlined"
            label={label}
            aria-label={label}
          />
        );
      })}
    </Stack>
  );
}
