import Typography from "@mui/material/Typography";
import type { Block } from "@/lib/schema/article";

type HeadingBlock = Extract<Block, { componentType: "Heading" }> & {
  id?: string;
};

const variantByLevel = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

const componentByLevel = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export function Heading({ block }: { block: HeadingBlock }) {
  return (
    <Typography
      id={block.id}
      component={componentByLevel[block.level]}
      variant={variantByLevel[block.level]}
      sx={{
        scrollMarginTop: "5rem",
        // Theme defaults make h3 (3rem) larger than our article-tuned h2 (~1.4rem).
        // Keep a strict visual hierarchy: h1 > h2 > h3 > …
        fontSize: {
          1: { xs: "1.5rem", sm: "1.75rem" },
          2: { xs: "1.25rem", sm: "1.4rem" },
          3: { xs: "1.1rem", sm: "1.2rem" },
          4: { xs: "1rem", sm: "1.05rem" },
          5: "0.95rem",
          6: "0.9rem",
        }[block.level],
        mt: block.level <= 2 ? 1 : 0.5,
      }}
    >
      {block.content}
    </Typography>
  );
}
