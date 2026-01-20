import type { Components } from "react-markdown";
import type { PluggableList } from "unified";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownHighlightAliases } from "@/lib/codeHighlight";

type MarkdownProps = {
  children: string;
  className?: string;
  as?: "div" | "span";
};

const fullComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  ),
};

const remarkPlugins: PluggableList = [remarkGfm];

const highlightPlugins: PluggableList = [
  [rehypeHighlight, { aliases: markdownHighlightAliases }],
];

/** Full CommonMark + GFM (tables, strikethrough, etc.) → React. Raw HTML is not rendered. */
export function MarkdownFull({
  children,
  className,
  as: Tag = "div",
}: MarkdownProps) {
  return (
    <Tag className={className}>
      <ReactMarkdown
        components={fullComponents}
        remarkPlugins={remarkPlugins}
        rehypePlugins={highlightPlugins}
      >
        {children}
      </ReactMarkdown>
    </Tag>
  );
}

const inlineAllowed = ["strong", "em", "a", "code", "br", "del", "p"] as const;

/** Phrasing-only Markdown for List items (structure owned by the List block). */
export function MarkdownInline({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={[...inlineAllowed]}
      unwrapDisallowed
      components={{
        ...fullComponents,
        p: ({ children: pChildren }) => <>{pChildren}</>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
