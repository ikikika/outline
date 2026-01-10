import { z } from "zod";

const bareFragmentIdSchema = z
  .string()
  .min(1)
  .refine((value) => !/[/#:]/.test(value), {
    message: "Fragment id must be bare (no #, /, or :)",
  });

const headingBlockSchema = z
  .object({
    componentType: z.literal("Heading"),
    level: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    content: z.string().min(1),
    id: bareFragmentIdSchema.optional(),
  })
  .strict();

const paragraphBlockSchema = z
  .object({
    componentType: z.literal("Paragraph"),
    content: z.string().min(1),
  })
  .strict();

const imageBlockSchema = z
  .object({
    componentType: z.literal("Image"),
    content: z
      .object({
        src: z.string().min(1),
        alt: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const codeBlockSchema = z
  .object({
    componentType: z.literal("CodeBlock"),
    code: z.string().min(1),
    language: z.string().min(1).optional(),
  })
  .strict();

const accordionSectionSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
    defaultOpen: z.boolean().optional(),
  })
  .strict();

const accordionBlockSchema = z
  .object({
    componentType: z.literal("Accordion"),
    sections: z.array(accordionSectionSchema).min(1),
  })
  .strict();

const blockquoteBlockSchema = z
  .object({
    componentType: z.literal("Blockquote"),
    text: z.string().min(1),
    cite: z.string().min(1).optional(),
  })
  .strict();

const listBlockSchema = z
  .object({
    componentType: z.literal("List"),
    ordered: z.boolean(),
    items: z.array(z.string().min(1)).min(1),
  })
  .strict();

const calloutBlockSchema = z
  .object({
    componentType: z.literal("Callout"),
    variant: z.enum(["info", "tip", "warning"]),
    body: z.string().min(1),
  })
  .strict();

const dividerBlockSchema = z
  .object({
    componentType: z.literal("Divider"),
  })
  .strict();

const tocItemSchema = z
  .object({
    label: z.string().min(1),
    href: bareFragmentIdSchema,
  })
  .strict();

const tableOfContentsBlockSchema = z
  .object({
    componentType: z.literal("TableOfContents"),
    items: z.array(tocItemSchema).min(1),
  })
  .strict();

export const blockSchema = z.discriminatedUnion("componentType", [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  codeBlockSchema,
  accordionBlockSchema,
  blockquoteBlockSchema,
  listBlockSchema,
  calloutBlockSchema,
  dividerBlockSchema,
  tableOfContentsBlockSchema,
]);

export const articleDocumentSchema = z
  .object({
    published: z.boolean(),
    publishDate: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().min(1),
    ogImage: z.string().min(1).optional(),
    blocks: z.array(blockSchema).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.published && !data.publishDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "publishDate is required when published is true",
        path: ["publishDate"],
      });
    }
  });

export type Block = z.infer<typeof blockSchema>;
export type ArticleDocument = z.infer<typeof articleDocumentSchema>;

export type Article = ArticleDocument & {
  slug: string;
};
