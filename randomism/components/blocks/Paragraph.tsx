import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type ParagraphBlock = Extract<Block, { componentType: "Paragraph" }>;

export function Paragraph({ block }: { block: ParagraphBlock }) {
  return (
    <MarkdownFull className="block-paragraph markdown-prose">
      {block.content}
    </MarkdownFull>
  );
}
