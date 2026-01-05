import type { Block } from "@/lib/schema/article";
import { MarkdownFull } from "@/components/markdown/Markdown";

type CalloutBlock = Extract<Block, { componentType: "Callout" }>;

const VARIANT_LABEL: Record<CalloutBlock["variant"], string> = {
  info: "Info",
  tip: "Tip",
  warning: "Warning",
};

export function Callout({ block }: { block: CalloutBlock }) {
  return (
    <aside
      className={`block-callout block-callout--${block.variant}`}
      role="note"
      data-variant={block.variant}
    >
      <p className="block-callout-label">{VARIANT_LABEL[block.variant]}</p>
      <MarkdownFull className="markdown-prose">{block.body}</MarkdownFull>
    </aside>
  );
}
