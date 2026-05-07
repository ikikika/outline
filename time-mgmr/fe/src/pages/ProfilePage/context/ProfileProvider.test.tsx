import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileProvider } from './ProfileProvider';
import { useProfileContext } from './useProfileContext';

const mockUseAuthContext = vi.hoisted(() => vi.fn());
const mockFetchProfile = vi.hoisted(() => vi.fn());
const mockSaveMockProfile = vi.hoisted(() => vi.fn());

vi.mock('@/app/providers/auth', () => ({
  useAuthContext: mockUseAuthContext,
}));

vi.mock('../api/profileApi', () => ({
  fetchProfile: mockFetchProfile,
  saveMockProfile: mockSaveMockProfile,
}));

const mockUser = {
  id: 'u1',
  name: 'Jane',
  displayName: 'Jane D.',
  email: 'jane@example.com',
  role: 'user' as const,
  themePreference: 'light' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProfile = {
  basic: { name: 'Jane D.', email: 'jane@example.com', phone: '555-0001' },
  work: { company: 'Acme', linkedinLink: 'https://linkedin.com/in/jane', githubLink: 'https://github.com/jane' },
  interests: ['React', 'TypeScript'],
};

// Helper consumer that exposes context values via data-testid
const ContextConsumer: React.FC = () => {
  const ctx = useProfileContext();

  return (
    <div>
      <span data-testid="is-edit-mode">{String(ctx.isEditMode)}</span>
      <span data-testid="edit-step">{ctx.editStep}</span>
      <span data-testid="profile-name">{ctx.profile?.basic.name ?? 'none'}</span>
      <span data-testid="edited-name">{ctx.editedProfile?.basic.name ?? 'none'}</span>
      <span data-testid="is-saving">{String(ctx.isSaving)}</span>
      <span data-testid="save-error">{ctx.saveError?.message ?? 'none'}</span>
      <button onClick={ctx.startEdit}>startEdit</button>
      <button onClick={ctx.cancelEdit}>cancelEdit</button>
      <button onClick={() => ctx.moveToStep('review')}>moveToReview</button>
      <button onClick={() => void ctx.saveChanges()}>saveChanges</button>
    </div>
  );
};

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProvider = () => {
  const queryClient = createTestClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <ContextConsumer />
      </ProfileProvider>
    </QueryClientProvider>
  );
};

describe('ProfileProvider', () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({ user: mockUser });
    mockFetchProfile.mockResolvedValue(mockProfile);
    mockSaveMockProfile.mockResolvedValue(undefined);
  });

  it('loads profile on mount', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.');
    });
  });

  it('startEdit sets isEditMode to true and deep-copies the profile', async () => {
    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.'));

    await act(async () => {
      await userEvent.click(screen.getByText('startEdit'));
    });

    expect(screen.getByTestId('is-edit-mode').textContent).toBe('true');
    expect(screen.getByTestId('edit-step').textContent).toBe('edit');
    expect(screen.getByTestId('edited-name').textContent).toBe('Jane D.');
  });

  it('cancelEdit resets all edit state', async () => {
    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.'));

    await act(async () => {
      await userEvent.click(screen.getByText('startEdit'));
    });
    await act(async () => {
      await userEvent.click(screen.getByText('cancelEdit'));
    });

    expect(screen.getByTestId('is-edit-mode').textContent).toBe('false');
    expect(screen.getByTestId('edit-step').textContent).toBe('edit');
    expect(screen.getByTestId('edited-name').textContent).toBe('none');
  });

  it('moveToStep updates editStep', async () => {
    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.'));

    await act(async () => {
      await userEvent.click(screen.getByText('startEdit'));
    });
    await act(async () => {
      await userEvent.click(screen.getByText('moveToReview'));
    });

    expect(screen.getByTestId('edit-step').textContent).toBe('review');
  });

  it('saveChanges updates profile with editedProfile and moves to success step', async () => {
    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.'));

    await act(async () => {
      await userEvent.click(screen.getByText('startEdit'));
    });

    await act(async () => {
      await userEvent.click(screen.getByText('saveChanges'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('edit-step').textContent).toBe('success');
    });
  });

  it('saveError is set on failure', async () => {
    mockSaveMockProfile.mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('Jane D.'));

    await act(async () => {
      await userEvent.click(screen.getByText('startEdit'));
    });

    await act(async () => {
      await userEvent.click(screen.getByText('saveChanges'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('save-error').textContent).toBe('Network error');
    });

    expect(screen.getByTestId('edit-step').textContent).toBe('edit');
  });
});
