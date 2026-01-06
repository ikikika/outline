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
  "& code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    px: 0.5,
    bgcolor: "action.hover",
    borderRadius: 0.5,
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
