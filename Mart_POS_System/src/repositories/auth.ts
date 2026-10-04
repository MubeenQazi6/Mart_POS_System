import crypto from 'node:crypto';
import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { users, sessions, userScreenPermissions } from '../database/schema/index';
import { eq, and, desc, gt } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  PublicUser,
  LoginInput,
  ChangePasswordInput,
} from '@shared/types/auth';
import { getDefaultModulesForRole } from '@shared/types/auth';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, generatedSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: generatedSalt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    if (keyBuffer.length !== hashBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch {
    return false;
  }
}

export function getUserAllowedModules(userId: number, role: string): string[] {
  try {
    const db = getDb();
    const rows = db
      .select()
      .from(userScreenPermissions)
      .where(eq(userScreenPermissions.user_id, userId))
      .all();
    if (rows && rows.length > 0) {
      return rows.filter((r) => r.is_allowed).map((r) => r.module_id);
    }
  } catch {
    // If table not yet created or migration pending, fallback to role default
  }
  return getDefaultModulesForRole(role as PublicUser['role']);
}

export function toPublicUser(row: {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): PublicUser {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    role: row.role as PublicUser['role'],
    is_active: row.is_active,
    allowed_modules: getUserAllowedModules(row.id, row.role),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// In-memory active session tracking for main process
let activeSessionToken: string | null = null;
let activeUser: PublicUser | null = null;

export function getActiveUser(): PublicUser | null {
  return activeUser;
}

export function getActiveSessionToken(): string | null {
  return activeSessionToken;
}

export function setActiveSession(user: PublicUser | null, token: string | null): void {
  activeUser = user;
  activeSessionToken = token;
}

export function invalidateAllSessions(): void {
  const db = getDb();
  db.update(sessions)
    .set({ is_active: false })
    .run();
  setActiveSession(null, null);
}

export function restoreActiveSession(): PublicUser | null {
  if (activeUser && activeSessionToken) return activeUser;

  const db = getDb();
  const session = db
    .select({
      token: sessions.token,
      id: users.id,
      username: users.username,
      password_hash: users.password_hash,
      salt: users.salt,
      full_name: users.full_name,
      role: users.role,
      is_active: users.is_active,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(and(
      eq(sessions.is_active, true),
      eq(users.is_active, true),
      gt(sessions.expires_at, new Date().toISOString()),
    ))
    .orderBy(desc(sessions.created_at))
    .limit(1)
    .get();

  if (!session) {
    setActiveSession(null, null);
    return null;
  }

  const publicUser = toPublicUser(session);
  if (session.username === 'admin' && verifyPassword('admin123', session.password_hash, session.salt)) {
    publicUser.requires_password_change = true;
  }
  setActiveSession(publicUser, session.token);
  return publicUser;
}

export function ensureDefaultAdmin(): void {
  const db = getDb();
  const count = db.select().from(users).all().length;
  if (count === 0) {
    const { hash, salt } = hashPassword('admin123');
    db.insert(users).values({
      username: 'admin',
      password_hash: hash,
      salt,
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true,
    }).run();
    logAuditEvent({
      event_type: 'USER_CREATE',
      status: 'SUCCESS',
      username_snapshot: 'admin',
      details: 'Default administrative account initialized',
    });
  }
}

export function login(input: LoginInput): PublicUser {
  if (!input.username.trim() || !input.password) {
    logAuditEvent({
      event_type: 'LOGIN_FAILED',
      status: 'FAILED',
      username_snapshot: input.username || 'unknown',
      details: 'Empty credentials provided',
    });
    throw new Error('Invalid username or password');
  }

  const db = getDb();
  const user = db
    .select()
    .from(users)
    .where(eq(users.username, input.username.trim()))
    .get();

  if (!user) {
    logAuditEvent({
      event_type: 'LOGIN_FAILED',
      status: 'FAILED',
      username_snapshot: input.username.trim(),
      details: 'User does not exist',
    });
    throw new Error('Invalid username or password');
  }

  if (!user.is_active) {
    logAuditEvent({
      user_id: user.id,
      username_snapshot: user.username,
      event_type: 'LOGIN_FAILED',
      status: 'FAILED',
      details: 'Deactivated account login attempt',
    });
    throw new Error('Account is deactivated. Please contact store administrator.');
  }

  const isPasswordValid = verifyPassword(input.password, user.password_hash, user.salt);
  if (!isPasswordValid) {
    logAuditEvent({
      user_id: user.id,
      username_snapshot: user.username,
      event_type: 'LOGIN_FAILED',
      status: 'FAILED',
      details: 'Incorrect password entered',
    });
    throw new Error('Invalid username or password');
  }

  // Create session in database
  const sessionId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  withTransaction((tx) => {
    // Invalidate previous sessions
    tx.update(sessions)
      .set({ is_active: false })
      .where(and(eq(sessions.user_id, user.id), eq(sessions.is_active, true)))
      .run();

    tx.insert(sessions).values({
      id: sessionId,
      user_id: user.id,
      token,
      is_active: true,
      expires_at: expiresAt,
    }).run();
  });

  const publicUser = toPublicUser(user);
  if (user.username === 'admin' && verifyPassword('admin123', user.password_hash, user.salt)) {
    publicUser.requires_password_change = true;
  }

  setActiveSession(publicUser, token);

  logAuditEvent({
    user_id: user.id,
    username_snapshot: user.username,
    event_type: 'LOGIN_SUCCESS',
    status: 'SUCCESS',
    session_id: sessionId,
    details: `User ${user.username} authenticated successfully as ${user.role}`,
  });

  return publicUser;
}

export function logout(): void {
  const current = activeUser;
  const token = activeSessionToken;

  if (token) {
    const db = getDb();
    db.update(sessions)
      .set({ is_active: false })
      .where(eq(sessions.token, token))
      .run();
  }

  if (current) {
    logAuditEvent({
      user_id: current.id,
      username_snapshot: current.username,
      event_type: 'LOGOUT',
      status: 'SUCCESS',
      details: `User ${current.username} logged out`,
    });
  }

  setActiveSession(null, null);
}

export function changePassword(input: ChangePasswordInput): void {
  const current = activeUser;
  if (!current) {
    throw new Error('You must be authenticated to change your password');
  }
  if (!input.newPassword || input.newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters long');
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, current.id)).get();
  if (!user) {
    throw new Error('User record not found');
  }

  if (input.currentPassword) {
    const valid = verifyPassword(input.currentPassword, user.password_hash, user.salt);
    if (!valid) {
      logAuditEvent({
        user_id: current.id,
        username_snapshot: current.username,
        event_type: 'PASSWORD_CHANGE',
        status: 'FAILED',
        details: 'Incorrect current password provided',
      });
      throw new Error('Current password is incorrect');
    }
  }

  const { hash, salt } = hashPassword(input.newPassword);
  db.update(users)
    .set({
      password_hash: hash,
      salt,
      updated_at: new Date().toISOString(),
    })
    .where(eq(users.id, current.id))
    .run();

  logAuditEvent({
    user_id: current.id,
    username_snapshot: current.username,
    event_type: 'PASSWORD_CHANGE',
    status: 'SUCCESS',
    details: 'User updated their password successfully',
  });
}
