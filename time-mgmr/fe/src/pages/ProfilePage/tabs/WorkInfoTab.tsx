import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useProfileContext } from '../context';
import { PROFILE_FORM_FIELDS } from '../validation/fields';
import { workInfoSchema, type WorkInfoFormValues } from '../validation/schemas';
import styles from '../ProfilePage.module.scss';

export const WorkInfoTab: React.FC = () => {
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
    return <p className={styles.value}>Loading work information...</p>;
  }

  if (error) {
    return <p className={styles.value}>Unable to load profile data.</p>;
  }

  if (!profile) {
    return <p className={styles.value}>No profile data available.</p>;
  }

  const displayProfile = isEditMode && editedProfile ? editedProfile : profile;
  const { work } = displayProfile;

  if (isEditMode && editStep === 'edit') {
    return (
      <EditForm
          work={work}
          onUpdate={(company, linkedinLink, githubLink) => {
            if (editedProfile) {
              updateEditedProfile({
                ...editedProfile,
                work: { company, linkedinLink, githubLink },
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
          current={work}
          original={originalProfile?.work}
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
        <CardTitle>Work Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.infoField}>
          <label className={styles.label}>Company</label>
          <p className={styles.value}>{work.company}</p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>LinkedIn</label>
          <a
            href={work.linkedinLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            {work.linkedinLink}
          </a>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>GitHub</label>
          <a
            href={work.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            {work.githubLink}
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

interface EditFormProps {
  work: { company: string; linkedinLink: string; githubLink: string };
  onUpdate: (company: string, linkedinLink: string, githubLink: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ work, onUpdate, onNext, onCancel }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorkInfoFormValues>({
    resolver: zodResolver(workInfoSchema),
    defaultValues: work,
    mode: 'onBlur',
  });

  useEffect(() => {
    const subscription = watch((values) => {
      onUpdate(values.company ?? '', values.linkedinLink ?? '', values.githubLink ?? '');
    });

    return () => subscription.unsubscribe();
  }, [onUpdate, watch]);

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Edit Work Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(() => onNext())}>
        <div className={styles.infoField}>
          <label className={styles.label}>Company</label>
          <Input
            type="text"
            {...register(PROFILE_FORM_FIELDS.work.company)}
            placeholder="Enter your company"
          />
          {errors.company
            ? <p className={styles.value}>{errors.company.message}</p>
            : null}
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>LinkedIn URL</label>
          <Input
            type="url"
            {...register(PROFILE_FORM_FIELDS.work.linkedinLink)}
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedinLink
            ? <p className={styles.value}>{errors.linkedinLink.message}</p>
            : null}
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>GitHub URL</label>
          <Input
            type="url"
            {...register(PROFILE_FORM_FIELDS.work.githubLink)}
            placeholder="https://github.com/username"
          />
          {errors.githubLink
            ? <p className={styles.value}>{errors.githubLink.message}</p>
            : null}
        </div>

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
  current: { company: string; linkedinLink: string; githubLink: string };
  original?: { company: string; linkedinLink: string; githubLink: string };
  onConfirm: () => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ current, original, onConfirm, onBack, onCancel, isSaving }) => {
  const getHighlightClass = (currentVal: string, originalVal?: string) => {
    return currentVal !== originalVal ? styles.highlighted : '';
  };

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Review Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.infoField}>
          <label className={styles.label}>Company</label>
          <p className={`${styles.value} ${getHighlightClass(current.company, original?.company)}`}>
            {current.company}
          </p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>LinkedIn URL</label>
          <p className={`${styles.value} ${getHighlightClass(current.linkedinLink, original?.linkedinLink)}`}>
            {current.linkedinLink}
          </p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>GitHub URL</label>
          <p className={`${styles.value} ${getHighlightClass(current.githubLink, original?.githubLink)}`}>
            {current.githubLink}
          </p>
        </div>

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
