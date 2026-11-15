import { useEffect, useState } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useUsersStore } from '@renderer/stores/usersStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { UserModal } from './UserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserPermissionsModal } from './UserPermissionsModal';
import type { PublicUser } from '@shared/types/auth';
import { UserPlus, KeyRound, Edit2, ShieldAlert, ShieldCheck, Users } from 'lucide-react';

export function UsersPage(): React.JSX.Element {
  const { users, isLoading, loadUsers } = useUsersStore();
  const { can, currentUser } = useAuthStore();
  const canManageUsers = can('users.manage');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<PublicUser | null>(null);
  const [userToReset, setUserToReset] = useState<PublicUser | null>(null);
  const [userToPermissions, setUserToPermissions] = useState<PublicUser | null>(null);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!can('users.view')) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff & User Management"
          description="Manage operator logins, roles, and access permissions"
        />
        <div className="mt-8 p-8 bg-white border border-surface-border rounded-2xl text-center flex flex-col items-center shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <ShieldAlert className="w-12 h-12 text-amber-500 mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            You do not have permission to manage staff accounts. Please contact a system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & User Management"
        description={
          canManageUsers
            ? 'Manage counter operator accounts, staff roles, and access control'
            : 'View staff accounts and assigned roles'
        }
        actions={
          canManageUsers ? (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateOpen(true);
              }}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Staff User
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-surface-border bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading staff accounts..." />
          </div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No Staff Accounts Found"
              description="Create your first cashier or store manager user account."
              action={
                canManageUsers ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsCreateOpen(true);
                    }}
                  >
                    Add Staff User
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="data-table-header">
                <tr>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {u.full_name}{' '}
                        {isCurrent && (
                          <span className="text-[10px] text-brand-600 bg-brand-50 dark:bg-brand-950/60 dark:text-brand-300 px-2 py-0.5 rounded-full ml-1 font-mono font-bold">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono font-medium">{u.username}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            u.role === 'admin'
                              ? 'brand'
                              : u.role === 'store_manager'
                                ? 'warning'
                                : u.role === 'finance'
                                  ? 'success'
                                  : 'neutral'
                          }
                        >
                          {u.role === 'admin'
                            ? 'Administrator'
                            : u.role === 'store_manager'
                              ? 'Store Manager'
                              : u.role === 'finance'
                                ? 'Finance'
                                : 'Cashier'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.is_active ? 'success' : 'danger'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{u.created_at.split('T')[0]}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManageUsers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToPermissions(u);
                              }}
                              title="Screen-level permissions"
                              className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40 p-2 min-h-8"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                          )}
                          {canManageUsers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToReset(u);
                              }}
                              title="Reset password"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 p-2 min-h-8"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          )}
                          {canManageUsers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToEdit(u);
                              }}
                              title="Edit user"
                              className="p-2 min-h-8 text-slate-600 dark:text-slate-300"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <UserModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
          }}
          userToEdit={null}
        />
      )}

      {userToEdit && (
        <UserModal
          isOpen={Boolean(userToEdit)}
          onClose={() => {
            setUserToEdit(null);
          }}
          userToEdit={userToEdit}
        />
      )}

      {userToReset && (
        <ResetPasswordModal
          isOpen={Boolean(userToReset)}
          onClose={() => {
            setUserToReset(null);
          }}
          user={userToReset}
        />
      )}

      {userToPermissions && (
        <UserPermissionsModal
          isOpen={Boolean(userToPermissions)}
          onClose={() => {
            setUserToPermissions(null);
          }}
          user={userToPermissions}
        />
      )}
    </div>
  );
}
