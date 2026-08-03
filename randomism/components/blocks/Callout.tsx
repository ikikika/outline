import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type CalloutBlock = Extract<Block, { componentType: "Callout" }>;

const VARIANT_LABEL: Record<CalloutBlock["variant"], string> = {
  info: "Info",
  tip: "Tip",
  warning: "Warning",
};

const severityByVariant = {
  info: "info",
  tip: "success",
  warning: "warning",
} as const;

export function Callout({ block }: { block: CalloutBlock }) {
  return (
    <Alert
      severity={severityByVariant[block.variant]}
      role="note"
      data-variant={block.variant}
      sx={{ alignItems: "flex-start" }}
    >
      <AlertTitle sx={{ mb: 0.5 }}>{VARIANT_LABEL[block.variant]}</AlertTitle>
      <Box
        sx={{
          "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
          "& a": { color: "inherit", textDecoration: "underline" },
          "& code": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.9em",
          },
        }}
      >
        <MarkdownFull>{block.body}</MarkdownFull>
      </Box>
    </Alert>
  );
}
