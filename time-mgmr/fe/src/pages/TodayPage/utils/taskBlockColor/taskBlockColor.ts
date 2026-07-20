function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Same activityId → same color; different activities → different colors. */
export function getTaskBlockColor(activityId: string): string {
  const normalizedId = activityId.trim().toLowerCase();
  const value = hashId(normalizedId) & 0x00ffffff;
  return `#${value.toString(16).padStart(6, '0')}`;
}
