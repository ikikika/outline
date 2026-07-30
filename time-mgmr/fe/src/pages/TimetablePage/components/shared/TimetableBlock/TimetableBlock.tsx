import React from 'react';
import styles from './TimetableBlock.module.scss';

export type TimetableBlockDensity = 'day' | 'week';

interface TimetableBlockProps {
  title: string;
  startLabel: string;
  endLabel: string;
  top: number;
  height: number;
  left: string;
  width: string;
  background: string;
  isCompact: boolean;
  isLocked: boolean;
  isDragging: boolean;
  density: TimetableBlockDensity;
  transform?: string;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeStartPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeEndPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onClick?: () => void;
  onKeyActivate: () => void;
}

export const TimetableBlock: React.FC<TimetableBlockProps> = ({
  title,
  startLabel,
  endLabel,
  top,
  height,
  left,
  width,
  background,
  isCompact,
  isLocked,
  isDragging,
  density,
  transform,
  onPointerDown,
  onResizeStartPointerDown,
  onResizeEndPointerDown,
  onClick,
  onKeyActivate,
}) => (
  <div
    className={`${styles.block} ${styles[`density_${density}`]} ${
      isLocked ? styles.blockLocked : ''
    } ${isCompact ? styles.blockCompact : ''} ${
      isDragging ? styles.blockDragging : ''
    }`}
    style={{
      top,
      height,
      left,
      width,
      background,
      transform,
    }}
    role="button"
    tabIndex={0}
    aria-label={`${title}, ${startLabel} to ${endLabel}`}
    onPointerDown={onPointerDown}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onKeyActivate();
      }
    }}
  >
    {!isCompact && !isLocked ? (
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleTop}`}
        aria-label={`Change start time for ${title}`}
        onPointerDown={onResizeStartPointerDown}
      />
    ) : null}
    <p className={styles.blockTitle}>{title}</p>
    <p className={styles.blockMeta}>
      {startLabel}–{endLabel}
    </p>
    {!isCompact && !isLocked ? (
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleBottom}`}
        aria-label={`Change end time for ${title}`}
        onPointerDown={onResizeEndPointerDown}
      />
    ) : null}
  </div>
);
