import fs from "node:fs";
import {
  articleDocumentSchema,
  type Article,
} from "@/lib/schema/article";
import {
  discoverArticleFiles,
  slugFromFilename,
} from "@/lib/articles/discover";

export function loadArticleFromFile(filePath: string): Article {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read article file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const result = articleDocumentSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Schema validation failed for ${filePath}: ${details}`);
  }

  const slug = slugFromFilename(filePath);
  return { ...result.data, slug };
}

/** Load and validate every `data/articles/*.json` (including drafts). Fails build on error. */
export function loadAllArticles(): Article[] {
  const files = discoverArticleFiles();
  const articles: Article[] = [];
  const seen = new Set<string>();

  for (const filePath of files) {
    const article = loadArticleFromFile(filePath);
    if (seen.has(article.slug)) {
      throw new Error(`Duplicate article slug "${article.slug}"`);
    }
    seen.add(article.slug);
    articles.push(article);
  }

  return articles;
}

export function loadArticleBySlug(slug: string): Article | null {
  return loadAllArticles().find((article) => article.slug === slug) ?? null;
}

export function loadPublishedArticleBySlug(slug: string): Article | null {
  const match = loadArticleBySlug(slug);
  if (!match || !match.published) {
    return null;
  }
  return match;
}
