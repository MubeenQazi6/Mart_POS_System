import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as suppliersRepo from '../../../repositories/suppliers';
import type {
  SupplierRow,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierSearchParams,
  SupplierTransactionRow,
  RecordSupplierPaymentInput,
} from '@shared/types/purchases';

export function registerSuppliersIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.LIST,
    (_, params: SupplierSearchParams = {}): Result<SupplierRow[]> => {
      try {
        const data = suppliersRepo.listSuppliers(params);
        return { success: true, data };
      } catch (error) {
        logger.error('suppliers', 'Error listing suppliers', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.GET_BY_ID,
    (_, id: number): Result<SupplierRow> => {
      try {
        const data = suppliersRepo.getSupplierById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('suppliers', `Error fetching supplier ${String(id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.CREATE,
    (_, input: CreateSupplierInput): Result<SupplierRow> => {
      try {
        const data = suppliersRepo.createSupplier(input);
        logger.info('suppliers', `Supplier created: ${data.name} (#${String(data.id)})`);
        return { success: true, data };
      } catch (error) {
        logger.error('suppliers', 'Error creating supplier', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.UPDATE,
    (_, input: UpdateSupplierInput): Result<SupplierRow> => {
      try {
        const data = suppliersRepo.updateSupplier(input);
        logger.info('suppliers', `Supplier updated: #${String(data.id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('suppliers', `Error updating supplier ${String(input.id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.GET_LEDGER,
    (_, supplierId: number): Result<SupplierTransactionRow[]> => {
      try {
        const data = suppliersRepo.getSupplierLedger(supplierId);
        return { success: true, data };
      } catch (error) {
        logger.error('suppliers', `Error fetching ledger for supplier ${String(supplierId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS.RECORD_PAYMENT,
    (_, input: RecordSupplierPaymentInput): Result<void> => {
      try {
        suppliersRepo.recordSupplierPayment(input);
        logger.info('suppliers', `Supplier payment recorded for supplier #${String(input.supplier_id)}: ${String(input.amount_minor)}`);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('suppliers', 'Error recording supplier payment', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
