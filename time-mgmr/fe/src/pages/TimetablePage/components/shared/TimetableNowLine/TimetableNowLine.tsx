import React from 'react';
import styles from './TimetableNowLine.module.scss';

interface TimetableNowLineProps {
  top: number;
  density: 'day' | 'week';
}

export const TimetableNowLine: React.FC<TimetableNowLineProps> = ({
  top,
  density,
}) => (
  <div
    className={`${styles.nowLine} ${styles[`density_${density}`]}`}
    style={{ top }}
    aria-hidden="true"
  >
    <span className={styles.nowDot} />
  </div>
);
