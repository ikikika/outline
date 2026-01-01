import type { Block } from "@/lib/schema/article";
import { registry } from "@/components/registry";

type BlockRendererProps = {
  blocks: Block[];
};

export function BlockRenderer({ blocks }: BlockRendererProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.componentType}-${index}`;

        switch (block.componentType) {
          case "Heading": {
            const Component = registry.Heading;
            return <Component key={key} block={block} />;
          }
          case "Paragraph": {
            const Component = registry.Paragraph;
            return <Component key={key} block={block} />;
          }
          case "Image": {
            const Component = registry.Image;
            return <Component key={key} block={block} />;
          }
          default: {
            const unknownType = (block as { componentType?: string })
              .componentType;
            if (isDev) {
              return (
                <aside
                  key={key}
                  className="unknown-block"
                  role="note"
                >{`Unknown componentType: ${String(unknownType)}`}</aside>
              );
            }
            console.error(
              `Unknown componentType skipped in production: ${String(unknownType)}`,
            );
            return null;
          }
        }
      })}
    </>
  );
}
