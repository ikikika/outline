import type { Block } from "@/lib/schema/article";

type DividerBlock = Extract<Block, { componentType: "Divider" }>;

export function Divider({ block }: { block: DividerBlock }) {
  void block;
  return <hr className="block-divider" />;
}
