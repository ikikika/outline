/**
 * Custom hook for handling async operations
 * Demonstrates DRY principle and reusability
 * Single Responsibility: Handle async state management
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

/**
 * Hook for managing async operations
 * @param asyncFunction - Function that returns a promise
 * @param options - Configuration options
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncState<T> & { execute: () => Promise<void> } {
  const { immediate = true, onSuccess, onError } = options;

  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  // Use ref to track mounted status to prevent memory leaks
  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null });

    try {
      const response = await asyncFunction();
      if (isMountedRef.current) {
        setState({ status: 'success', data: response, error: null });
        onSuccess?.(response);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMountedRef.current) {
        setState({ status: 'error', data: null, error });
        onError?.(error);
      }
    }
  }, [asyncFunction, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      void Promise.resolve().then(() => {
        if (isMountedRef.current) {
          void execute();
        }
      });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [execute, immediate]);

  return { ...state, execute };
}
