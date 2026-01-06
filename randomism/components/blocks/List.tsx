import Box from "@mui/material/Box";
import type { Block } from "@/lib/schema/article";
import { MarkdownInline } from "@/components/markdown/Markdown";

type ListBlock = Extract<Block, { componentType: "List" }>;

export function List({ block }: { block: ListBlock }) {
  return (
    <Box
      component={block.ordered ? "ol" : "ul"}
      sx={{
        m: 0,
        pl: 3,
        color: "text.primary",
        "& li": { mb: 0.75 },
        "& a": { color: "primary.main" },
        "& code": {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.9em",
          px: 0.5,
          bgcolor: "action.hover",
          borderRadius: 0.5,
        },
      }}
    >
      {block.items.map((item, index) => (
        <Box component="li" key={`${index}-${item.slice(0, 24)}`}>
          <MarkdownInline>{item}</MarkdownInline>
        </Box>
      ))}
    </Box>
  );
}
