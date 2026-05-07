import { describe, expect, it } from 'vitest';
import { cn } from '@/core/utils/classNameUtils';

describe('cn', () => {
  it('joins string classes with spaces', () => {
    expect(cn('btn', 'btn-primary', 'active')).toBe('btn btn-primary active');
  });

  it('filters out undefined/null/boolean falsy values', () => {
    expect(cn('base', undefined, null, false, 'tail')).toBe('base tail');
  });

  it('includes object keys with truthy values', () => {
    expect(cn('base', { active: true, disabled: false, compact: true })).toBe(
      'base active compact'
    );
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });
});
