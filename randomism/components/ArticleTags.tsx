import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import {
  buildHomeFilterHref,
  formatTagLabel,
  toggleTagInSelection,
  type MatchMode,
} from "@/lib/articles/tags";

type ArticleTagsProps = {
  tags: string[];
  /** `apply`: always `/?tag=`. `toggle`: add/remove against current selection. */
  linkMode?: "apply" | "toggle";
  selectedTags?: string[];
  match?: MatchMode;
};

export function ArticleTags({
  tags,
  linkMode = "apply",
  selectedTags = [],
  match = "and",
}: ArticleTagsProps) {
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
        const selected =
          linkMode === "toggle" && selectedTags.includes(identity);

        let href: string;
        if (linkMode === "apply") {
          href = `/?tag=${encodeURIComponent(identity)}`;
        } else {
          const nextTags = toggleTagInSelection(selectedTags, identity);
          href =
            nextTags.length === 0
              ? "/"
              : buildHomeFilterHref({ tags: nextTags, match });
        }

        return (
          <Chip
            key={identity}
            component={Link}
            href={href}
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
