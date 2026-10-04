import { getActiveUser } from '../../../repositories/auth';
import { hasPermission, type Permission, type PublicUser } from '@shared/types/auth';

export function assertPermission(permission: Permission): PublicUser {
  const user = getActiveUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required to perform this action.');
  }
  if (!hasPermission(user.role, permission, user.allowed_modules)) {
    throw new Error(`Forbidden: Role '${user.role}' lacks '${permission}' permission.`);
  }
  return user;
}

/**
 * Asserts that the currently authenticated user is an admin or store_manager.
 * Used to gate sensitive catalog operations (update/delete product or variant).
 */
export function assertAdminOrManager(): PublicUser {
  const user = getActiveUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required to perform this action.');
  }
  if (user.role !== 'admin' && user.role !== 'store_manager') {
    throw new Error(
      `Forbidden: Only Admin or Store Manager can perform this action. Your role is '${user.role}'.`
    );
  }
  return user;
}
