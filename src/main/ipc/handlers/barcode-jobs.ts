import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as barcodeJobsRepo from '../../../repositories/barcode-jobs';
import { validateEAN13 } from '../../../domain/barcode';
import type {
  BarcodeRow,
  PrintJobRow,
  CreatePrintJobInput,
  PrintJobSearchParams,
  PrintJobStatus,
} from '@shared/types/catalog';

export function registerBarcodeJobsIpcHandlers(): void {
  // --- BARCODES: Internal Generation & EAN-13 Validation ---

  ipcMain.handle(
    IPC_CHANNELS.BARCODES.GENERATE_INTERNAL,
    (_, variantId: number): Result<BarcodeRow> => {
      try {
        if (!variantId || typeof variantId !== 'number' || variantId <= 0) {
          throw new Error('Valid Variant ID is required');
        }
        const data = barcodeJobsRepo.generateInternalBarcodeForVariant(variantId);
        logger.info('barcodes', `Generated internal barcode ${data.barcode} for variant ${String(variantId)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('barcodes', `Error generating internal barcode for variant ${String(variantId)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.BARCODES.VALIDATE_EAN13,
    (_, barcode: string): Result<{ valid: boolean; barcode: string }> => {
      try {
        if (!barcode || typeof barcode !== 'string') {
          return { success: true, data: { valid: false, barcode: '' } };
        }
        const valid = validateEAN13(barcode.trim());
        return { success: true, data: { valid, barcode: barcode.trim() } };
      } catch (error) {
        logger.error('barcodes', 'Error validating EAN-13 barcode', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // --- PRINT JOBS ---

  ipcMain.handle(
    IPC_CHANNELS.PRINT_JOBS.LIST,
    (_, params: PrintJobSearchParams = {}): Result<PrintJobRow[]> => {
      try {
        const data = barcodeJobsRepo.listPrintJobs(params);
        return { success: true, data };
      } catch (error) {
        logger.error('print-jobs', 'Error listing print jobs', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PRINT_JOBS.CREATE,
    (_, input: CreatePrintJobInput): Result<PrintJobRow> => {
      try {
        if (!input.variant_id || typeof input.variant_id !== 'number' || input.variant_id <= 0) {
          throw new Error('Valid Variant ID is required');
        }
        if (!input.barcode_id || typeof input.barcode_id !== 'number' || input.barcode_id <= 0) {
          throw new Error('Valid Barcode ID is required');
        }
        if (!input.quantity || typeof input.quantity !== 'number' || input.quantity <= 0) {
          throw new Error('Print quantity must be a positive integer');
        }

        const data = barcodeJobsRepo.createPrintJob(input);
        logger.info('print-jobs', `Created print job ${String(data.id)} for variant ${String(input.variant_id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('print-jobs', 'Error creating print job', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PRINT_JOBS.UPDATE_STATUS,
    (_, id: number, status: PrintJobStatus): Result<PrintJobRow> => {
      try {
        if (!id || typeof id !== 'number' || id <= 0) {
          throw new Error('Valid Job ID is required');
        }
        if (!['pending', 'printed', 'failed'].includes(status)) {
          throw new Error('Invalid print job status');
        }

        const data = barcodeJobsRepo.updatePrintJobStatus(id, status);
        logger.info('print-jobs', `Updated print job ${String(id)} status to ${status}`);
        return { success: true, data };
      } catch (error) {
        logger.error('print-jobs', `Error updating print job ${String(id)} status`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PRINT_JOBS.RETRY,
    (_, id: number): Result<PrintJobRow> => {
      try {
        if (!id || typeof id !== 'number' || id <= 0) {
          throw new Error('Valid Job ID is required');
        }
        const data = barcodeJobsRepo.retryFailedJob(id);
        logger.info('print-jobs', `Retried failed print job ${String(id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('print-jobs', `Error retrying print job ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PRINT_JOBS.CLEAR_PRINTED,
    (): Result<{ clearedCount: number }> => {
      try {
        const clearedCount = barcodeJobsRepo.deletePrintedJobs();
        logger.info('print-jobs', `Cleared ${String(clearedCount)} printed jobs`);
        return { success: true, data: { clearedCount } };
      } catch (error) {
        logger.error('print-jobs', 'Error clearing printed jobs', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );
}
