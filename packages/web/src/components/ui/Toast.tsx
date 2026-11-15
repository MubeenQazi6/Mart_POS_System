import { type ReactNode, useState, useEffect, useRef, Fragment } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; bg: string; border: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/90',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  error: {
    icon: XCircle,
    bg: 'bg-rose-50 dark:bg-rose-950/90',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-800 dark:text-rose-200',
  },
  info: {
    icon: Info,
    bg: 'bg-brand-50 dark:bg-brand-950/90',
    border: 'border-brand-200 dark:border-brand-800',
    text: 'text-brand-800 dark:text-brand-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/90',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
  },
};

let toastIdCounter = 0;
let addToastGlobal: ((variant: ToastVariant, message: string) => void) | null = null;
let lastToastKey = '';
let lastToastTimestamp = 0;

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(variant: ToastVariant, message: string): void {
  const now = Date.now();
  const key = `${variant}:${message}`;
  if (key === lastToastKey && now - lastToastTimestamp < 500) {
    return;
  }
  lastToastKey = key;
  lastToastTimestamp = now;
  addToastGlobal?.(variant, message);
}

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    addToastGlobal = (variant: ToastVariant, message: string) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, variant, message }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 4000);
      timersRef.current.set(id, timer);
    };
    const currentTimers = timersRef.current;
    return () => {
      addToastGlobal = null;
      currentTimers.forEach((t) => {
        clearTimeout(t);
      });
    };
  }, []);

  const dismiss = (id: number): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant];
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-xl ${config.bg} ${config.border} animate-in slide-in-from-right duration-200`}
              role="alert"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.text}`} />
                <div className={`text-xs font-semibold ${config.text} break-words leading-relaxed`}>
                  {toast.message.split(/<br\s*\/?>|\n/i).map((line, idx, arr) => (
                    <Fragment key={idx}>
                      {line}
                      {idx < arr.length - 1 && <br />}
                    </Fragment>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { dismiss(toast.id); }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${config.text} opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity`}
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
