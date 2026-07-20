/**
 * Button Atom Component
 * Demonstrates Single Responsibility Principle (SRP)
 * - Responsible only for rendering a button with consistent styling
 * - Highly reusable
 * - Extensible through composition
 */

import React from 'react';
import { cn } from '@/core/utils/classNameUtils';
import type { IComponentProps } from '@/core/types/common';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface IButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    IComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

/**
 * Button component - atomic building block
 * Open/Closed Principle: Open for extension (variants), closed for modification
 */
export const Button = React.forwardRef<HTMLButtonElement, IButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      testId,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          styles.button,
          styles[`variant-${variant}`],
          styles[`size-${size}`],
          { [styles.fullWidth]: fullWidth },
          className
        )}
        disabled={isLoading || disabled}
        data-testid={testId}
        {...props}
      >
        {isLoading ? (
          <span className={styles.loadingSpinner}>Loading...</span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
