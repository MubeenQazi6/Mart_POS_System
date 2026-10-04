import { forwardRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { sanitizeNonNegativeInput } from '@shared/utils/validation';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, onChange, onKeyDown, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : 'input');
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const describedBy = errorId ?? hintId;

    const handleChange: InputProps['onChange'] = (event) => {
      if (props.type === 'number') {
        const sanitizedValue = sanitizeNonNegativeInput(event.target.value);
        if (sanitizedValue !== event.target.value) {
          const nextEvent = {
            ...event,
            target: {
              ...event.target,
              value: sanitizedValue,
            },
          } as typeof event;
          onChange?.(nextEvent);
          return;
        }
      }
      onChange?.(event);
    };

    const handleKeyDown: InputProps['onKeyDown'] = (event: KeyboardEvent<HTMLInputElement>) => {
      if (props.type === 'number' && (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
      }
      onKeyDown?.(event);
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
            {props.required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
              error
                ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500 dark:border-rose-700'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
            } ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            {...props}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
