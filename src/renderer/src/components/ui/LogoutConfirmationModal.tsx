// src/renderer/components/ui/LogoutConfirmationModal.tsx

import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: LogoutConfirmationModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Logout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to sign out?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You will be redirected to the login screen. Any unsaved changes will be lost.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Logging out...
              </>
            ) : (
              'Yes, Logout'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
