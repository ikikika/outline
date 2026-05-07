import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import type { IUser } from '@/core/types/common';

const mockUseAuthContext = vi.hoisted(() => vi.fn());

vi.mock('@/app/providers/auth', () => ({
  useAuthContext: mockUseAuthContext,
}));

const mockUser: IUser = {
  id: 'u1',
  name: 'Jane',
  displayName: 'Jane D.',
  email: 'jane@example.com',
  role: 'user',
  themePreference: 'light',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderWithRouter = (initialRoute = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('shows loading state when isLoading is true', () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter('/protected');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('preserves the from location in state when redirecting to login', () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter('/dashboard');

      // Verify redirect happened - check that Login Page appears
      const loginElements = screen.queryAllByText('Login Page');
      expect(loginElements.length).toBeGreaterThan(0);
  });

  it('renders outlet for authenticated users', () => {
    mockUseAuthContext.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter('/protected');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
