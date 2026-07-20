import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepTracker } from './StepTracker';

const steps = [
  { id: 'edit', label: 'Edit' },
  { id: 'review', label: 'Review' },
  { id: 'success', label: 'Success' },
];

describe('StepTracker', () => {
  it('renders all step labels', () => {
    render(<StepTracker steps={steps} currentStep="edit" />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows step numbers for current and future steps', () => {
    render(<StepTracker steps={steps} currentStep="edit" />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows no checkmarks when the first step is active', () => {
    render(<StepTracker steps={steps} currentStep="edit" />);

    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('shows a checkmark for each completed step', () => {
    render(<StepTracker steps={steps} currentStep="review" />);

    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks).toHaveLength(1);
  });

  it('shows checkmarks for all steps before the current one', () => {
    render(<StepTracker steps={steps} currentStep="success" />);

    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks).toHaveLength(2);
  });

  it('shows step number (not checkmark) for the current step', () => {
    render(<StepTracker steps={steps} currentStep="review" />);

    // Current step index is 1 → shows "2"
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders connectors between steps', () => {
    const { container } = render(<StepTracker steps={steps} currentStep="edit" />);

    // There should be (steps.length - 1) connectors
    const connectors = container.querySelectorAll('[class*="connector"]');
    expect(connectors).toHaveLength(steps.length - 1);
  });

  it('renders correct number of steps', () => {
    const { container } = render(<StepTracker steps={steps} currentStep="edit" />);

    const stepItems = container.querySelectorAll('[class*="stepItem"]');
    expect(stepItems).toHaveLength(steps.length);
  });

  it('marks the current step with the active CSS class', () => {
    const { container } = render(<StepTracker steps={steps} currentStep="review" />);

    const activeItems = container.querySelectorAll('[class*="active"]');
    expect(activeItems).toHaveLength(1);
  });
});
