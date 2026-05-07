import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsync } from '@/core/hooks/useAsync';

describe('useAsync', () => {
  it('executes immediately by default and stores success state', async () => {
    const onSuccess = vi.fn();
    const asyncFn = vi.fn().mockResolvedValue('done');

    const { result } = renderHook(() => useAsync(asyncFn, { onSuccess }));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toBe('done');
    expect(result.current.error).toBeNull();
    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('done');
  });

  it('does not execute immediately when immediate is false', async () => {
    const asyncFn = vi.fn().mockResolvedValue(123);
    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));

    expect(result.current.status).toBe('idle');
    expect(asyncFn).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(123);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('stores error state and calls onError when async function rejects', async () => {
    const error = new Error('boom');
    const onError = vi.fn();
    const asyncFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsync(asyncFn, { onError }));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe('boom');
    expect(onError).toHaveBeenCalledWith(error);
  });
});
