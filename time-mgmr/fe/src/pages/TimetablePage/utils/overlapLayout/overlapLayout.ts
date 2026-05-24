export interface ITimeInterval {
  id: string;
  start: number;
  end: number;
}

export interface IOverlapPlacement {
  column: number;
  columnCount: number;
}

/**
 * Assign side-by-side columns for overlapping time intervals.
 * Non-overlapping clusters are independent (each can use full width).
 */
export function assignOverlapColumns(
  items: ITimeInterval[]
): Map<string, IOverlapPlacement> {
  const result = new Map<string, IOverlapPlacement>();
  if (items.length === 0) return result;

  const sorted = [...items].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id)
  );

  let cluster: ITimeInterval[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const columnEnds: number[] = [];
    const columnsById = new Map<string, number>();

    for (const item of cluster) {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      columnsById.set(item.id, column);
    }

    const columnCount = Math.max(1, columnEnds.length);
    for (const item of cluster) {
      result.set(item.id, {
        column: columnsById.get(item.id) ?? 0,
        columnCount,
      });
    }

    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flushCluster();

  return result;
}

/**
 * For each block, the start minute of the next block sharing its column.
 * Used to cap a block's rendered height so the min-height clamp never makes a
 * short block visually overlap the sequential block that follows it.
 * Blocks with no following column neighbor map to Infinity.
 */
export function computeColumnNextStart(
  items: ITimeInterval[],
  layout: Map<string, IOverlapPlacement>
): Map<string, number> {
  const byColumn = new Map<number, ITimeInterval[]>();
  for (const item of items) {
    const column = layout.get(item.id)?.column ?? 0;
    const bucket = byColumn.get(column);
    if (bucket) {
      bucket.push(item);
    } else {
      byColumn.set(column, [item]);
    }
  }

  const nextStart = new Map<string, number>();
  for (const bucket of byColumn.values()) {
    const sorted = [...bucket].sort(
      (a, b) => a.start - b.start || a.id.localeCompare(b.id)
    );
    for (let i = 0; i < sorted.length; i += 1) {
      const following = sorted[i + 1];
      nextStart.set(sorted[i].id, following ? following.start : Infinity);
    }
  }

  return nextStart;
}

/** CSS left/width for a placed column (percent of track, with small gutters). */
export function overlapColumnStyle(
  placement: IOverlapPlacement,
  gutterPercent = 1
): { left: string; width: string } {
  const { column, columnCount } = placement;
  const slot = 100 / columnCount;
  const left = column * slot + gutterPercent / 2;
  const width = slot - gutterPercent;
  return {
    left: `${left}%`,
    width: `${Math.max(width, 8)}%`,
  };
}
