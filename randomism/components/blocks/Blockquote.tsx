import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type BlockquoteBlock = Extract<Block, { componentType: "Blockquote" }>;

export function Blockquote({ block }: { block: BlockquoteBlock }) {
  return (
    <blockquote className="block-blockquote">
      <MarkdownFull className="markdown-prose">{block.text}</MarkdownFull>
      {block.cite ? <cite className="block-blockquote-cite">{block.cite}</cite> : null}
    </blockquote>
  );
}
