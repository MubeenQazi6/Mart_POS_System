import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as salesRepo from '../../../repositories/sales';
import type {
  CreateSaleInput,
  SaleRow,
  SaleSearchParams,
  HoldBillInput,
  HeldBillRow,
  PosLookupResult,
} from '@shared/types/sales';
import { assertPermission } from '../utils/authGuard';

export function registerSalesIpcHandlers(): void {
  // --- CREATE SALE ---
  ipcMain.handle(
    IPC_CHANNELS.SALES.CREATE,
    (_, input: CreateSaleInput): Result<SaleRow> => {
      try {
        if (input.items.length === 0) {
          throw new Error('Sale must contain at least one item');
        }
        if (input.payments.length === 0) {
          throw new Error('Sale must contain at least one payment');
        }
        if (typeof input.discount_minor !== 'number' || input.discount_minor < 0) {
          throw new Error('Valid non-negative bill discount is required');
        }
        if (input.discount_minor > 0 || input.items.some((item) => item.discount_minor > 0)) {
          assertPermission('sales.discount');
        }

        const data = salesRepo.createSale(input);
        logger.info('sales', `Created sale ${data.invoice_number} (ID: ${String(data.id)}) for total ${String(data.total_minor)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('sales', 'Error creating sale', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // --- GET SALE BY ID ---
  ipcMain.handle(
    IPC_CHANNELS.SALES.GET_BY_ID,
    (_, id: number): Result<SaleRow> => {
      try {
        if (!id || typeof id !== 'number' || id <= 0) {
          throw new Error('Valid Sale ID is required');
        }
        const data = salesRepo.getSaleById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('sales', `Error getting sale ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.SEARCH,
    (_, params: SaleSearchParams = {}): Result<SaleRow[]> => {
      try {
        assertPermission('sales.reprint');
        return { success: true, data: salesRepo.searchSales(params) };
      } catch (error) {
        logger.error('sales', 'Error searching sales', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.REPRINT,
    (_, id: number): Result<SaleRow> => {
      try {
        assertPermission('sales.reprint');
        return { success: true, data: salesRepo.getSaleById(id) };
      } catch (error) {
        logger.error('sales', `Error loading sale ${String(id)} for reprint`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.VOID,
    (_, id: number): Result<SaleRow> => {
      try {
        assertPermission('sales.void');
        return { success: true, data: salesRepo.voidSale(id) };
      } catch (error) {
        logger.error('sales', `Error voiding sale ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  // --- LIST RECENT SALES ---
  ipcMain.handle(
    IPC_CHANNELS.SALES.LIST_RECENT,
    (_, limit?: number): Result<SaleRow[]> => {
      try {
        const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;
        const data = salesRepo.listRecentSales(safeLimit);
        return { success: true, data };
      } catch (error) {
        logger.error('sales', 'Error listing recent sales', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // --- LOOKUP BY BARCODE ---
  ipcMain.handle(
    IPC_CHANNELS.SALES.LOOKUP_BARCODE,
    (_, barcode: string): Result<PosLookupResult | null> => {
      try {
        if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
          return { success: true, data: null };
        }
        const data = salesRepo.lookupByBarcode(barcode.trim());
        return { success: true, data };
      } catch (error) {
        logger.error('sales', `Error looking up barcode ${barcode}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // --- HELD BILLS ---
  ipcMain.handle(
    IPC_CHANNELS.SALES.HOLD_BILL,
    (_, input: HoldBillInput): Result<HeldBillRow> => {
      try {
        if (input.items.length === 0) {
          throw new Error('Cannot hold an empty bill');
        }
        const data = salesRepo.holdBill(input);
        logger.info('sales', `Held bill with ID ${String(data.id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('sales', 'Error holding bill', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.GET_HELD_BILLS,
    (): Result<HeldBillRow[]> => {
      try {
        const data = salesRepo.getHeldBills();
        return { success: true, data };
      } catch (error) {
        logger.error('sales', 'Error retrieving held bills', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.RESUME_HELD_BILL,
    (_, id: number): Result<HeldBillRow> => {
      try {
        if (!id || typeof id !== 'number' || id <= 0) {
          throw new Error('Valid Held Bill ID is required');
        }
        const data = salesRepo.resumeHeldBill(id);
        logger.info('sales', `Resumed and removed held bill ${String(id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('sales', `Error resuming held bill ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SALES.DELETE_HELD_BILL,
    (_, id: number): Result<void> => {
      try {
        if (!id || typeof id !== 'number' || id <= 0) {
          throw new Error('Valid Held Bill ID is required');
        }
        salesRepo.deleteHeldBill(id);
        logger.info('sales', `Deleted held bill ${String(id)}`);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('sales', `Error deleting held bill ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );
}
