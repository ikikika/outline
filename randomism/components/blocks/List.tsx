import type { Block } from "@/lib/schema/article";
import { MarkdownInline } from "@/components/markdown/Markdown";

type ListBlock = Extract<Block, { componentType: "List" }>;

export function List({ block }: { block: ListBlock }) {
  const Tag = block.ordered ? "ol" : "ul";

  return (
    <Tag className="block-list">
      {block.items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`}>
          <MarkdownInline>{item}</MarkdownInline>
        </li>
      ))}
    </Tag>
  );
}
