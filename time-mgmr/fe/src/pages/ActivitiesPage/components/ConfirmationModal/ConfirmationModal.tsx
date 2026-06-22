import { useEffect, useRef } from 'react';
import { ModalShell } from '@/components/molecules/ModalShell/ModalShell';
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
  }, []);

  return (
    <ModalShell
      onDismiss={onCancel}
      dismissDisabled={busy}
      backdropClassName={styles.modalBackdrop}
      panelClassName={styles.confirmModal}
      panelRole="alertdialog"
      labelledBy="confirmation-title"
      describedBy="confirmation-message"
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
    </ModalShell>
  );
}
