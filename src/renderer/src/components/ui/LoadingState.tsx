interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 ${className}`} role="status" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-brand-200 border-t-brand-600 dark:border-brand-900/60 dark:border-t-brand-400" />
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}
