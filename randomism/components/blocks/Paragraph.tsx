import type { Block } from "@/lib/schema/article";

type ParagraphBlock = Extract<Block, { componentType: "Paragraph" }>;

export function Paragraph({ block }: { block: ParagraphBlock }) {
  return <p className="block-paragraph">{block.content}</p>;
}
