import { getDb } from '../database/client/index';
import { settings } from '../database/schema/index';
import { eq } from 'drizzle-orm';
import { withTransaction } from './base';
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from '../shared/types/settings';
import { logAuditEvent } from './audit';

/**
 * Parse raw string value from DB into appropriate JS type.
 */
function parseValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Stringify value for DB storage.
 */
function serializeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Retrieve all application settings merged with defaults.
 */
export function getAllSettings(): AppSettings {
  const db = getDb();
  const rows = db.select().from(settings).all();
  
  const current: Record<string, unknown> = {};
  for (const row of rows) {
    current[row.key] = parseValue(row.value);
  }

  return {
    ...DEFAULT_SETTINGS,
    ...current,
  };
}

/**
 * Get a single setting value by key, falling back to default.
 */
export function getSetting<K extends SettingKey>(key: K): AppSettings[K] {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  
  if (!row) {
    return DEFAULT_SETTINGS[key];
  }

  const parsed = parseValue(row.value) as AppSettings[K];
  return parsed ?? DEFAULT_SETTINGS[key];
}

/**
 * Set a single setting value.
 */
export function setSetting(key: string, value: unknown): void {
  const now = new Date().toISOString();
  const serialized = serializeValue(value);

  withTransaction((tx) => {
    const existing = tx.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      tx.update(settings)
        .set({ value: serialized, updated_at: now })
        .where(eq(settings.key, key))
        .run();
    } else {
      tx.insert(settings)
        .values({ key, value: serialized, updated_at: now })
        .run();
    }
  });

  logAuditEvent({
    event_type: 'SETTINGS_UPDATE',
    status: 'SUCCESS',
    details: `Updated setting ${key}`,
  });
}

/**
 * Set multiple settings in a single atomic transaction.
 */
export function setManySettings(newSettings: Record<string, unknown>): void {
  const now = new Date().toISOString();

  withTransaction((tx) => {
    for (const [key, value] of Object.entries(newSettings)) {
      const serialized = serializeValue(value);
      const existing = tx.select().from(settings).where(eq(settings.key, key)).get();
      if (existing) {
        tx.update(settings)
          .set({ value: serialized, updated_at: now })
          .where(eq(settings.key, key))
          .run();
      } else {
        tx.insert(settings)
          .values({ key, value: serialized, updated_at: now })
          .run();
      }
    }
  });

  const isStoreUpdate = Object.keys(newSettings).some((k) => k.startsWith('store.'));
  logAuditEvent({
    event_type: isStoreUpdate ? 'STORE_PROFILE_UPDATE' : 'SETTINGS_UPDATE',
    status: 'SUCCESS',
    details: isStoreUpdate
      ? 'Updated store business profile and branding configuration'
      : `Updated ${Object.keys(newSettings).length.toString()} settings`,
  });
}

/**
 * Seed initial default settings if table is empty.
 */
export function seedDefaultSettingsIfEmpty(): void {
  const db = getDb();
  const count = db.select().from(settings).all().length;
  if (count === 0) {
    setManySettings(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
  }
}
