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
        fontSize:
          block.level === 1
            ? { xs: "1.5rem", sm: "1.75rem" }
            : block.level === 2
              ? { xs: "1.25rem", sm: "1.4rem" }
              : undefined,
        mt: block.level <= 2 ? 1 : 0.5,
      }}
    >
      {block.content}
    </Typography>
  );
}
