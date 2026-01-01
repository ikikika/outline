import Image from "next/image";
import type { Block } from "@/lib/schema/article";

type ImageBlockType = Extract<Block, { componentType: "Image" }>;

export function ImageBlock({ block }: { block: ImageBlockType }) {
  return (
    <figure className="block-image">
      <Image
        src={block.content.src}
        alt={block.content.alt}
        width={1200}
        height={675}
        sizes="(max-width: 768px) 100vw, 720px"
        style={{ width: "100%", height: "auto" }}
      />
    </figure>
  );
}
