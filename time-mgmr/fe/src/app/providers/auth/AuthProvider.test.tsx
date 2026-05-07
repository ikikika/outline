import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/app/providers/auth/AuthProvider';
import { useAuthContext } from '@/app/providers/auth/useAuthContext';
import type { IUser } from '@/core/types/common';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseThemeContext = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/app/providers/theme', () => ({
  useThemeContext: mockUseThemeContext,
}));

const mockUser: IUser = {
  id: 'u1',
  name: 'Jane',
  displayName: 'Jane D.',
  email: 'jane@example.com',
  role: 'user',
  themePreference: 'dark',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSetTheme = vi.fn();

describe('AuthProvider', () => {
  it('calls loadCurrentUser on mount', async () => {
    const mockLoadCurrentUser = vi.fn();

    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      loadCurrentUser: mockLoadCurrentUser,
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockUseThemeContext.mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
      toggleTheme: vi.fn(),
    });

    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockLoadCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  it('provides user, isLoading, error, login, and logout through context', () => {
    const mockLogin = vi.fn();
    const mockLogout = vi.fn();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      loadCurrentUser: vi.fn(),
      login: mockLogin,
      logout: mockLogout,
    });

    mockUseThemeContext.mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
      toggleTheme: vi.fn(),
    });

    render(
      <AuthProvider>
        <TestContextConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('User: Jane D.')).toBeInTheDocument();
    expect(screen.getByText('IsLoading: false')).toBeInTheDocument();
  });

  it('calls setTheme when user has themePreference', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      loadCurrentUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockUseThemeContext.mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
      toggleTheme: vi.fn(),
    });

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  it('does not call setTheme when user themePreference is undefined', async () => {
    const userWithoutTheme = { ...mockUser, themePreference: undefined };

    mockUseAuth.mockReturnValue({
      user: userWithoutTheme,
      isLoading: false,
      error: null,
      loadCurrentUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockUseThemeContext.mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
      toggleTheme: vi.fn(),
    });

    mockSetTheme.mockClear();

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockSetTheme).not.toHaveBeenCalled();
    });
  });

  it('does not call setTheme when user is null', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      loadCurrentUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockUseThemeContext.mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
      toggleTheme: vi.fn(),
    });

    mockSetTheme.mockClear();

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockSetTheme).not.toHaveBeenCalled();
    });
  });
});

const TestContextConsumer = () => {
  const { user, isLoading } = useAuthContext();
  return (
    <div>
      <div>User: {user?.displayName || 'None'}</div>
      <div>IsLoading: {String(isLoading)}</div>
    </div>
  );
};
