import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BasicInfoTab } from './BasicInfoTab';
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

describe('BasicInfoTab', () => {
  describe('display mode', () => {
    it('renders profile field values', () => {
      mockUseProfileContext.mockReturnValue(baseContext);

      render(<BasicInfoTab />);

      expect(screen.getByText('Jane D.')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('555-0001')).toBeInTheDocument();
    });

    it('shows a loading message while loading', () => {
      mockUseProfileContext.mockReturnValue({ ...baseContext, profile: null, isLoading: true });

      render(<BasicInfoTab />);

      expect(screen.getByText('Loading basic information...')).toBeInTheDocument();
    });

    it('shows an error message when there is an error', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        profile: null,
        error: new Error('fail'),
      });

      render(<BasicInfoTab />);

      expect(screen.getByText('Unable to load profile data.')).toBeInTheDocument();
    });
  });

  describe('edit step', () => {
    it('renders input fields with current values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
      });

      render(<BasicInfoTab />);

      expect(screen.getByDisplayValue('Jane D.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('555-0001')).toBeInTheDocument();
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

      render(<BasicInfoTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(moveToStep).toHaveBeenCalledWith('review');
    });

    it('validates email format on submit', async () => {
      const updateEditedProfile = vi.fn();
      const moveToStep = vi.fn();
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
        updateEditedProfile,
        moveToStep,
      });

      render(<BasicInfoTab />);

      const emailInput = screen.getByDisplayValue('jane@example.com') as HTMLInputElement;
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'invalid-email');

      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
      expect(moveToStep).not.toHaveBeenCalled();
    });

    it('updates editedProfile and calls moveToStep on valid form submit', async () => {
      const updateEditedProfile = vi.fn();
      const moveToStep = vi.fn();
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'edit',
        editedProfile: mockProfile,
        updateEditedProfile,
        moveToStep,
      });

      render(<BasicInfoTab />);

      const nameInput = screen.getByDisplayValue('Jane D.') as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Jane Updated');

      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(updateEditedProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          basic: expect.objectContaining({
            name: 'Jane Updated',
            email: 'jane@example.com',
            phone: '555-0001',
          }),
        })
      );
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

      render(<BasicInfoTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('review step', () => {
    const changedProfile = {
      ...mockProfile,
      basic: { name: 'Jane Updated', email: 'jane@example.com', phone: '555-0001' },
    };

    it('renders current values', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<BasicInfoTab />);

      expect(screen.getByText('Jane Updated')).toBeInTheDocument();
    });

    it('highlights values that differ from original', () => {
      mockUseProfileContext.mockReturnValue({
        ...baseContext,
        isEditMode: true,
        editStep: 'review',
        editedProfile: changedProfile,
        originalProfile: mockProfile,
      });

      render(<BasicInfoTab />);

      const changedEl = screen.getByText('Jane Updated');
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

      render(<BasicInfoTab />);

      const unchangedEl = screen.getByText('jane@example.com');
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

      render(<BasicInfoTab />);

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

      render(<BasicInfoTab />);

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

      render(<BasicInfoTab />);

      await userEvent.click(screen.getByRole('button', { name: 'Done' }));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });
  });
});
