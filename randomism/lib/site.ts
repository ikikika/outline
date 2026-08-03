export const siteName = "Randomism";

export const defaultTitle = "Randomism — Articles";

export const defaultDescription =
  "A JSON-driven blog of articles on Randomism.";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3000";
}
