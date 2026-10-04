import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as auditRepo from '../../../repositories/audit';
import type {
  AuditLogRow,
  AuditLogFilters,
} from '@shared/types/auth';

import { assertPermission } from '../utils/authGuard';

export function registerAuditIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.AUDIT.LIST,
    (_, filters: AuditLogFilters = {}): Result<AuditLogRow[]> => {
      try {
        assertPermission('audit.view');
        const data = auditRepo.listAuditLogs(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('audit', 'Error listing audit logs', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
