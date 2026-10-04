import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as customersRepo from '../../../repositories/customers';
import type {
  CustomerRow,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchParams,
  CustomerTransactionRow,
  RecordCustomerPaymentInput,
  CustomerKpis,
} from '@shared/types/customers';

export function registerCustomersIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.LIST,
    (_, params: CustomerSearchParams = {}): Result<CustomerRow[]> => {
      try {
        const data = customersRepo.listCustomers(params);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', 'Error listing customers', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.GET_BY_ID,
    (_, id: number): Result<CustomerRow> => {
      try {
        const data = customersRepo.getCustomerById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', `Error fetching customer ${String(id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.LOOKUP_PHONE,
    (_, phone: string): Result<CustomerRow | null> => {
      try {
        const data = customersRepo.lookupCustomerByPhone(phone);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', `Error looking up customer phone ${phone}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.CREATE,
    (_, input: CreateCustomerInput): Result<CustomerRow> => {
      try {
        const data = customersRepo.createCustomer(input);
        logger.info('customers', `Customer created: ${data.name} (#${String(data.id)})`);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', 'Error creating customer', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.UPDATE,
    (_, input: UpdateCustomerInput): Result<CustomerRow> => {
      try {
        const data = customersRepo.updateCustomer(input);
        logger.info('customers', `Customer updated: #${String(data.id)}`);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', `Error updating customer ${String(input.id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.GET_LEDGER,
    (_, customerId: number): Result<CustomerTransactionRow[]> => {
      try {
        const data = customersRepo.getCustomerLedger(customerId);
        return { success: true, data };
      } catch (error) {
        logger.error('customers', `Error fetching ledger for customer ${String(customerId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.RECORD_PAYMENT,
    (_, input: RecordCustomerPaymentInput): Result<void> => {
      try {
        customersRepo.recordCustomerPayment(input);
        logger.info('customers', `Khata payment recorded for customer #${String(input.customer_id)}: ${String(input.amount_minor)}`);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('customers', 'Error recording customer payment', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.GET_KPIS,
    (): Result<CustomerKpis> => {
      try {
        const data = customersRepo.getCustomerKpis();
        return { success: true, data };
      } catch (error) {
        logger.error('customers', 'Error fetching customer KPIs', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
