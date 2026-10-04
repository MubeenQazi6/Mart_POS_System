import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import type {
  CreatePurchaseReturnInput,
  CreateSalesReturnInput,
  CreateSalesExchangeInput,
  CreatePurchaseExchangeInput,
  ReturnRow,
  ExchangeRow,
} from '@shared/types/returns';
import { logger } from '@main/logger';
import * as returnsRepo from '../../../repositories/returns';
import { assertPermission } from '../utils/authGuard';

export function registerReturnsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.RETURNS.HISTORY, (
    _,
    search: string = '',
    date_from?: string,
    date_to?: string,
    return_type?: 'sales' | 'purchase',
  ): Result<ReturnRow[]> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.listReturnHistory(search, date_from, date_to, return_type) };
    } catch (error) {
      logger.error('returns', 'Error listing return history', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.SEARCH_SALES, (_, search: string): Result<ReturnRow[]> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.searchSales(search) };
    } catch (error) {
      logger.error('returns', 'Error searching sales for return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.SEARCH_PURCHASES, (_, search: string): Result<ReturnRow[]> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.searchPurchases(search) };
    } catch (error) {
      logger.error('returns', 'Error searching purchases for return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.GET_SALES_BY_ID, (_, id: number): Result<ReturnRow> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.getSalesReturnById(id) };
    } catch (error) {
      logger.error('returns', 'Error fetching sales return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.GET_PURCHASE_BY_ID, (_, id: number): Result<ReturnRow> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.getPurchaseReturnById(id) };
    } catch (error) {
      logger.error('returns', 'Error fetching purchase return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.GET_SALES_EXCHANGE_BY_ID, (_, id: number): Result<ExchangeRow> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.getSalesExchangeById(id) };
    } catch (error) {
      logger.error('returns', 'Error fetching sales exchange', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.GET_PURCHASE_EXCHANGE_BY_ID, (_, id: number): Result<ExchangeRow> => {
    try {
      assertPermission('returns.view');
      return { success: true, data: returnsRepo.getPurchaseExchangeById(id) };
    } catch (error) {
      logger.error('returns', 'Error fetching purchase exchange', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.CREATE_SALES, (_, input: CreateSalesReturnInput): Result<ReturnRow> => {
    try {
      assertPermission('returns.manage');
      return { success: true, data: returnsRepo.createSalesReturn(input) };
    } catch (error) {
      logger.error('returns', 'Error creating sales return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.CREATE_PURCHASE, (_, input: CreatePurchaseReturnInput): Result<ReturnRow> => {
    try {
      assertPermission('returns.manage');
      return { success: true, data: returnsRepo.createPurchaseReturn(input) };
    } catch (error) {
      logger.error('returns', 'Error creating purchase return', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.CREATE_SALES_EXCHANGE, (_, input: CreateSalesExchangeInput): Result<ExchangeRow> => {
    try {
      assertPermission('returns.manage');
      return { success: true, data: returnsRepo.createSalesExchange(input) };
    } catch (error) {
      logger.error('returns', 'Error creating sales exchange', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RETURNS.CREATE_PURCHASE_EXCHANGE, (_, input: CreatePurchaseExchangeInput): Result<ExchangeRow> => {
    try {
      assertPermission('returns.manage');
      return { success: true, data: returnsRepo.createPurchaseExchange(input) };
    } catch (error) {
      logger.error('returns', 'Error creating purchase exchange', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}