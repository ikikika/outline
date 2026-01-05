import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type AccordionBlock = Extract<Block, { componentType: "Accordion" }>;

export function Accordion({ block }: { block: AccordionBlock }) {
  return (
    <div className="block-accordion">
      {block.sections.map((section, index) => (
        <details
          key={`${section.title}-${index}`}
          className="block-accordion-item"
          open={section.defaultOpen === true ? true : undefined}
        >
          <summary className="block-accordion-summary">
            <MarkdownFull
              as="span"
              className="block-accordion-title markdown-prose"
            >
              {section.title}
            </MarkdownFull>
          </summary>
          <div className="block-accordion-body">
            <MarkdownFull className="markdown-prose">{section.body}</MarkdownFull>
          </div>
        </details>
      ))}
    </div>
  );
}
