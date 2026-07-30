/** Compare two items by sortOrder (ascending), tie-break on title. */
export function sortBySortOrder(
  a: { sortOrder?: number; title: string },
  b: { sortOrder?: number; title: string }
): number {
  const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || a.title.localeCompare(b.title);
}
