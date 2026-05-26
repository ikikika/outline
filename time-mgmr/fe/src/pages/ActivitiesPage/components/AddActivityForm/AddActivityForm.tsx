import { useState, type FormEvent } from 'react';
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategoryId,
  type IActivityCreateInput,
} from '@/features/activities';
import styles from '../../ActivitiesPage.module.scss';

interface AddActivityFormProps {
  disabled?: boolean;
  onAdd: (input: IActivityCreateInput) => Promise<void>;
}

export function AddActivityForm({
  disabled = false,
  onAdd,
}: AddActivityFormProps) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] =
    useState<ActivityCategoryId>('personal');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    try {
      await onAdd({ title: trimmedTitle, categoryId });
      setTitle('');
    } catch {
      // The mutation error is presented by the page.
    }
  };

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <label className={styles.srOnly} htmlFor="new-activity-title">
        Activity title
      </label>
      <input
        id="new-activity-title"
        className={styles.textInput}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="New activity"
        disabled={disabled}
        required
      />
      <label className={styles.srOnly} htmlFor="new-activity-category">
        Category
      </label>
      <select
        id="new-activity-category"
        className={styles.select}
        value={categoryId}
        onChange={(event) =>
          setCategoryId(event.target.value as ActivityCategoryId)
        }
        disabled={disabled}
      >
        {ACTIVITY_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
      <button
        className={styles.addButton}
        type="submit"
        disabled={disabled || !title.trim()}
      >
        Add activity
      </button>
    </form>
  );
}
