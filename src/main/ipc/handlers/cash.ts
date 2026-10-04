import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as cashRepo from '../../../repositories/cash';
import type {
  CashSessionRow,
  CashMovementRow,
  OpenCashSessionInput,
  CashMovementInput,
  CloseCashSessionInput,
  CashRegisterReport,
  CashReportFilters,
  CashShiftReportData,
  CashExportInput,
  CashExportResult,
} from '@shared/types/cash';

import { assertPermission } from '../utils/authGuard';
import { exportReport } from '../../services/exportService';

export function registerCashIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.CASH.LIST_SESSIONS,
    (): Result<CashSessionRow[]> => {
      try {
        assertPermission('cash.view');
        return { success: true, data: cashRepo.listCashSessions() };
      } catch (error) {
        logger.error('cash', 'Error listing cash sessions', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.OPEN_SESSION,
    (_, input: OpenCashSessionInput): Result<CashSessionRow> => {
      try {
        const user = assertPermission('cash.manage');
        const data = cashRepo.openCashSession({ ...input, opened_by: user.id });
        return { success: true, data };
      } catch (error) {
        logger.error('cash', 'Error opening cash session', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.GET_CURRENT,
    (): Result<CashSessionRow | null> => {
      try {
        assertPermission('cash.view');
        const data = cashRepo.getCurrentCashSession();
        return { success: true, data };
      } catch (error) {
        logger.error('cash', 'Error fetching current cash session', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.LIST_MOVEMENTS,
    (_, sessionId: number): Result<CashMovementRow[]> => {
      try {
        assertPermission('cash.view');
        const data = cashRepo.getCashMovements(sessionId);
        return { success: true, data };
      } catch (error) {
        logger.error('cash', `Error fetching cash movements for session ${String(sessionId)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.CASH_IN,
    (_, input: Omit<CashMovementInput, 'movement_type'>): Result<CashMovementRow> => {
      try {
        const user = assertPermission('cash.manage');
        const data = cashRepo.recordCashIn({ ...input, created_by: user.id });
        return { success: true, data };
      } catch (error) {
        logger.error('cash', 'Error posting cash-in movement', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.CASH_OUT,
    (_, input: Omit<CashMovementInput, 'movement_type'>): Result<CashMovementRow> => {
      try {
        const user = assertPermission('cash.manage');
        const data = cashRepo.recordCashOut({ ...input, created_by: user.id });
        return { success: true, data };
      } catch (error) {
        logger.error('cash', 'Error posting cash-out movement', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.CLOSE_SESSION,
    (_, input: CloseCashSessionInput): Result<CashSessionRow> => {
      try {
        const user = assertPermission('cash.manage');
        const data = cashRepo.closeCashSession({ ...input, closed_by: user.id });
        return { success: true, data };
      } catch (error) {
        logger.error('cash', `Error closing cash session ${String(input.session_id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.GET_REPORT,
    (_, sessionId?: number): Result<CashRegisterReport> => {
      try {
        assertPermission('cash.view');
        const data = cashRepo.getCashRegisterReport(sessionId);
        return { success: true, data };
      } catch (error) {
        logger.error('cash', 'Error generating cash register report', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.GET_SHIFT_REPORT,
    (_, filters: CashReportFilters = {}): Result<CashShiftReportData> => {
      try {
        assertPermission('cash.view');
        return { success: true, data: cashRepo.getCashShiftReport(filters) };
      } catch (error) {
        logger.error('cash', 'Error generating filtered cash shift report', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CASH.EXPORT_REPORT,
    async (_, input: CashExportInput): Promise<Result<CashExportResult>> => {
      try {
        assertPermission('cash.view');
        return { success: true, data: await exportReport(input) };
      } catch (error) {
        logger.error('cash', 'Error exporting cash shift report', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );
}