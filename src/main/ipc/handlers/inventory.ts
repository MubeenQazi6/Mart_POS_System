import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as inventoryRepo from '../../../repositories/inventory';
import type {
  CreateMovementInput,
  StockMovementRow,
  StockSummaryRow,
  InventoryKpis,
  MovementListParams,
  StockSummaryFilters,
} from '@shared/types/inventory';

export function registerInventoryIpcHandlers(): void {
  // --- ADJUST STOCK (create movement) ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.ADJUST,
    (_, input: CreateMovementInput): Result<StockMovementRow> => {
      try {
        const data = inventoryRepo.createMovement(input);
        logger.info(
          'inventory',
          `Stock movement created for variant ${String(input.variant_id)}: ${input.adjustment_type} ${String(input.quantity)}`,
        );
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', 'Error creating stock movement', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // --- LIST MOVEMENTS ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.LIST_MOVEMENTS,
    (_, params: MovementListParams = {}): Result<StockMovementRow[]> => {
      try {
        const data = inventoryRepo.listMovements(params);
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', 'Error listing stock movements', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // --- GET KPIS ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.GET_KPIS,
    (): Result<InventoryKpis> => {
      try {
        const data = inventoryRepo.getInventoryKpis();
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', 'Error fetching inventory KPIs', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // --- GET LOW STOCK ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.GET_LOW_STOCK,
    (): Result<StockSummaryRow[]> => {
      try {
        const data = inventoryRepo.listStockSummary({ low_stock_only: true, is_active: true });
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', 'Error fetching low stock items', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // --- GET VARIANT STOCK ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.GET_VARIANT_STOCK,
    (_, variantId: number): Result<StockSummaryRow> => {
      try {
        const data = inventoryRepo.getVariantStock(variantId);
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', `Error fetching stock for variant ${String(variantId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // --- LIST STOCK SUMMARY ---
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY.LIST_STOCK_SUMMARY,
    (_, filters: StockSummaryFilters = {}): Result<StockSummaryRow[]> => {
      try {
        const data = inventoryRepo.listStockSummary(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('inventory', 'Error listing stock summary', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
