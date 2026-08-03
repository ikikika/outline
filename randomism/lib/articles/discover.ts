import fs from "node:fs";
import path from "node:path";

const ARTICLES_DIR = path.join(process.cwd(), "data", "articles");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getArticlesDirectory(): string {
  return ARTICLES_DIR;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/** Non-recursive: only `data/articles/*.json`. Non-json files ignored. */
export function discoverArticleFiles(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(ARTICLES_DIR, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json")) continue;
    files.push(path.join(ARTICLES_DIR, entry.name));
  }

  return files.sort();
}

export function slugFromFilename(filePath: string): string {
  const base = path.basename(filePath, ".json");
  if (!isValidSlug(base)) {
    throw new Error(
      `Invalid article filename stem "${base}" in ${filePath}. Use lowercase kebab-case (e.g. welcome.json).`,
    );
  }
  return base;
}
