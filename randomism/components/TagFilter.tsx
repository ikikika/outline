import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import {
  buildHomeFilterHref,
  formatTagLabel,
  listPublishedTags,
  type MatchMode,
} from "@/lib/articles/tags";

type TagFilterProps = {
  selectedTags: string[];
  match: MatchMode;
};

export function TagFilter({ selectedTags, match }: TagFilterProps) {
  const tags = listPublishedTags();
  if (tags.length === 0) {
    return null;
  }

  const showAllCurrent = selectedTags.length === 0;
  const matchAllCurrent = match === "and";
  const matchAnyCurrent = match === "or";

  return (
    <Stack spacing={1.5}>
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
          const selected = selectedTags.includes(identity);
          const nextTags = selected
            ? selectedTags.filter((id) => id !== identity)
            : [...selectedTags, identity];
          const href =
            nextTags.length === 0
              ? "/"
              : buildHomeFilterHref({ tags: nextTags, match });

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
      <Stack
        component="nav"
        aria-label="Match mode"
        direction="row"
        useFlexGap
        flexWrap="wrap"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        <Chip
          component={Link}
          href={buildHomeFilterHref({ tags: selectedTags, match: "and" })}
          clickable
          size="small"
          label="Match all"
          aria-label="Match all"
          color={matchAllCurrent ? "primary" : "default"}
          variant={matchAllCurrent ? "filled" : "outlined"}
          {...(matchAllCurrent ? { "aria-current": "page" as const } : {})}
        />
        <Chip
          component={Link}
          href={buildHomeFilterHref({ tags: selectedTags, match: "or" })}
          clickable
          size="small"
          label="Match any"
          aria-label="Match any"
          color={matchAnyCurrent ? "primary" : "default"}
          variant={matchAnyCurrent ? "filled" : "outlined"}
          {...(matchAnyCurrent ? { "aria-current": "page" as const } : {})}
        />
      </Stack>
    </Stack>
  );
}
