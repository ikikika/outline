/**
 * Card Molecule Component
 * Reusable container for grouping related content
 */

import React from 'react';
import { cn } from '@/core/utils/classNameUtils';
import type { IComponentProps } from '@/core/types/common';
import styles from './Card.module.scss';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface ICardProps extends IComponentProps {
  variant?: CardVariant;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<React.PropsWithChildren<ICardProps>> = ({
  variant = 'outlined',
  header,
  footer,
  children,
  className,
  onClick,
  hoverable = false,
  testId,
}) => {
  return (
    <div
      className={cn(
        styles.card,
        styles[`variant-${variant}`],
        { [styles.hoverable]: hoverable },
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClick();
              }
            }
          : undefined
      }
    >
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Card;
