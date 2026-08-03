import Box from "@mui/material/Box";
import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type ParagraphBlock = Extract<Block, { componentType: "Paragraph" }>;

export function Paragraph({ block }: { block: ParagraphBlock }) {
  return (
    <Box
      sx={{
        color: "text.primary",
        "& p": { m: 0, mb: 1.5, "&:last-child": { mb: 0 } },
        "& a": { color: "primary.main" },
        "& code": {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.9em",
          px: 0.5,
          py: 0.15,
          borderRadius: 0.5,
          bgcolor: "action.hover",
        },
      }}
    >
      <MarkdownFull>{block.content}</MarkdownFull>
    </Box>
  );
}
