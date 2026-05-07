import React from 'react';
import styles from './StepTracker.module.scss';

export interface StepTrackerStep {
  id: string | number;
  label: string;
}

interface StepTrackerProps {
  steps: StepTrackerStep[];
  currentStep: string | number;
}

export const StepTracker: React.FC<StepTrackerProps> = ({ steps, currentStep }) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className={styles.stepTracker}>
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`${styles.stepItem} ${isCurrent ? styles.active : ''} ${
                  isCompleted ? styles.completed : ''
                }`}
              >
                <div className={styles.stepNumber}>
                  {isCompleted ? <span className={styles.checkmark}>✓</span> : index + 1}
                </div>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`${styles.connector} ${isCompleted ? styles.completed : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
