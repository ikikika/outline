import { useState, type FormEvent } from 'react';
import type { ICatalogTaskCreateInput } from '@/features/activities';
import styles from '../../ActivitiesPage.module.scss';

type AddTaskInput = Pick<
  ICatalogTaskCreateInput,
  'title' | 'timeEstimationSeconds'
>;

interface AddTaskFormProps {
  activityId: string;
  disabled?: boolean;
  onAdd: (input: AddTaskInput) => Promise<void>;
}

export function AddTaskForm({
  activityId,
  disabled = false,
  onAdd,
}: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const titleId = `new-task-title-${activityId}`;
  const durationId = `new-task-duration-${activityId}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || durationMinutes < 1) return;

    try {
      await onAdd({
        title: trimmedTitle,
        timeEstimationSeconds: durationMinutes * 60,
      });
      setTitle('');
    } catch {
      // The mutation error is presented by the page.
    }
  };

  return (
    <form className={styles.addTaskForm} onSubmit={handleSubmit}>
      <label className={styles.srOnly} htmlFor={titleId}>
        Task title
      </label>
      <input
        id={titleId}
        className={styles.textInput}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="New task"
        disabled={disabled}
        required
      />
      <label className={styles.durationLabel} htmlFor={durationId}>
        Minutes
      </label>
      <input
        id={durationId}
        className={styles.durationInput}
        type="number"
        min={1}
        step={1}
        value={durationMinutes}
        onChange={(event) => setDurationMinutes(Number(event.target.value))}
        disabled={disabled}
        required
      />
      <button
        className={styles.addButton}
        type="submit"
        disabled={disabled || !title.trim() || durationMinutes < 1}
      >
        Add task
      </button>
    </form>
  );
}
