import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Block } from "@/lib/schema/article";
import { highlightCode } from "@/lib/codeHighlight";

type CodeBlockBlock = Extract<Block, { componentType: "CodeBlock" }>;

export function CodeBlock({ block }: { block: CodeBlockBlock }) {
  const highlighted = highlightCode(block.code, block.language);

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
            fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {block.language}
        </Typography>
      ) : null}
      <Box
        component="pre"
        className="hljs"
        sx={{
          m: 0,
          p: 1.5,
          overflowX: "hidden",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.875rem",
          lineHeight: 1.55,
        }}
      >
        <Box
          component="code"
          className={
            block.language ? `hljs language-${block.language}` : "hljs"
          }
          data-language={block.language}
          sx={{ whiteSpace: "inherit", overflowWrap: "inherit" }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </Box>
    </Paper>
  );
}
