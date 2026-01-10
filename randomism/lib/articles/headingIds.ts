import type { Block } from "@/lib/schema/article";

type HeadingBlock = Extract<Block, { componentType: "Heading" }>;

export type BlockWithResolvedHeadingIds = Block | (HeadingBlock & { id: string });

/** Slugify heading text into a bare fragment id candidate. */
export function slugifyHeading(content: string): string {
  const slug = content
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "section";
}

/**
 * Assign unique fragment ids to every Heading in an article block list.
 * Explicit `id` wins; otherwise derive from content and suffix `-2`, `-3`, …
 */
export function assignHeadingIds(blocks: Block[]): BlockWithResolvedHeadingIds[] {
  const used = new Set<string>();

  return blocks.map((block) => {
    if (block.componentType !== "Heading") {
      return block;
    }

    const base = block.id ?? slugifyHeading(block.content);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    used.add(candidate);

    return { ...block, id: candidate };
  });
}
