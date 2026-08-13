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
        "& table": {
          width: "100%",
          borderCollapse: "collapse",
          my: 1.5,
          fontSize: "0.9rem",
        },
        "& th, & td": {
          border: 1,
          borderColor: "divider",
          px: 1.25,
          py: 0.75,
          textAlign: "left",
          verticalAlign: "top",
        },
        "& th": {
          bgcolor: "action.hover",
          fontWeight: 600,
        },
      }}
    >
      <MarkdownFull>{block.content}</MarkdownFull>
    </Box>
  );
}
