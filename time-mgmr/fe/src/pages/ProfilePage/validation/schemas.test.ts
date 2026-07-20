import { describe, expect, it } from 'vitest';
import {
  basicInfoSchema,
  interestsSchema,
  workInfoSchema,
} from './schemas';

describe('Profile validation schemas', () => {
  describe('basicInfoSchema', () => {
    it('accepts valid basic profile data', () => {
      const result = basicInfoSchema.safeParse({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 (555) 123-4567',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = basicInfoSchema.safeParse({
        name: 'Jane Doe',
        email: 'invalid-email',
        phone: '+1 (555) 123-4567',
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['email']);
      expect(result.error.issues[0]?.message).toBe('Enter a valid email address.');
    });

    it('rejects phone numbers with unsupported characters', () => {
      const result = basicInfoSchema.safeParse({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: 'abc-defg',
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['phone']);
      expect(result.error.issues[0]?.message).toBe('Enter a valid phone number.');
    });
  });

  describe('workInfoSchema', () => {
    it('accepts valid work data', () => {
      const result = workInfoSchema.safeParse({
        company: 'Acme Corp',
        linkedinLink: 'https://linkedin.com/in/janedoe',
        githubLink: 'https://github.com/janedoe',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid linkedin url', () => {
      const result = workInfoSchema.safeParse({
        company: 'Acme Corp',
        linkedinLink: 'linkedin.com/in/janedoe',
        githubLink: 'https://github.com/janedoe',
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['linkedinLink']);
      expect(result.error.issues[0]?.message).toBe('Enter a valid LinkedIn URL.');
    });

    it('rejects too-short company names', () => {
      const result = workInfoSchema.safeParse({
        company: 'A',
        linkedinLink: 'https://linkedin.com/in/janedoe',
        githubLink: 'https://github.com/janedoe',
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['company']);
      expect(result.error.issues[0]?.message).toBe('Company must be at least 2 characters.');
    });
  });

  describe('interestsSchema', () => {
    it('accepts a non-empty interests list', () => {
      const result = interestsSchema.safeParse({
        interests: [{ value: 'React' }, { value: 'TypeScript' }],
      });

      expect(result.success).toBe(true);
    });

    it('rejects an empty interests list', () => {
      const result = interestsSchema.safeParse({
        interests: [],
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['interests']);
      expect(result.error.issues[0]?.message).toBe('Add at least one interest.');
    });

    it('rejects interest values that are only whitespace', () => {
      const result = interestsSchema.safeParse({
        interests: [{ value: '   ' }],
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues[0]?.path).toEqual(['interests', 0, 'value']);
      expect(result.error.issues[0]?.message).toBe('Interest cannot be empty.');
    });
  });
});
