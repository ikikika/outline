"use client";

import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import MuiAccordion from "@mui/material/Accordion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type AccordionBlock = Extract<Block, { componentType: "Accordion" }>;

const proseSx = {
  "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
  "& a": { color: "primary.main" },
  "& pre": {
    m: 0,
    mb: 1.5,
    p: 1.5,
    overflowX: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    bgcolor: "background.paper",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.875rem",
    lineHeight: 1.55,
    "&:last-child": { mb: 0 },
    "& code": {
      p: 0,
      bgcolor: "transparent",
      borderRadius: 0,
      fontSize: "inherit",
      whiteSpace: "inherit",
      overflowWrap: "inherit",
    },
  },
  "& :not(pre) > code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    px: 0.5,
    bgcolor: "action.hover",
    borderRadius: 0.5,
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
} as const;

export function Accordion({ block }: { block: AccordionBlock }) {
  return (
    <Box>
      {block.sections.map((section, index) => (
        <MuiAccordion
          key={`${section.title}-${index}`}
          defaultExpanded={section.defaultOpen === true}
          disableGutters
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            "&:not(:last-of-type)": { borderBottom: 0 },
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`accordion-panel-${index}-content`}
            id={`accordion-panel-${index}-header`}
          >
            <Box component="span" sx={{ ...proseSx, "& p": { m: 0 } }}>
              <MarkdownFull as="span">{section.title}</MarkdownFull>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={proseSx}>
              <MarkdownFull>{section.body}</MarkdownFull>
            </Box>
          </AccordionDetails>
        </MuiAccordion>
      ))}
    </Box>
  );
}
