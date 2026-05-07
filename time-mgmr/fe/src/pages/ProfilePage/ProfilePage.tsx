/**
 * Profile Page Component
 * Displays user profile information in tabbed sections
 */

import React from 'react';
import { MainLayout } from '@/layouts';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button } from '@/components/ui';
import { StepTracker } from '@/components/molecules/StepTracker';
import { ProfileProvider } from './context';
import { useProfileContext } from './context';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { WorkInfoTab } from './tabs/WorkInfoTab';
import { InterestsTab } from './tabs/InterestsTab';
import styles from './ProfilePage.module.scss';

const EDIT_STEPS = [
  { id: 'edit', label: 'Edit' },
  { id: 'review', label: 'Review' },
  { id: 'success', label: 'Success' },
];

const ProfilePageContent: React.FC = () => {
  const { isEditMode, editStep, startEdit } = useProfileContext();

  return (
    <div className={styles.profileContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Profile</h1>
        {isEditMode
          ? <StepTracker steps={EDIT_STEPS} currentStep={editStep} />
          : (
            <Button onClick={startEdit} variant="outline" size="sm">
              Edit
            </Button>
          )
        }
      </div>

      <Tabs defaultValue="basic" className={styles.tabsRoot}>
        <TabsList className={`w-full justify-start ${styles.tabs}`} aria-label="Profile sections">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="work">Work Info</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicInfoTab />
        </TabsContent>

        <TabsContent value="work">
          <WorkInfoTab />
        </TabsContent>

        <TabsContent value="interests">
          <InterestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  return (
    <MainLayout>
      <ProfileProvider>
        <ProfilePageContent />
      </ProfileProvider>
    </MainLayout>
  );
};

export default ProfilePage;
