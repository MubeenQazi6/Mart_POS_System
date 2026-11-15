import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/dashboard';
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div className="flex h-full min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="card w-full max-w-lg p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <AlertOctagon className="h-8 w-8" aria-hidden="true" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              An unexpected error occurred in the user interface. You can safely reload the view or return to the main dashboard.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                onClick={this.handleReload}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reload Application
              </Button>
              <Button
                variant="secondary"
                onClick={this.handleGoHome}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Go to Dashboard
              </Button>
            </div>

            {isDev && this.state.error && (
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 text-left">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none"
                >
                  {this.state.showDetails ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Technical Diagnostics (Developer Mode)
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-3 text-xs font-mono text-rose-300 border border-slate-800">
                    <p className="font-semibold text-white">{this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
