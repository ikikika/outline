import { useEffect, type ReactNode, type SyntheticEvent } from 'react';
import styles from './ModalShell.module.scss';

type DismissEvent = 'mousedown' | 'click';

interface ModalShellProps {
  children: ReactNode;
  onDismiss: () => void;
  /** When true, Escape and backdrop dismiss are ignored (unless onEscape is set). */
  dismissDisabled?: boolean;
  /** Extra gate for backdrop dismiss only (e.g. delayed ready after open). */
  canDismissBackdrop?: boolean;
  dismissEvent?: DismissEvent;
  /** Custom Escape handler; defaults to onDismiss when not dismissDisabled. */
  onEscape?: () => void;
  backdropClassName?: string;
  panelClassName?: string;
  panelRole?: 'dialog' | 'alertdialog';
  labelledBy?: string;
  describedBy?: string;
}

export function ModalShell({
  children,
  onDismiss,
  dismissDisabled = false,
  canDismissBackdrop = true,
  dismissEvent = 'mousedown',
  onEscape,
  backdropClassName,
  panelClassName,
  panelRole = 'dialog',
  labelledBy,
  describedBy,
}: ModalShellProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (onEscape) {
        onEscape();
        return;
      }
      if (!dismissDisabled) onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dismissDisabled, onDismiss, onEscape]);

  const dismissBackdrop = () => {
    if (dismissDisabled || !canDismissBackdrop) return;
    onDismiss();
  };

  const stopPanel = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const backdropProps =
    dismissEvent === 'mousedown'
      ? { onMouseDown: dismissBackdrop }
      : { onClick: dismissBackdrop };

  const panelProps =
    dismissEvent === 'mousedown'
      ? { onMouseDown: stopPanel }
      : { onClick: stopPanel };

  return (
    <div
      className={backdropClassName ?? styles.backdrop}
      role="presentation"
      {...backdropProps}
    >
      <div
        className={panelClassName ?? styles.panel}
        role={panelRole}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        {...panelProps}
      >
        {children}
      </div>
    </div>
  );
}
