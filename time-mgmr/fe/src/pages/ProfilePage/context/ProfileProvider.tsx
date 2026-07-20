import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/app/providers/auth';
import { fetchProfile, saveMockProfile } from '../api/profileApi';
import { ProfileContext } from './useProfileContext';
import type { IProfileData } from '../types';
import type { EditStep } from './useProfileContext';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const profileQueryKey = useMemo(() => ['profile', user?.id ?? 'anonymous'] as const, [user?.id]);

  // React Query owns the lifecycle of loading, error, success, caching, and refetch for profile data
  // UI state (profileData, isLoading, error, refetch) comes from useQuery
  const { data: profileData, isLoading, error, refetch } = useQuery<IProfileData>({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(user),
  });
  const profile = profileData ?? null;

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStep, setEditStep] = useState<EditStep>('edit');
  const [editedProfile, setEditedProfile] = useState<IProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<IProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const refreshProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const startEdit = useCallback(() => {
    if (profile) {
      setIsEditMode(true);
      setEditStep('edit');
      setEditedProfile(JSON.parse(JSON.stringify(profile)));
      setOriginalProfile(JSON.parse(JSON.stringify(profile)));
      setSaveError(null);
    }
  }, [profile]);

  const updateEditedProfile = useCallback((updatedProfile: IProfileData) => {
    setEditedProfile(updatedProfile);
  }, []);

  const moveToStep = useCallback((step: EditStep) => {
    setEditStep(step);
  }, []);

  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      if (editedProfile) {
        await saveMockProfile();
        queryClient.setQueryData(profileQueryKey, editedProfile);
        setEditStep('success');
      }
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to save profile');
      setSaveError(nextError);
    } finally {
      setIsSaving(false);
    }
  }, [editedProfile, profileQueryKey, queryClient]);

  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    setEditStep('edit');
    setEditedProfile(null);
    setOriginalProfile(null);
    setSaveError(null);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      error: error instanceof Error ? error : null,
      refreshProfile,
      // Edit mode
      isEditMode,
      editStep,
      editedProfile,
      originalProfile,
      startEdit,
      updateEditedProfile,
      moveToStep,
      saveChanges,
      cancelEdit,
      isSaving,
      saveError,
    }),
    [
      profile,
      isLoading,
      error,
      refreshProfile,
      isEditMode,
      editStep,
      editedProfile,
      originalProfile,
      startEdit,
      updateEditedProfile,
      moveToStep,
      saveChanges,
      cancelEdit,
      isSaving,
      saveError,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
