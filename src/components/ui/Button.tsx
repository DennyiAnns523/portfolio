import React from 'react';
import { cn } from '@/lib/utils';

// Local Slot to avoid the @radix dependency
const Slot = React.forwardRef<any, React.HTMLAttributes<HTMLElement>>(({ children, className, ...props }, ref) => {
  if (!React.isValidElement(children)) return null;
  const child = React.Children.only(children) as React.ReactElement<any>;
  const mergedClassName = [child.props?.className, className].filter(Boolean).join(' ');
  return React.cloneElement(child, {
    ref,
    className: mergedClassName,
    ...props,
  } as any);
});
Slot.displayName = 'Slot';

export type ButtonVariant = 'solid' | 'ghost' | 'outline' | 'link' | 'secondary';
export type ButtonSize = 'icon' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantStyles: Record<ButtonVariant, string> = {
  solid:
    'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
  ghost:
    'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
  outline:
    'bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
  link: 'bg-transparent underline-offset-4 hover:underline px-0 py-0',
  // neutral secondary — your Project component overrides with className, so keep it simple:
  secondary: 'bg-transparent text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  icon: 'p-2 h-9 w-9',
  sm: 'px-2.5 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'solid', size = 'md', children, disabled, asChild = false, loading = false, ...props }, ref) => {
    const classes = cn(base, variantStyles[variant], sizeStyles[size], className);

    if (asChild && React.isValidElement(children)) {
      return (
        <Slot
          ref={ref}
          className={classes}
          aria-busy={loading || undefined}
          data-loading={loading ? true : undefined}
          {...(props as any)}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="inline-flex items-center mr-2" aria-hidden>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="sr-only">Loading</span>
          </span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
