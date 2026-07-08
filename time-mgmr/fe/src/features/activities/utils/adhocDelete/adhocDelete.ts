import type { IApiScheduleBlock } from '../../api/mapApiScheduleBlock';
import { ADHOC_BLOCKS_ACTIVITY_ID } from '../../constants';
import type { ITimetableBlock } from '../../types';

export type AdhocDeleteMode = 'this' | 'thisAndFuture';

export function isAdhocTimetableBlock(
  block: Pick<ITimetableBlock, 'excludeFromReports' | 'activityId'>
): boolean {
  return (
    Boolean(block.excludeFromReports) ||
    block.activityId === ADHOC_BLOCKS_ACTIVITY_ID
  );
}

/**
 * Schedule-block ids to remove for an adhoc delete.
 * `thisAndFuture` keeps earlier occurrences; includes the current block.
 */
export function adhocBlockIdsToDelete(
  blocks: IApiScheduleBlock[],
  currentBlockId: string,
  mode: AdhocDeleteMode
): string[] {
  if (mode === 'this') return [currentBlockId];

  const current = blocks.find((block) => block.id === currentBlockId);
  if (!current) return [currentBlockId];

  return blocks
    .filter((block) => block.plannedStart >= current.plannedStart)
    .map((block) => block.id);
}
