import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useProfileContext } from '../context';
import { PROFILE_FORM_FIELDS } from '../validation/fields';
import { basicInfoSchema, type BasicInfoFormValues } from '../validation/schemas';
import styles from '../ProfilePage.module.scss';

export const BasicInfoTab: React.FC = () => {
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
    return <p className={styles.value}>Loading basic information...</p>;
  }

  if (error) {
    return <p className={styles.value}>Unable to load profile data.</p>;
  }

  if (!profile) {
    return <p className={styles.value}>No profile data available.</p>;
  }

  const displayProfile = isEditMode && editedProfile ? editedProfile : profile;
  const { basic } = displayProfile;

  if (isEditMode && editStep === 'edit') {
    return (
      <EditForm
          basic={basic}
          onUpdate={(name, email, phone) => {
            if (editedProfile) {
              updateEditedProfile({
                ...editedProfile,
                basic: { name, email, phone },
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
          current={basic}
          original={originalProfile?.basic}
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
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.infoField}>
          <label className={styles.label}>Name</label>
          <p className={styles.value}>{basic.name}</p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Email</label>
          <p className={styles.value}>{basic.email}</p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Phone</label>
          <p className={styles.value}>{basic.phone}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface EditFormProps {
  basic: { name: string; email: string; phone: string };
  onUpdate: (name: string, email: string, phone: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ basic, onUpdate, onNext, onCancel }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: basic,
    mode: 'onBlur',
  });

  useEffect(() => {
    const subscription = watch((values) => {
      onUpdate(values.name ?? '', values.email ?? '', values.phone ?? '');
    });

    return () => subscription.unsubscribe();
  }, [onUpdate, watch]);

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Edit Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(() => onNext())}>
        <div className={styles.infoField}>
          <label className={styles.label}>Name</label>
          <Input
            type="text"
            {...register(PROFILE_FORM_FIELDS.basic.name)}
            placeholder="Enter your name"
          />
          {errors.name
            ? <p className={styles.value}>{errors.name.message}</p>
            : null}
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Email</label>
          <Input
            type="email"
            {...register(PROFILE_FORM_FIELDS.basic.email)}
            placeholder="Enter your email"
          />
          {errors.email
            ? <p className={styles.value}>{errors.email.message}</p>
            : null}
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Phone</label>
          <Input
            type="tel"
            {...register(PROFILE_FORM_FIELDS.basic.phone)}
            placeholder="Enter your phone"
          />
          {errors.phone
            ? <p className={styles.value}>{errors.phone.message}</p>
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
  current: { name: string; email: string; phone: string };
  original?: { name: string; email: string; phone: string };
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
          <label className={styles.label}>Name</label>
          <p className={`${styles.value} ${getHighlightClass(current.name, original?.name)}`}>
            {current.name}
          </p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Email</label>
          <p className={`${styles.value} ${getHighlightClass(current.email, original?.email)}`}>
            {current.email}
          </p>
        </div>

        <div className={styles.infoField}>
          <label className={styles.label}>Phone</label>
          <p className={`${styles.value} ${getHighlightClass(current.phone, original?.phone)}`}>
            {current.phone}
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
