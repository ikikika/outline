import { useEffect, useRef } from 'react';
import styles from '../../ActivitiesPage.module.scss';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  title,
  message,
  confirmLabel,
  busyLabel = 'Working…',
  confirmVariant = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className={styles.confirmModal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirmation-title" className={styles.confirmTitle}>
          {title}
        </h2>
        <p id="confirmation-message" className={styles.confirmMessage}>
          {message}
        </p>
        <div className={styles.confirmActions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelButton}
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              confirmVariant === 'primary'
                ? styles.confirmPrimaryButton
                : styles.deleteButton
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
