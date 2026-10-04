import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as reportsRepo from '../../../repositories/reports';
import { exportReport } from '../../services/exportService';
import type {
  ReportFilterParams,
  SalesReportData,
  PurchasesReportData,
  InventoryReportData,
  StockMovementReportData,
  SuppliersPayableReportData,
  CustomersKhataReportData,
  ProfitSummaryData,
  ExportReportInput,
  ExportResult,
} from '@shared/types/reports';

import { assertPermission } from '../utils/authGuard';

export function registerReportsIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_SALES,
    (_, filters: ReportFilterParams = {}): Result<SalesReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getSalesReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating sales report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_PURCHASES,
    (_, filters: ReportFilterParams = {}): Result<PurchasesReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getPurchasesReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating purchases report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_INVENTORY,
    (_, filters: ReportFilterParams = {}): Result<InventoryReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getInventoryReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating inventory report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_MOVEMENTS,
    (_, filters: ReportFilterParams = {}): Result<StockMovementReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getStockMovementReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating movements report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_SUPPLIERS,
    (): Result<SuppliersPayableReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getSuppliersPayableReport();
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating suppliers payable report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_CUSTOMERS,
    (_, filters: ReportFilterParams = {}): Result<CustomersKhataReportData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getCustomersKhataReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating customers Khata report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.GET_PROFIT_SUMMARY,
    (_, filters: ReportFilterParams = {}): Result<ProfitSummaryData> => {
      try {
        assertPermission('reports.view');
        const data = reportsRepo.getProfitSummaryReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('reports', 'Error generating profit summary report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTS.EXPORT,
    async (_, input: ExportReportInput): Promise<Result<ExportResult>> => {
      try {
        assertPermission('reports.export');
        const result = await exportReport(input);
        return { success: true, data: result };
      } catch (error) {
        logger.error('reports', 'Error exporting report', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export report',
        };
      }
    },
  );
}
