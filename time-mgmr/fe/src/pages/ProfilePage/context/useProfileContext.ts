import { createContext, useContext } from 'react';
import type { IProfileData } from '../types';

export type EditStep = 'edit' | 'review' | 'success';

export interface IProfileContext {
  profile: IProfileData | null;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  // Edit mode state
  isEditMode: boolean;
  editStep: EditStep;
  editedProfile: IProfileData | null;
  originalProfile: IProfileData | null;
  startEdit: () => void;
  updateEditedProfile: (profile: IProfileData) => void;
  moveToStep: (step: EditStep) => void;
  saveChanges: () => Promise<void>;
  cancelEdit: () => void;
  isSaving: boolean;
  saveError: Error | null;
}

export const ProfileContext = createContext<IProfileContext | null>(null);

export const useProfileContext = (): IProfileContext => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used inside <ProfileProvider>');
  }
  return ctx;
};
