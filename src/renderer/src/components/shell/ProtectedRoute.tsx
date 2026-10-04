import { useAuthStore } from '@renderer/stores/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '@shared/constants/app';

interface ProtectedRouteProps {
  moduleId: string;
  children: React.ReactNode;
}

/**
 * Wraps a route and blocks access if the current user does not have permission for the given moduleId.
 */
export function ProtectedRoute({
  moduleId,
  children,
}: ProtectedRouteProps): React.JSX.Element {
  const { canAccessModule, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const hasAccess = isAuthenticated && canAccessModule(moduleId);

  if (!hasAccess) {
    const firstAllowedItem = ALL_NAV_ITEMS.find((item) => canAccessModule(item.id));
    const targetPath = firstAllowedItem?.path || '/dashboard';

    return (
      <div className="flex h-[75vh] w-full flex-col items-center justify-center p-6 text-center select-none animate-in fade-in zoom-in-95 duration-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4 ring-4 ring-amber-500/20 shadow-md">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400">
          Your operator account does not have screen-level permission to access this module ({moduleId}). Please contact your system administrator to update your permissions.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigate(-1);
            }}
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Go Back
          </Button>
          {firstAllowedItem && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigate(targetPath);
              }}
            >
              Open {firstAllowedItem.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
