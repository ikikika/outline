import { useId, useRef, useState, type ChangeEvent } from 'react';
import {
  activityCatalogImportSchema,
  type IActivityCatalogImportInput,
} from '@/features/activities';
import styles from '../../ActivitiesPage.module.scss';

interface ImportActivityFormProps {
  disabled?: boolean;
  onImport: (input: IActivityCatalogImportInput) => Promise<void>;
  onError?: (message: string) => void;
}

function formatZodError(error: {
  issues: Array<{ message: string; path: PropertyKey[] }>;
}): string {
  const first = error.issues[0];
  if (!first) return 'Invalid import file.';
  const path = first.path.filter(Boolean).join('.');
  return path ? `${path}: ${first.message}` : first.message;
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

export function ImportActivityForm({
  disabled = false,
  onImport,
  onError,
}: ImportActivityFormProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow selecting the same file again after a failed attempt.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const text = await readFileAsText(file);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        onError?.('Import file must be valid JSON.');
        return;
      }

      const result = activityCatalogImportSchema.safeParse(parsed);
      if (!result.success) {
        onError?.(formatZodError(result.error));
        return;
      }

      const { activity, tasks } = result.data;
      await onImport({
        activity: {
          title: activity.title,
          categoryId: activity.categoryId,
          ...(activity.notes !== undefined ? { notes: activity.notes } : {}),
          ...(activity.id !== undefined ? { id: activity.id } : {}),
          ...(activity.sortOrder !== undefined
            ? { sortOrder: activity.sortOrder }
            : {}),
        },
        tasks: tasks.map((task) => ({
          title: task.title,
          ...(task.timeEstimationSeconds !== undefined
            ? { timeEstimationSeconds: task.timeEstimationSeconds }
            : {}),
          ...(task.categoryId !== undefined
            ? { categoryId: task.categoryId }
            : {}),
          ...(task.notes !== undefined ? { notes: task.notes } : {}),
          ...(task.status !== undefined ? { status: task.status } : {}),
          ...(task.sortOrder !== undefined ? { sortOrder: task.sortOrder } : {}),
          ...(task.id !== undefined ? { id: task.id } : {}),
        })),
      });
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to import activity.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.importForm}>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.srOnly}
        type="file"
        accept="application/json,.json"
        disabled={disabled || busy}
        onChange={(event) => void handleFileChange(event)}
      />
      <button
        className={styles.importButton}
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Importing…' : 'Import JSON'}
      </button>
      <span className={styles.importHint}>
        One activity with nested tasks
      </span>
    </div>
  );
}
