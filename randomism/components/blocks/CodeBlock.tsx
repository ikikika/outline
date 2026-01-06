import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Block } from "@/lib/schema/article";

type CodeBlockBlock = Extract<Block, { componentType: "CodeBlock" }>;

export function CodeBlock({ block }: { block: CodeBlockBlock }) {
  return (
    <Paper
      component="figure"
      variant="outlined"
      sx={{
        m: 0,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {block.language ? (
        <Typography
          component="figcaption"
          variant="caption"
          sx={{
            display: "block",
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            color: "text.secondary",
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          }}
        >
          {block.language}
        </Typography>
      ) : null}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          overflowX: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.875rem",
          lineHeight: 1.55,
        }}
      >
        <Box component="code" data-language={block.language}>
          {block.code}
        </Box>
      </Box>
    </Paper>
  );
}
