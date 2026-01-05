import type { Block } from "@/lib/schema/article";

type CodeBlockBlock = Extract<Block, { componentType: "CodeBlock" }>;

export function CodeBlock({ block }: { block: CodeBlockBlock }) {
  return (
    <figure className="block-code">
      {block.language ? (
        <figcaption className="block-code-lang">{block.language}</figcaption>
      ) : null}
      <pre className="block-code-pre">
        <code data-language={block.language}>{block.code}</code>
      </pre>
    </figure>
  );
}
