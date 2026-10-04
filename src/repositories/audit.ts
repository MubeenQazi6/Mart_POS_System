import { getDb } from '../database/client/index';
import { auditLogs } from '../database/schema/index';
import { eq, and, desc, gte, lte, like, or } from 'drizzle-orm';
import type { AuditLogRow, AuditLogFilters } from '@shared/types/auth';

import { getActiveUser, getActiveSessionToken } from './auth';

export interface CreateAuditLogEntry {
  user_id?: number | null;
  username_snapshot?: string | null;
  event_type: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string | null;
  ip_or_source?: string;
  session_id?: string | null;
}

export function logAuditEvent(entry: CreateAuditLogEntry): AuditLogRow {
  const db = getDb();
  const active = getActiveUser();
  const activeToken = getActiveSessionToken();

  const userId = entry.user_id !== undefined ? entry.user_id : (active?.id ?? null);
  const username = entry.username_snapshot !== undefined ? entry.username_snapshot : (active?.username ?? null);
  const sessionId = entry.session_id !== undefined ? entry.session_id : (activeToken ?? null);

  const inserted = db
    .insert(auditLogs)
    .values({
      user_id: userId,
      username_snapshot: username,
      event_type: entry.event_type,
      status: entry.status,
      details: entry.details ?? null,
      ip_or_source: entry.ip_or_source ?? 'local',
      session_id: sessionId,
    })
    .returning()
    .get();

  return {
    ...inserted,
    status: inserted.status as 'SUCCESS' | 'FAILED',
  };
}

export function listAuditLogs(filters: AuditLogFilters = {}): AuditLogRow[] {
  const db = getDb();

  let query = db.select().from(auditLogs);
  const conditions = [];

  if (filters.event_type) {
    conditions.push(eq(auditLogs.event_type, filters.event_type));
  }
  if (filters.user_id !== undefined) {
    conditions.push(eq(auditLogs.user_id, filters.user_id));
  }
  if (filters.status) {
    conditions.push(eq(auditLogs.status, filters.status));
  }
  if (filters.date_from) {
    conditions.push(gte(auditLogs.created_at, filters.date_from));
  }
  if (filters.date_to) {
    conditions.push(lte(auditLogs.created_at, filters.date_to));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(auditLogs.username_snapshot, term),
        like(auditLogs.event_type, term),
        like(auditLogs.details, term),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const baseQuery = query.orderBy(desc(auditLogs.created_at), desc(auditLogs.id));
  const rows =
    typeof filters.limit === 'number' && filters.limit > 0
      ? baseQuery.limit(filters.limit).all()
      : baseQuery.all();
  return rows.map((r) => ({
    ...r,
    status: r.status as 'SUCCESS' | 'FAILED',
  }));
}
