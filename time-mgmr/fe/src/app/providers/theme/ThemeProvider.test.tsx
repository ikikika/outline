import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ThemeProvider } from '@/app/providers/theme/ThemeProvider';
import { useThemeContext } from '@/app/providers/theme/useThemeContext';

let mockMatchMediaInstance: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  mockMatchMediaInstance = vi.fn((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mockMatchMediaInstance,
  });
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('initializes theme from localStorage when valid value exists', async () => {
    localStorage.setItem('app-theme', 'dark');

    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const themeDiv = container.querySelector('[data-testid="theme-display"]');
      expect(themeDiv?.textContent).toContain('dark');
    });
  });

  it('initializes theme to system when no localStorage value exists', async () => {
    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const themeDiv = container.querySelector('[data-testid="theme-display"]');
      expect(themeDiv?.textContent).toContain('system');
    });
  });

  it('initializes theme to system when localStorage has invalid value', async () => {
    localStorage.setItem('app-theme', 'invalid-theme');

    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const themeDiv = container.querySelector('[data-testid="theme-display"]');
      expect(themeDiv?.textContent).toContain('system');
    });
  });

  it('resolves system theme based on matchMedia dark preference', async () => {
    mockMatchMediaInstance.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const resolvedDiv = container.querySelector('[data-testid="resolved-theme-display"]');
      expect(resolvedDiv?.textContent).toContain('dark');
    });
  });

  it('resolves system theme to light when matchMedia prefers-color-scheme is not dark', async () => {
    mockMatchMediaInstance.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const resolvedDiv = container.querySelector('[data-testid="resolved-theme-display"]');
      expect(resolvedDiv?.textContent).toContain('light');
    });
  });

  it('sets data-theme attribute on document root', async () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
    });
  });

  it('toggleTheme switches between dark and light', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    const initialTheme = container.querySelector('[data-testid="theme-display"]')?.textContent;
    
    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    await user.click(toggleButton);

    await waitFor(() => {
      const themeAfter = container.querySelector('[data-testid="theme-display"]')?.textContent;
      expect(themeAfter).not.toContain(initialTheme || 'system');
    });
  });

  it('saves theme to localStorage when setTheme is called', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    const setButton = screen.getByRole('button', { name: /set dark/i });
    await user.click(setButton);

    await waitFor(() => {
      expect(localStorage.getItem('app-theme')).toBe('dark');
    });
  });

  it('registers media query listener when theme is system', async () => {
    const addEventListenerMock = vi.fn();
    mockMatchMediaInstance.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  it('removes media query listener when theme changes from system', async () => {
    const removeEventListenerMock = vi.fn();
    const addEventListenerMock = vi.fn();

    mockMatchMediaInstance.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Change theme to dark (non-system)
    const setButton = screen.getByRole('button', { name: /set dark/i });
    await userEvent.click(setButton);

    await waitFor(() => {
      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    unmount();
  });
});

const TestThemeConsumer = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeContext();

  return (
    <div>
      <div data-testid="theme-display">Theme: {theme}</div>
      <div data-testid="resolved-theme-display">ResolvedTheme: {resolvedTheme}</div>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};
