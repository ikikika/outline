import type { ITimetableBlock } from '@/features/activities';

export interface IBlockDisplayWindow {
  date: string;
  start: string;
  end: string;
}

/** Done tasks render at their actual window while retaining their original plan. */
export function blockDisplayWindow(block: ITimetableBlock): IBlockDisplayWindow {
  if (
    block.status === 'done' &&
    block.actualDate &&
    block.actualStart &&
    block.actualEnd
  ) {
    return {
      date: block.actualDate,
      start: block.actualStart,
      end: block.actualEnd,
    };
  }

  return {
    date: block.date,
    start: block.plannedStart,
    end: block.plannedEnd,
  };
}
