import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="card max-w-md p-6 text-center shadow-md mx-auto" role="alert">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="primary" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
