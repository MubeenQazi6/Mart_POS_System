import { getDb } from '../database/client/index';
import { users, userScreenPermissions } from '../database/schema/index';
import { eq, desc } from 'drizzle-orm';
import { withTransaction } from './base';
import {
  hashPassword,
  toPublicUser,
  getUserAllowedModules,
  getActiveUser,
  getActiveSessionToken,
  setActiveSession,
} from './auth';
import { logAuditEvent } from './audit';
import { ALL_NAV_ITEMS } from '@shared/constants/app';
import type {
  PublicUser,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from '@shared/types/auth';

export function listUsers(): PublicUser[] {
  const db = getDb();
  const rows = db.select().from(users).orderBy(desc(users.created_at)).all();
  return rows.map(toPublicUser);
}

export function getUserById(id: number): PublicUser {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Valid user ID is required');
  }
  const db = getDb();
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) {
    throw new Error(`User with ID ${String(id)} not found`);
  }
  return toPublicUser(row);
}

export function getUserPermissions(userId: number): string[] {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Valid user ID is required');
  }
  const user = getUserById(userId);
  return user.allowed_modules ?? getUserAllowedModules(user.id, user.role);
}

export function updateUserPermissions(userId: number, allowedModules: string[]): PublicUser {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Valid user ID is required');
  }
  if (!Array.isArray(allowedModules)) {
    throw new Error('Allowed modules must be an array of module IDs');
  }

  const user = getUserById(userId);
  const selectedModuleIds = new Set(
    allowedModules
      .filter((moduleId): moduleId is string => typeof moduleId === 'string')
      .map((moduleId) => moduleId.trim()),
  );

  withTransaction((tx) => {
    // Delete existing screen permissions
    tx.delete(userScreenPermissions)
      .where(eq(userScreenPermissions.user_id, userId))
      .run();

    // Insert new screen permissions
    const now = new Date().toISOString();
    for (const item of ALL_NAV_ITEMS) {
      tx.insert(userScreenPermissions)
        .values({
          user_id: userId,
          module_id: item.id,
          is_allowed: selectedModuleIds.has(item.id),
          created_at: now,
          updated_at: now,
        })
        .run();
    }
  });

  const updatedUser = getUserById(userId);
  const activeUser = getActiveUser();
  if (activeUser?.id === userId) {
    setActiveSession(updatedUser, getActiveSessionToken());
  }

  logAuditEvent({
    user_id: user.id,
    username_snapshot: user.username,
    event_type: 'USER_PERMISSIONS_UPDATE',
    status: 'SUCCESS',
    details: `Updated screen-level access permissions for ${user.username} (${String(ALL_NAV_ITEMS.filter((item) => selectedModuleIds.has(item.id)).length)} screens granted)`,
  });

  return updatedUser;
}

export function createUser(input: CreateUserInput): PublicUser {
  if (!input.username.trim()) {
    throw new Error('Username is required');
  }
  if (!input.password || input.password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }
  if (!input.full_name.trim()) {
    throw new Error('Full name is required');
  }
  if (!['admin', 'store_manager', 'cashier', 'finance'].includes(input.role)) {
    throw new Error('Invalid user role');
  }

  const db = getDb();
  const existing = db.select().from(users).where(eq(users.username, input.username.trim().toLowerCase())).get();
  if (existing) {
    throw new Error(`Username "${input.username.trim()}" is already taken`);
  }

  const { hash, salt } = hashPassword(input.password);
  const inserted = db
    .insert(users)
    .values({
      username: input.username.trim().toLowerCase(),
      password_hash: hash,
      salt,
      full_name: input.full_name.trim(),
      role: input.role,
      is_active: true,
    })
    .returning()
    .get();

  if (Array.isArray(input.allowed_modules) && input.allowed_modules.length > 0) {
    const now = new Date().toISOString();
    for (const mod of input.allowed_modules) {
      if (typeof mod === 'string' && mod.trim()) {
        db.insert(userScreenPermissions)
          .values({
            user_id: inserted.id,
            module_id: mod.trim(),
            is_allowed: true,
            created_at: now,
            updated_at: now,
          })
          .run();
      }
    }
  }

  logAuditEvent({
    user_id: inserted.id,
    username_snapshot: inserted.username,
    event_type: 'USER_CREATE',
    status: 'SUCCESS',
    details: `Staff user created: ${inserted.full_name} (${inserted.role})`,
  });

  return getUserById(inserted.id);
}

export function updateUser(input: UpdateUserInput): PublicUser {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('Valid user ID is required');
  }

  const db = getDb();
  const existing = db.select().from(users).where(eq(users.id, input.id)).get();
  if (!existing) {
    throw new Error(`User with ID ${String(input.id)} not found`);
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updated_at: new Date().toISOString(),
  };

  if (input.full_name !== undefined) {
    if (!input.full_name.trim()) throw new Error('Full name cannot be empty');
    updateData.full_name = input.full_name.trim();
  }
  if (input.role !== undefined) {
    if (!['admin', 'store_manager', 'cashier', 'finance'].includes(input.role)) throw new Error('Invalid role');
    updateData.role = input.role;
  }
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active;
  }

  db.update(users).set(updateData).where(eq(users.id, input.id)).run();

  logAuditEvent({
    user_id: existing.id,
    username_snapshot: existing.username,
    event_type: 'USER_UPDATE',
    status: 'SUCCESS',
    details: `Staff profile updated for ${existing.username}`,
  });

  return getUserById(input.id);
}

export function resetUserPassword(input: ResetPasswordInput): void {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error('Valid user ID is required');
  }
  if (!input.newPassword || input.newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters');
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, input.userId)).get();
  if (!user) {
    throw new Error(`User with ID ${String(input.userId)} not found`);
  }

  const { hash, salt } = hashPassword(input.newPassword);
  db.update(users)
    .set({
      password_hash: hash,
      salt,
      updated_at: new Date().toISOString(),
    })
    .where(eq(users.id, input.userId))
    .run();

  logAuditEvent({
    user_id: user.id,
    username_snapshot: user.username,
    event_type: 'PASSWORD_RESET',
    status: 'SUCCESS',
    details: `Administrator reset password for ${user.username}`,
  });
}
