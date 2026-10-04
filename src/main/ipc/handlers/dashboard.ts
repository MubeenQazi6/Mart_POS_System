import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as dashboardRepo from '../../../repositories/dashboard';
import type {
  DashboardKpiInput,
  DashboardKpis,
  DashboardSalesTrendPoint,
  DashboardTopProduct,
  DashboardPaymentBreakdown,
  DashboardLowStockItem,
  DashboardActivityItem,
  DashboardQuery,
} from '@shared/types/dashboard';

import { assertPermission } from '../utils/authGuard';

export function registerDashboardIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_KPIS,
    (_, input: DashboardKpiInput = {}): Result<DashboardKpis> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getDashboardKpis(input);
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching dashboard KPIs', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_TREND,
    (_, input: DashboardQuery = {}): Result<DashboardSalesTrendPoint[]> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getSalesTrend(input);
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching sales trend', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_TOP_PRODUCTS,
    (_, input: DashboardQuery = {}): Result<DashboardTopProduct[]> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getTopProducts(input);
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching top products', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_PAYMENT_BREAKDOWN,
    (_, input: DashboardQuery = {}): Result<DashboardPaymentBreakdown> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getPaymentBreakdown(input);
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching payment breakdown', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_LOW_STOCK,
    (): Result<DashboardLowStockItem[]> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getLowStockAlert();
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching low stock alerts', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD.GET_ACTIVITY,
    (_, limit = 10): Result<DashboardActivityItem[]> => {
      try {
        assertPermission('dashboard.view');
        const data = dashboardRepo.getRecentActivity(limit);
        return { success: true, data };
      } catch (error) {
        logger.error('dashboard', 'Error fetching recent activity', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );
}