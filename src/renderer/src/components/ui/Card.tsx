import { type HTMLAttributes } from 'react';

export function Card({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border border-surface-border bg-white shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={`p-5 pb-3 border-b border-surface-border/60 dark:border-slate-800/80 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h3 className={`text-base font-bold text-slate-900 dark:text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={`p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl border-t border-surface-border dark:border-slate-800 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
