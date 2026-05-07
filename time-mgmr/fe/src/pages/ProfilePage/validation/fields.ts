export const PROFILE_FORM_FIELDS = {
  basic: {
    name: 'name',
    email: 'email',
    phone: 'phone',
  },
  work: {
    company: 'company',
    linkedinLink: 'linkedinLink',
    githubLink: 'githubLink',
  },
  interests: {
    list: 'interests',
    value: 'value',
  },
} as const;
