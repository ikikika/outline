import type { IProfileData } from './types';

export const PROFILE_DEFAULTS: IProfileData = {
  basic: {
    name: 'Not provided',
    email: 'Not provided',
    phone: '+1 (555) 123-4567',
  },
  work: {
    company: 'Acme Corporation',
    linkedinLink: 'https://linkedin.com/in/john-doe',
    githubLink: 'https://github.com/johndoe',
  },
  interests: [
    'Frontend architecture',
    'Design systems',
    'Accessibility',
    'Open source',
  ],
};
