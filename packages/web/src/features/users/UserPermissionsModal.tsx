import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Badge } from '@renderer/components/ui/Badge';
import { useUsersStore } from '@renderer/stores/usersStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { NAV_SECTIONS, ALL_NAV_ITEMS } from '@shared/constants/app';
import { getDefaultModulesForRole } from '@shared/types/auth';
import type { PublicUser } from '@shared/types/auth';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Building2,
  Users as UsersIcon,
  RotateCcw as ReturnsIcon,
  Receipt,
  Wallet,
  BarChart3,
  Barcode,
  Bell,
  Activity,
  Settings,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Building2,
  Users: UsersIcon,
  RotateCcw: ReturnsIcon,
  Receipt,
  Wallet,
  BarChart3,
  Barcode,
  Bell,
  ShieldCheck,
  Activity,
  Settings,
};

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: PublicUser;
}

export function UserPermissionsModal({
  isOpen,
  onClose,
  user,
}: UserPermissionsModalProps): React.JSX.Element | null {
  const { updateUserPermissions } = useUsersStore();
  const { currentUser, initAuth } = useAuthStore();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [originalModules, setOriginalModules] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsConfirmOpen(false);
    setError(null);

    const loadPermissions = async (): Promise<void> => {
      const fallback = Array.isArray(user.allowed_modules)
        ? [...user.allowed_modules]
        : getDefaultModulesForRole(user.role);

      const martpos = window.martpos;
      const result = martpos?.users
        ? await martpos.users.getPermissions(user.id)
        : { success: false, error: 'Permissions API is unavailable.' };
      const initial = result.success && 'data' in result ? result.data : fallback;

      if (!cancelled) {
        setSelectedModules(initial);
        setOriginalModules(initial);
        if (!result.success) setError(result.error);
      }
    };

    void loadPermissions();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  const handleToggleModule = (moduleId: string): void => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  };

  const handleGrantAll = (): void => {
    setSelectedModules(ALL_NAV_ITEMS.map((item) => item.id));
  };

  const handleRevokeAll = (): void => {
    setSelectedModules([]);
  };

  const handleResetToRoleDefault = (): void => {
    setSelectedModules(getDefaultModulesForRole(user.role));
  };

  const grantedCount = selectedModules.filter((id) => !originalModules.includes(id)).length;
  const revokedCount = originalModules.filter((id) => !selectedModules.includes(id)).length;

  const handleOpenConfirmOrSave = (): void => {
    if (grantedCount === 0 && revokedCount === 0) {
      void executeSave();
      return;
    }
    setIsConfirmOpen(true);
  };

  const executeSave = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const success = await updateUserPermissions(user.id, selectedModules);
      if (success) {
        // If current user modified their own permissions, refresh session
        if (currentUser?.id === user.id) {
          await initAuth();
        }
        setIsConfirmOpen(false);
        onClose();
      } else {
        setError('Failed to update screen permissions.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Screen-Level Access Control: ${user.full_name}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* User Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-sm font-mono">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {user.full_name}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  (@{user.username})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Assigned Role:{' '}
                <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {user.role.replace('_', ' ')}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="brand" className="text-xs py-1 px-2.5 font-bold">
              {selectedModules.length} of {ALL_NAV_ITEMS.length} Screens Active
            </Badge>
          </div>
        </div>

        {/* Quick Batch Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Available Application Modules
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGrantAll}
              className="text-[11px] h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Grant All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRevokeAll}
              className="text-[11px] h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Revoke All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToRoleDefault}
              className="text-[11px] h-7 px-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Role Defaults
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Modules Grouped by Navigation Sections */}
        <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
          {NAV_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-surface-border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {section.title}
                </h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {section.items.filter((item) => selectedModules.includes(item.id)).length}/
                  {section.items.length} Allowed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const isChecked = selectedModules.includes(item.id);
                  const Icon = iconMap[item.iconName] || ShieldCheck;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 dark:border-brand-500/80 dark:bg-brand-950/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          handleToggleModule(item.id);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isChecked
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold truncate ${
                              isChecked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Changes take effect upon next login or session refresh.
          </p>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenConfirmOrSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Permissions...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => {
            if (!isSubmitting) setIsConfirmOpen(false);
          }}
          title="Confirm Permission Changes"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Update screen permissions for {user.full_name}?
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  You are about to{' '}
                  <strong>
                    grant {grantedCount} screen{grantedCount === 1 ? '' : 's'}
                  </strong>{' '}
                  and{' '}
                  <strong>
                    revoke {revokedCount} screen{revokedCount === 1 ? '' : 's'}
                  </strong>{' '}
                  for <strong>@{user.username}</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Continue and apply these screen permission changes?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-border dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsConfirmOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void executeSave()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
