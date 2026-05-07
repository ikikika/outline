/**
 * Input Atom Component
 * Single Responsibility: Render accessible input field
 */

import React from 'react';
import { cn } from '@/core/utils/classNameUtils';
import type { IComponentProps } from '@/core/types/common';
import styles from './Input.module.scss';

interface IInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    IComponentProps {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ label, error, helperText, className, testId, ...props }, ref) => {
    const id = props.id || `input-${Math.random()}`;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(styles.input, { [styles.error]: !!error }, className)}
          data-testid={testId}
          {...props}
        />
        {error && <span className={styles.errorText}>{error}</span>}
        {helperText && !error && (
          <span className={styles.helperText}>{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
