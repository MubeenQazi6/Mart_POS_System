import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as expenseRepo from '../../../repositories/expenses';
import type {
  ExpenseCategoryRow,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseRow,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseReportRow,
  ExpenseSummaryReport,
} from '@shared/types/expenses';

import { assertPermission } from '../utils/authGuard';

export function registerExpenseIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES.LIST,
    (_, search?: string, is_active?: boolean): Result<ExpenseCategoryRow[]> => {
      try {
        assertPermission('expenses.view');
        const data = expenseRepo.listExpenseCategories(search, is_active);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error listing expense categories', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES.CREATE,
    (_, input: CreateExpenseCategoryInput): Result<ExpenseCategoryRow> => {
      try {
        assertPermission('expenses.create');
        const data = expenseRepo.createExpenseCategory(input);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error creating expense category', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES.UPDATE,
    (_, input: UpdateExpenseCategoryInput): Result<ExpenseCategoryRow> => {
      try {
        assertPermission('expenses.edit');
        const data = expenseRepo.updateExpenseCategory(input);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error updating expense category', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.LIST,
    (_, filters: ExpenseFilters = {}): Result<ExpenseRow[]> => {
      try {
        assertPermission('expenses.view');
        const data = expenseRepo.listExpenses(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error listing expenses', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.GET_BY_ID,
    (_, id: number): Result<ExpenseRow> => {
      try {
        assertPermission('expenses.view');
        const data = expenseRepo.getExpenseById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', `Error fetching expense ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.CREATE,
    (_, input: CreateExpenseInput): Result<ExpenseRow> => {
      try {
        const user = assertPermission('expenses.create');
        const data = expenseRepo.createExpense({ ...input, created_by: user.id });
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error creating expense', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.UPDATE,
    (_, input: UpdateExpenseInput): Result<ExpenseRow> => {
      try {
        assertPermission('expenses.edit');
        const data = expenseRepo.updateExpense(input);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error updating expense', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.VOID,
    (_, id: number): Result<ExpenseRow> => {
      try {
        assertPermission('expenses.void');
        const data = expenseRepo.voidExpense(id);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', `Error voiding expense ${String(id)}`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.GET_REPORT,
    (_, filters: ExpenseFilters = {}): Result<ExpenseReportRow[]> => {
      try {
        assertPermission('expenses.view');
        const data = expenseRepo.getExpenseReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error generating expense report', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES.GET_SUMMARY,
    (_, filters: ExpenseFilters = {}): Result<ExpenseSummaryReport> => {
      try {
        assertPermission('expenses.view');
        const data = expenseRepo.getExpenseSummaryReport(filters);
        return { success: true, data };
      } catch (error) {
        logger.error('expenses', 'Error generating expense summary', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );
}