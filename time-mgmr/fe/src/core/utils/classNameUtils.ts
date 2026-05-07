/**
 * Utility functions for class name manipulation
 */

type ClassValue = string | undefined | null | boolean | Record<string, boolean>;

/**
 * Combines multiple class names, filtering out falsy values
 * Similar to clsx or classnames library
 */
export const cn = (...classes: (ClassValue | ClassValue[])[]): string => {
  return classes
    .flat()
    .reduce((acc: string, cls: ClassValue) => {
      if (typeof cls === 'string') {
        return acc ? `${acc} ${cls}` : cls;
      }
      if (typeof cls === 'object' && cls !== null) {
        const objectClasses = Object.entries(cls)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(' ');
        return acc ? `${acc} ${objectClasses}` : objectClasses;
      }
      return acc;
    }, '');
};

export default cn;
