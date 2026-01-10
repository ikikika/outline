import type { ComponentType } from "react";
import type { Block } from "@/lib/schema/article";
import { Heading } from "@/components/blocks/Heading";
import { Paragraph } from "@/components/blocks/Paragraph";
import { ImageBlock } from "@/components/blocks/ImageBlock";
import { CodeBlock } from "@/components/blocks/CodeBlock";
import { Accordion } from "@/components/blocks/Accordion";
import { Blockquote } from "@/components/blocks/Blockquote";
import { List } from "@/components/blocks/List";
import { Callout } from "@/components/blocks/Callout";
import { Divider } from "@/components/blocks/Divider";
import { TableOfContents } from "@/components/blocks/TableOfContents";

type BlockProps<T extends Block = Block> = {
  block: T;
};

export const registry: {
  Heading: ComponentType<BlockProps<Extract<Block, { componentType: "Heading" }>>>;
  Paragraph: ComponentType<BlockProps<Extract<Block, { componentType: "Paragraph" }>>>;
  Image: ComponentType<BlockProps<Extract<Block, { componentType: "Image" }>>>;
  CodeBlock: ComponentType<BlockProps<Extract<Block, { componentType: "CodeBlock" }>>>;
  Accordion: ComponentType<BlockProps<Extract<Block, { componentType: "Accordion" }>>>;
  Blockquote: ComponentType<BlockProps<Extract<Block, { componentType: "Blockquote" }>>>;
  List: ComponentType<BlockProps<Extract<Block, { componentType: "List" }>>>;
  Callout: ComponentType<BlockProps<Extract<Block, { componentType: "Callout" }>>>;
  Divider: ComponentType<BlockProps<Extract<Block, { componentType: "Divider" }>>>;
  TableOfContents: ComponentType<
    BlockProps<Extract<Block, { componentType: "TableOfContents" }>>
  >;
} = {
  Heading,
  Paragraph,
  Image: ImageBlock,
  CodeBlock,
  Accordion,
  Blockquote,
  List,
  Callout,
  Divider,
  TableOfContents,
};
