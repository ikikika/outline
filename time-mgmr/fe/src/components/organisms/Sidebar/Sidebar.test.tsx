import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
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

const renderSidebar = ({
  route = '/today',
  user = mockUser,
  logout = vi.fn(),
}: {
  route?: string;
  user?: IUser | null;
  logout?: () => void;
} = {}) => {
  mockUseAuthContext.mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout,
  });

  return {
    logout,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <Sidebar />
      </MemoryRouter>
    ),
  };
};

describe('Sidebar', () => {
  it('renders navigation items and logout button', () => {
    renderSidebar();

    expect(screen.getByText('Tempo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /report/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('shows authenticated user name', () => {
    renderSidebar({ user: mockUser });

    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('shows fallback user label when user name is unavailable', () => {
    renderSidebar({ user: null });

    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('highlights the active nav item based on current route', () => {
    renderSidebar({ route: '/today' });

    const todayLink = screen.getByRole('link', { name: /today/i });
    const profileLink = screen.getByRole('link', { name: /profile/i });

    expect(todayLink).toHaveClass('nav-item--active');
    expect(profileLink).not.toHaveClass('nav-item--active');
  });

  it('calls logout when logout button is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();

    renderSidebar({ logout });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('exposes a collapse control', () => {
    renderSidebar();

    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });
});
