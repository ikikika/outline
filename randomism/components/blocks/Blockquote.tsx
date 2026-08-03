import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type BlockquoteBlock = Extract<Block, { componentType: "Blockquote" }>;

export function Blockquote({ block }: { block: BlockquoteBlock }) {
  return (
    <Box
      component="blockquote"
      sx={{
        m: 0,
        pl: 2,
        py: 0.5,
        borderLeft: 3,
        borderColor: "primary.main",
        color: "text.primary",
        "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
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
      <MarkdownFull>{block.text}</MarkdownFull>
      {block.cite ? (
        <Typography
          component="cite"
          variant="body2"
          color="text.secondary"
          sx={{ display: "block", mt: 1, fontStyle: "normal" }}
        >
          {block.cite}
        </Typography>
      ) : null}
    </Box>
  );
}
