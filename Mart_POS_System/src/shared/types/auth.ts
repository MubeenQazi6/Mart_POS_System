// Roles
export type UserRole = 'admin' | 'store_manager' | 'cashier' | 'finance';

// Granular Permissions
export type Permission =
  | 'catalog.manage'
  | 'inventory.adjust'
  | 'inventory.view'
  | 'purchases.manage'
  | 'suppliers.manage'
  | 'customers.manage'
  | 'pos.checkout'
  | 'sales.void'
  | 'sales.reprint'
  | 'sales.discount'
  | 'dashboard.view'
  | 'reports.view'
  | 'reports.export'
  | 'expenses.view'
  | 'expenses.create'
  | 'expenses.edit'
  | 'expenses.void'
  | 'cash.view'
  | 'cash.manage'
  | 'returns.view'
  | 'returns.manage'
  | 'users.view'
  | 'users.manage'
  | 'audit.view'
  | 'settings.manage';

/** Maps each navigation module/screen ID to the base roles that have access by default. */
export const MODULE_ACCESS: Record<string, UserRole[]> = {
  dashboard: ['admin', 'store_manager', 'cashier', 'finance'],
  pos: ['admin', 'store_manager', 'cashier'],
  products: ['admin', 'store_manager', 'cashier'],
  inventory: ['admin', 'store_manager', 'cashier', 'finance'],
  purchases: ['admin', 'store_manager'],
  suppliers: ['admin', 'store_manager'],
  customers: ['admin', 'store_manager', 'cashier'],
  returns: ['admin', 'store_manager', 'cashier'],
  expenses: ['admin', 'store_manager', 'finance'],
  cash: ['admin', 'store_manager', 'finance'],
  reports: ['admin', 'store_manager', 'finance'],
  'barcode-labels': ['admin', 'store_manager'],
  notifications: ['admin', 'store_manager', 'cashier', 'finance'],
  users: ['admin'],
  'audit-logs': ['admin'],
  settings: ['admin'],
} as const;

export const ALL_MODULE_IDS = Object.keys(MODULE_ACCESS);

export function getDefaultModulesForRole(role: UserRole): string[] {
  if (role === 'admin') {
    return ALL_MODULE_IDS;
  }
  return Object.entries(MODULE_ACCESS)
    .filter(([_, roles]) => roles.includes(role))
    .map(([moduleId]) => moduleId);
}

// Role-to-Permissions Matrix
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    'catalog.manage',
    'inventory.adjust',
    'inventory.view',
    'purchases.manage',
    'suppliers.manage',
    'customers.manage',
    'pos.checkout',
    'sales.void',
    'sales.reprint',
    'sales.discount',
    'dashboard.view',
    'reports.view',
    'reports.export',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'expenses.void',
    'cash.view',
    'cash.manage',
    'returns.view',
    'returns.manage',
    'users.view',
    'users.manage',
    'audit.view',
    'settings.manage',
  ],
  store_manager: [
    'catalog.manage',
    'inventory.adjust',
    'inventory.view',
    'purchases.manage',
    'suppliers.manage',
    'customers.manage',
    'pos.checkout',
    'sales.void',
    'sales.reprint',
    'sales.discount',
    'dashboard.view',
    'reports.view',
    'reports.export',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'expenses.void',
    'cash.view',
    'cash.manage',
    'returns.view',
    'returns.manage',
    'users.view',
  ],
  cashier: [
    'pos.checkout',
    'customers.manage',
    'inventory.view',
    'dashboard.view',
    'sales.reprint',
    'returns.view',
    'returns.manage',
  ],
  finance: [
    'dashboard.view',
    'inventory.view',
    'reports.view',
    'reports.export',
    'expenses.view',
    'expenses.create',
    'cash.view',
    'cash.manage',
  ],
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

// User Models
export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Safe Public User (without sensitive hash/salt)
export interface PublicUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  requires_password_change?: boolean;
  allowed_modules?: string[];
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: number;
  token: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export interface AuthSession {
  user: PublicUser;
  token: string;
  expires_at: string;
}

// Inputs
export interface LoginInput {
  username: string;
  password: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  allowed_modules?: string[];
}

export interface UpdateUserInput {
  id: number;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UpdateUserPermissionsInput {
  userId: number;
  allowed_modules: string[];
}

export interface ChangePasswordInput {
  currentPassword?: string; // Optional for admin reset
  newPassword: string;
}

export interface ResetPasswordInput {
  userId: number;
  newPassword: string;
}

// Audit Models
export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_PERMISSIONS_UPDATE'
  | 'STORE_PROFILE_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'STOCK_ADJUSTMENT'
  | 'PURCHASE_CREATE'
  | 'CREDIT_SALE'
  | 'KHATA_PAYMENT';

export interface AuditLogRow {
  id: number;
  user_id: number | null;
  username_snapshot: string | null;
  event_type: string;
  status: 'SUCCESS' | 'FAILED';
  details: string | null;
  ip_or_source: string;
  session_id: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  event_type?: string;
  user_id?: number;
  status?: 'SUCCESS' | 'FAILED';
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}
