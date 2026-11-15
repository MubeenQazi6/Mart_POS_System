import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { useUsersStore } from '@renderer/stores/usersStore';
import type { PublicUser, UserRole } from '@shared/types/auth';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: PublicUser | null;
}

export function UserModal({
  isOpen,
  onClose,
  userToEdit,
}: UserModalProps): React.JSX.Element | null {
  const { createUser, updateUser } = useUsersStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or userToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setUsername(userToEdit.username);
        setPassword('');
        setFullName(userToEdit.full_name);
        setRole(userToEdit.role);
        setIsActive(userToEdit.is_active);
      } else {
        setUsername('');
        setPassword('');
        setFullName('');
        setRole('cashier');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!userToEdit && (!username.trim() || !password || password.length < 4)) {
      setError('Username and password (min 4 chars) are required');
      return;
    }
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (userToEdit) {
        const success = await updateUser({
          id: userToEdit.id,
          full_name: fullName.trim(),
          role,
          is_active: isActive,
        });
        if (success) {
          onClose();
        } else {
          setError('Failed to update user');
        }
      } else {
        const created = await createUser({
          username: username.trim(),
          password,
          full_name: fullName.trim(),
          role,
        });
        if (created) {
          onClose();
        } else {
          setError('Failed to create user');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? `Edit Staff Member: ${userToEdit.username}` : 'Register New Staff Member'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Username / Counter Login ID *
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={Boolean(userToEdit)}
            placeholder="e.g. cashier01"
            required={!userToEdit}
          />
        </div>

        {!userToEdit && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Initial Password *
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Muhammad Ali"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Assigned Role & Permissions *
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'cashier', label: 'Cashier (POS Checkout & Customers only)' },
              { value: 'finance', label: 'Finance (Reports, Cash Management & Expenses)' },
              {
                value: 'store_manager',
                label: 'Store Manager (POS, Inventory, Purchases, Reports)',
              },
              { value: 'admin', label: 'Administrator (Full Access & User Control)' },
            ]}
          />
        </div>

        {userToEdit && (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_staff"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="is_active_staff"
              className="text-xs text-slate-300 font-medium cursor-pointer"
            >
              Active Account (unchecked prevents login)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : userToEdit ? 'Update Profile' : 'Create Staff User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
