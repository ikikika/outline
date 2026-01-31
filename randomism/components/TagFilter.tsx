import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { formatTagLabel, listPublishedTags } from "@/lib/articles/tags";

type TagFilterProps = {
  activeTag?: string;
};

export function TagFilter({ activeTag }: TagFilterProps) {
  const tags = listPublishedTags();
  if (tags.length === 0) {
    return null;
  }

  const showAllCurrent = activeTag === undefined;

  return (
    <Stack
      component="nav"
      aria-label="Filter articles by tag"
      direction="row"
      useFlexGap
      flexWrap="wrap"
      spacing={1}
      sx={{ alignItems: "center" }}
    >
      <Chip
        component={Link}
        href="/"
        clickable
        size="small"
        label="Show all"
        aria-label="Show all"
        color={showAllCurrent ? "primary" : "default"}
        variant={showAllCurrent ? "filled" : "outlined"}
        {...(showAllCurrent ? { "aria-current": "page" as const } : {})}
      />
      {tags.map((identity) => {
        const label = formatTagLabel(identity);
        const selected = activeTag === identity;
        return (
          <Chip
            key={identity}
            component={Link}
            href={selected ? "/" : `/?tag=${encodeURIComponent(identity)}`}
            clickable
            size="small"
            label={label}
            aria-label={label}
            color={selected ? "primary" : "default"}
            variant={selected ? "filled" : "outlined"}
            {...(selected ? { "aria-current": "page" as const } : {})}
          />
        );
      })}
    </Stack>
  );
}
