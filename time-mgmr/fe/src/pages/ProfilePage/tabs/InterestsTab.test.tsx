import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InterestsTab } from './InterestsTab';
import type { IProfileContext } from '../context';

const mockUseProfileContext = vi.hoisted(() => vi.fn());

vi.mock('../context', () => ({
  useProfileContext: mockUseProfileContext,
}));

const mockProfile = {
  basic: { name: 'Jane D.', email: 'jane@example.com', phone: '555-0001' },
  work: { company: 'Acme', linkedinLink: 'https://linkedin.com/in/jane', githubLink: 'https://github.com/jane' },
  interests: ['React', 'TypeScript'],
};

const baseContext: IProfileContext = {
  profile: mockProfile,
  isLoading: false,
  error: null,
  refreshProfile: vi.fn(),
  isEditMode: false,
  editStep: 'edit',
  editedProfile: null,
  originalProfile: null,
  startEdit: vi.fn(),
  updateEditedProfile: vi.fn(),
  moveToStep: vi.fn(),
  saveChanges: vi.fn(),
  cancelEdit: vi.fn(),
  isSaving: false,
  saveError: null,
};

describe('InterestsTab', () => {
  describe('display mode', () => {
    it('renders all interest values', () => {
      mockUseProfileContext.mockReturnValue(baseContext);

      render(<InterestsTab />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('shows a loading message while loading', () => {
      mockUseProfileContext.mockReturnValue({ ...baseContext, profile: null, isLoading: true });

      render(<InterestsTab />);

      expect(screen.getByText('Loading interests...')).toBeInTheDocument();
    });

    it('shows an error message when there is an error', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        profile: null,
        error: new Error('fail'),
      });

      render(<InterestsTab />);

      expect(screen.getByText('Unable to load profile data.')).toBeInTheDocument();
    });
  });

  describe('edit step', () => {
    it('renders input fields with current interest values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
      });

      render(<InterestsTab />);

      expect(screen.getByDisplayValue('React')).toBeInTheDocument();
      expect(screen.getByDisplayValue('TypeScript')).toBeInTheDocument();
    });

    it('calls moveToStep("review") when Next is clicked', async () => {
      const moveToStep = vi.fn();
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
        moveToStep,
      });

      render(<InterestsTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(moveToStep).toHaveBeenCalledWith('review');
    });

    it('calls cancelEdit when Cancel is clicked', async () => {
      const cancelEdit = vi.fn();
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
        cancelEdit,
      });

      render(<InterestsTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('review step', () => {
    const changedProfile = {
      ...mockProfile,
      interests: ['React', 'TypeScript', 'GraphQL'],
    };

    it('renders current interest values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<InterestsTab />);

      expect(screen.getByText('GraphQL')).toBeInTheDocument();
    });

    it('highlights the interests list when interests have changed', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      const { container } = render(<InterestsTab />);

      const list = container.querySelector('ul');
      expect(list?.className).toMatch(/highlighted/);
    });

    it('does not highlight the interests list when interests are unchanged', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: mockProfile,
        originalProfile: mockProfile,
      });

      const { container } = render(<InterestsTab />);

      const list = container.querySelector('ul');
      expect(list?.className).not.toMatch(/highlighted/);
    });

    it('calls saveChanges when Confirm is clicked', async () => {
      const saveChanges = vi.fn().mockResolvedValue(undefined);
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
        saveChanges,
      });

      render(<InterestsTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(saveChanges).toHaveBeenCalledTimes(1);
    });
  });

  describe('success step', () => {
    it('renders the success message', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'success',
        editedProfile: mockProfile,
      });

      render(<InterestsTab />);

      expect(screen.getByText('Profile Updated Successfully')).toBeInTheDocument();
    });

    it('calls cancelEdit when Done is clicked', async () => {
      const cancelEdit = vi.fn();
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'success',
        editedProfile: mockProfile,
        cancelEdit,
      });

      render(<InterestsTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Done' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });
});
