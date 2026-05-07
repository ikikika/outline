import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { Header } from '@/components/organisms/Header/Header';
import { ProtectedLayout } from '@/components/organisms/ProtectedLayout/ProtectedLayout';
import type { IUser } from '@/core/types/common';

const mockUseAuthContext = vi.hoisted(() => vi.fn());
const mockUseThemeContext = vi.hoisted(() => vi.fn());

vi.mock('@/app/providers/auth', () => ({
  useAuthContext: mockUseAuthContext,
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
  themePreference: 'light',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function mockViewport(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const maxWidthMatch = /max-width:\s*(\d+)px/.exec(query);
      const matches = maxWidthMatch ? width <= Number(maxWidthMatch[1]) : false;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

function renderLayout() {
  mockUseAuthContext.mockReturnValue({
    user: mockUser,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
  mockUseThemeContext.mockReturnValue({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/today']}>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route
            path="/today"
            element={
              <>
                <Header />
                <div>Today content</div>
              </>
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedLayout sidebar collapse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the sidebar open on desktop by default', () => {
    mockViewport(1200);
    renderLayout();

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open sidebar/i })).not.toBeInTheDocument();
  });

  it('starts collapsed on mobile and can be opened from the header', async () => {
    mockViewport(375);
    const user = userEvent.setup();
    renderLayout();

    expect(screen.getByRole('button', { name: /open sidebar/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open sidebar/i }));

    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it('collapses from the sidebar control and shows expand in the header', async () => {
    mockViewport(1200);
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(screen.getByRole('button', { name: /open sidebar/i })).toBeInTheDocument();
  });
});
