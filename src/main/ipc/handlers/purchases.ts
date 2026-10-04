import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as purchasesRepo from '../../../repositories/purchases';
import type {
  PurchaseRow,
  CreatePurchaseInput,
  PurchaseSearchParams,
  PurchaseKpis,
} from '@shared/types/purchases';

export function registerPurchasesIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.PURCHASES.LIST,
    (_, params: PurchaseSearchParams = {}): Result<PurchaseRow[]> => {
      try {
        const data = purchasesRepo.listPurchases(params);
        return { success: true, data };
      } catch (error) {
        logger.error('purchases', 'Error listing purchases', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES.GET_BY_ID,
    (_, id: number): Result<PurchaseRow> => {
      try {
        const data = purchasesRepo.getPurchaseById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('purchases', `Error fetching purchase ${String(id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES.CREATE,
    (_, input: CreatePurchaseInput): Result<PurchaseRow> => {
      try {
        const data = purchasesRepo.createPurchase(input);
        logger.info('purchases', `Purchase created: ${data.purchase_number} (${String(data.total_minor)} minor)`);
        return { success: true, data };
      } catch (error) {
        logger.error('purchases', 'Error creating purchase', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES.GET_KPIS,
    (): Result<PurchaseKpis> => {
      try {
        const data = purchasesRepo.getPurchaseKpis();
        return { success: true, data };
      } catch (error) {
        logger.error('purchases', 'Error fetching purchase KPIs', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
