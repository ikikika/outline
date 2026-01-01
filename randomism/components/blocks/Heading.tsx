import type { Block } from "@/lib/schema/article";

type HeadingBlock = Extract<Block, { componentType: "Heading" }>;

const headingTags = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export function Heading({ block }: { block: HeadingBlock }) {
  const Tag = headingTags[block.level];
  return <Tag className="block-heading">{block.content}</Tag>;
}
