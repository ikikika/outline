/**
 * FormField Molecule Component
 * Demonstrates composition and reusability
 * Combines atoms (Input, Label, ErrorText) into a cohesive unit
 * Follows: Open/Closed Principle - open for extension via variants
 */

import React, { useId, useMemo } from 'react';
import { Input } from '@/components/ui';
import type { IComponentProps } from '@/core/types/common';
import styles from './FormField.module.scss';

type FieldType = 'text' | 'email' | 'password' | 'number';

interface IFormFieldProps extends IComponentProps {
  label: string;
  type?: FieldType;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

/**
 * FormField - Molecule component
 * Manages validation state and accessibility for form inputs
 * Dependencies injected (Input component)
 */
export const FormField: React.FC<IFormFieldProps> = ({
  label,
  type = 'text',
  placeholder,
  value = '',
  onChange,
  onBlur,
  error,
  required,
  disabled,
  helperText,
  className,
  testId,
}) => {
  const inputId = useId();
  const isInvalid = useMemo(() => !!error, [error]);
  const containerClassName = className
    ? `${styles.container} ${className}`
    : styles.container;

  return (
    <div className={containerClassName} data-testid={testId}>
      <label htmlFor={inputId} className={styles.label}>{label}</label>
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-invalid={isInvalid}
      />
      {error && <span className={styles.error} role="alert">{error}</span>}
      {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
};

export default FormField;
