import { describe, expect, it } from 'vitest';
import { basicInfoSchema } from './schemas';

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
});
