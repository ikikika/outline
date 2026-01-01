import type { ComponentType } from "react";
import type { Block } from "@/lib/schema/article";
import { Heading } from "@/components/blocks/Heading";
import { Paragraph } from "@/components/blocks/Paragraph";
import { ImageBlock } from "@/components/blocks/ImageBlock";

type BlockProps<T extends Block = Block> = {
  block: T;
};

export const registry: {
  Heading: ComponentType<BlockProps<Extract<Block, { componentType: "Heading" }>>>;
  Paragraph: ComponentType<BlockProps<Extract<Block, { componentType: "Paragraph" }>>>;
  Image: ComponentType<BlockProps<Extract<Block, { componentType: "Image" }>>>;
} = {
  Heading,
  Paragraph,
  Image: ImageBlock,
};
