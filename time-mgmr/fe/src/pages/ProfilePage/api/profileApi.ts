import type { IUser } from '@/core/types/common';
import { API_BASE_URL } from '@/core/constants/app';
import { getJson } from '@/services/httpClient';
import type { IProfileData } from '../types';
import { PROFILE_DEFAULTS } from '../constants';

const PROFILE_API_URL = `${API_BASE_URL}/profile`;

const toProfileData = (raw: unknown, user: IUser | null): IProfileData => {
  const data = (raw ?? {}) as Partial<IProfileData>;
  const basic: Partial<IProfileData['basic']> = data.basic ?? {};
  const work: Partial<IProfileData['work']> = data.work ?? {};

  return {
    basic: {
      name: basic.name || user?.displayName || user?.name || PROFILE_DEFAULTS.basic.name,
      email: basic.email || user?.email || PROFILE_DEFAULTS.basic.email,
      phone: basic.phone || PROFILE_DEFAULTS.basic.phone,
    },
    work: {
      company: work.company || PROFILE_DEFAULTS.work.company,
      linkedinLink: work.linkedinLink || PROFILE_DEFAULTS.work.linkedinLink,
      githubLink: work.githubLink || PROFILE_DEFAULTS.work.githubLink,
    },
    interests: Array.isArray(data.interests)
      ? data.interests.filter((interest): interest is string => typeof interest === 'string')
      : [...PROFILE_DEFAULTS.interests],
  };
};

export const saveMockProfile = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 1000);
  });
};

export const fetchMockProfile = async (user: IUser | null): Promise<IProfileData> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });

  return {
    basic: {
      name: user?.displayName || user?.name || PROFILE_DEFAULTS.basic.name,
      email: user?.email || PROFILE_DEFAULTS.basic.email,
      phone: PROFILE_DEFAULTS.basic.phone,
    },
    work: { ...PROFILE_DEFAULTS.work },
    interests: [...PROFILE_DEFAULTS.interests],
  };
};

export const fetchProfile = async (user: IUser | null): Promise<IProfileData> => {
  try {
    const json = await getJson<unknown>(PROFILE_API_URL);
    return toProfileData(json, user);
  } catch {
    return fetchMockProfile(user);
  }
};
