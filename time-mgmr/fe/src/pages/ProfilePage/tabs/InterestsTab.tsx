import React, { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useProfileContext } from '../context';
import { PROFILE_FORM_FIELDS } from '../validation/fields';
import { interestsSchema, type InterestsFormValues } from '../validation/schemas';
import styles from '../ProfilePage.module.scss';

export const InterestsTab: React.FC = () => {
  const {
    profile,
    isLoading,
    error,
    isEditMode,
    editStep,
    editedProfile,
    originalProfile,
    updateEditedProfile,
    moveToStep,
    saveChanges,
    cancelEdit,
    isSaving,
  } = useProfileContext();

  if (isLoading) {
    return <p className={styles.value}>Loading interests...</p>;
  }

  if (error) {
    return <p className={styles.value}>Unable to load profile data.</p>;
  }

  if (!profile) {
    return <p className={styles.value}>No profile data available.</p>;
  }

  const displayProfile = isEditMode && editedProfile ? editedProfile : profile;
  const { interests } = displayProfile;

  if (isEditMode && editStep === 'edit') {
    return (
      <EditForm
          interests={interests}
          onUpdate={(newInterests) => {
            if (editedProfile) {
              updateEditedProfile({
                ...editedProfile,
                interests: newInterests,
              });
            }
          }}
          onNext={() => moveToStep('review')}
          onCancel={cancelEdit}
        />
    );
  }

  if (isEditMode && editStep === 'review') {
    return (
      <ReviewForm
          current={interests}
          original={originalProfile?.interests}
          onConfirm={async () => {
            await saveChanges();
          }}
          onBack={() => moveToStep('edit')}
          onCancel={cancelEdit}
          isSaving={isSaving}
        />
    );
  }

  if (isEditMode && editStep === 'success') {
    return <SuccessScreen onClose={cancelEdit} />;
  }

  // Display mode
  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Interests</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className={styles.interestsList}>
          {interests.map((interest) => (
            <li key={interest} className={styles.value}>
              {interest}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

interface EditFormProps {
  interests: string[];
  onUpdate: (interests: string[]) => void;
  onNext: () => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ interests, onUpdate, onNext, onCancel }) => {
  const defaultValues = useMemo<InterestsFormValues>(() => ({
    interests: interests.map((value) => ({ value })),
  }), [interests]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InterestsFormValues>({
    resolver: zodResolver(interestsSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: PROFILE_FORM_FIELDS.interests.list,
  });

  useEffect(() => {
    const subscription = watch((values) => {
      onUpdate((values.interests ?? []).map((interest) => interest?.value ?? ''));
    });

    return () => subscription.unsubscribe();
  }, [onUpdate, watch]);

  const addInterest = () => {
    append({ value: '' });
  };

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Edit Interests</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(() => onNext())}>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.infoField} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <Input
              type="text"
              {...register(`${PROFILE_FORM_FIELDS.interests.list}.${index}.${PROFILE_FORM_FIELDS.interests.value}` as const)}
              placeholder="Enter an interest"
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              onClick={() => remove(index)}
              variant="outline"
              size="sm"
              style={{ marginTop: '0.5rem' }}
            >
              Remove
            </Button>
          </div>
        ))}

        {errors.interests?.message
          ? <p className={styles.value}>{errors.interests.message}</p>
          : null}

        {errors.interests && Array.isArray(errors.interests)
          ? errors.interests.map((itemError, index) => {
            const message = itemError?.value?.message;

            if (!message) {
              return null;
            }

            return (
              <p key={`interest-error-${index}`} className={styles.value}>
                {`Interest ${index + 1}: ${message}`}
              </p>
            );
          })
          : null}

        <Button type="button" onClick={addInterest} variant="outline" style={{ marginBottom: '2rem' }}>
          + Add Interest
        </Button>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
          <Button type="button" onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button type="submit">
            Next
          </Button>
        </div>
        </form>
      </CardContent>
    </Card>
  );
};

interface ReviewFormProps {
  current: string[];
  original?: string[];
  onConfirm: () => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ current, original, onConfirm, onBack, onCancel, isSaving }) => {
  const isChanged = JSON.stringify(current) !== JSON.stringify(original);

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Review Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul
          className={`${styles.interestsList} ${isChanged ? styles.highlighted : ''}`}
          style={{ marginBottom: '2rem' }}
        >
          {current.map((interest, index) => (
            <li key={index} className={styles.value}>
              {interest}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SuccessScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Card className={styles.section}>
      <CardContent style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Profile Updated Successfully
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          Your profile changes have been saved.
        </p>
        <Button onClick={onClose}>Done</Button>
      </CardContent>
    </Card>
  );
};
