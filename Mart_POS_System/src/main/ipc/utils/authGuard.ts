import { getActiveUser } from '../../../repositories/auth';
import { hasPermission, type Permission, type PublicUser } from '@shared/types/auth';

export function assertPermission(permission: Permission): PublicUser {
  const user = getActiveUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required to perform this action.');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Forbidden: Role '${user.role}' lacks '${permission}' permission.`);
  }
  return user;
}
