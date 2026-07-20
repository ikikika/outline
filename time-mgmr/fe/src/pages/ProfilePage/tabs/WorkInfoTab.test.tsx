import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkInfoTab } from './WorkInfoTab';
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

describe('WorkInfoTab', () => {
  describe('display mode', () => {
    it('renders profile work field values', () => {
      mockUseProfileContext.mockReturnValue(baseContext);

      render(<WorkInfoTab />);

      expect(screen.getByText('Acme')).toBeInTheDocument();
      expect(screen.getByText('https://linkedin.com/in/jane')).toBeInTheDocument();
      expect(screen.getByText('https://github.com/jane')).toBeInTheDocument();
    });

    it('shows a loading message while loading', () => {
      mockUseProfileContext.mockReturnValue({ ...baseContext, profile: null, isLoading: true });

      render(<WorkInfoTab />);

      expect(screen.getByText('Loading work information...')).toBeInTheDocument();
    });

    it('shows an error message when there is an error', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        profile: null,
        error: new Error('fail'),
      });

      render(<WorkInfoTab />);

      expect(screen.getByText('Unable to load profile data.')).toBeInTheDocument();
    });
  });

  describe('edit step', () => {
    it('renders input fields with current work values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
      });

      render(<WorkInfoTab />);

      expect(screen.getByDisplayValue('Acme')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://linkedin.com/in/jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://github.com/jane')).toBeInTheDocument();
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

      render(<WorkInfoTab />);

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

      render(<WorkInfoTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('review step', () => {
    const changedProfile = {
      ...mockProfile,
      work: { company: 'NewCo', linkedinLink: 'https://linkedin.com/in/jane', githubLink: 'https://github.com/jane' },
    };

    it('renders current work values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<WorkInfoTab />);

      expect(screen.getByText('NewCo')).toBeInTheDocument();
    });

    it('highlights values that differ from original', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<WorkInfoTab />);

      const changedEl = screen.getByText('NewCo');
      expect(changedEl.className).toMatch(/highlighted/);
    });

    it('does not highlight values that are unchanged', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<WorkInfoTab />);

      const unchangedEl = screen.getByText('https://linkedin.com/in/jane');
      expect(unchangedEl.className).not.toMatch(/highlighted/);
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

      render(<WorkInfoTab />);

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

      render(<WorkInfoTab />);

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

      render(<WorkInfoTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Done' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });
});
