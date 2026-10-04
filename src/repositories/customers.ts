import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { customers, customerTransactions, customerPayments, cashSessions, cashMovements } from '../database/schema/index';
import { eq, and, like, desc, or, gt } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  CustomerRow,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchParams,
  CustomerTransactionRow,
  RecordCustomerPaymentInput,
  CustomerKpis,
} from '@shared/types/customers';

export function listCustomers(params: CustomerSearchParams = {}): CustomerRow[] {
  const db = getDb();
  let query = db.select().from(customers);

  const conditions = [];

  if (params.is_active !== undefined) {
    conditions.push(eq(customers.is_active, params.is_active));
  }

  if (params.has_balance_only) {
    conditions.push(gt(customers.current_balance_minor, 0));
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
        like(customers.email, term),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(customers.created_at)).all();
}

export function getCustomerById(id: number): CustomerRow {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Valid customer ID is required');
  }

  const db = getDb();
  const row = db.select().from(customers).where(eq(customers.id, id)).get();

  if (!row) {
    throw new Error(`Customer with ID ${String(id)} not found`);
  }

  return row;
}

export function lookupCustomerByPhone(phone: string): CustomerRow | null {
  if (!phone.trim()) return null;

  const db = getDb();
  const row = db.select().from(customers).where(eq(customers.phone, phone.trim())).get();
  return row || null;
}

export function createCustomer(input: CreateCustomerInput): CustomerRow {
  if (!input.name.trim()) {
    throw new Error('Customer name is required');
  }
  if (!input.phone.trim()) {
    throw new Error('Customer phone number is required');
  }

  const openingBalance = typeof input.opening_balance_minor === 'number' ? input.opening_balance_minor : 0;
  const creditLimit = typeof input.credit_limit_minor === 'number' && input.credit_limit_minor >= 0 ? input.credit_limit_minor : 0;

  const customerId = withTransaction((tx) => {
    // Check phone uniqueness
    const existing = tx.select().from(customers).where(eq(customers.phone, input.phone.trim())).get();
    if (existing) {
      throw new Error(`A customer with phone "${input.phone.trim()}" already exists`);
    }

    const inserted = tx
      .insert(customers)
      .values({
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        credit_limit_minor: creditLimit,
        opening_balance_minor: openingBalance,
        current_balance_minor: openingBalance,
        is_active: true,
      })
      .returning({ id: customers.id })
      .get();

    if (openingBalance !== 0) {
      tx.insert(customerTransactions).values({
        customer_id: inserted.id,
        transaction_type: 'ADJUSTMENT',
        amount_minor: openingBalance,
        reference_type: 'MANUAL',
        reference_id: null,
        notes: 'Opening Khata balance entry',
      }).run();
    }

    return inserted.id;
  });

  return getCustomerById(customerId);
}

export function updateCustomer(input: UpdateCustomerInput): CustomerRow {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('Valid customer ID is required');
  }

  const updateData: Partial<typeof customers.$inferInsert> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Customer name cannot be empty');
    updateData.name = input.name.trim();
  }
  if (input.phone !== undefined) {
    if (!input.phone.trim()) throw new Error('Customer phone cannot be empty');
    updateData.phone = input.phone.trim();
  }
  if (input.email !== undefined) updateData.email = input.email.trim() || null;
  if (input.address !== undefined) updateData.address = input.address.trim() || null;
  if (input.credit_limit_minor !== undefined) updateData.credit_limit_minor = Math.max(0, input.credit_limit_minor);
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  withTransaction((tx) => {
    if (input.phone !== undefined) {
      const duplicate = tx.select().from(customers).where(eq(customers.phone, input.phone.trim())).get();
      if (duplicate && duplicate.id !== input.id) {
        throw new Error(`A customer with phone "${input.phone.trim()}" already exists`);
      }
    }
    tx.update(customers).set(updateData).where(eq(customers.id, input.id)).run();
  });

  return getCustomerById(input.id);
}

export function getCustomerLedger(customerId: number): CustomerTransactionRow[] {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error('Valid customer ID is required');
  }

  const db = getDb();
  return db
    .select()
    .from(customerTransactions)
    .where(eq(customerTransactions.customer_id, customerId))
    .orderBy(desc(customerTransactions.created_at), desc(customerTransactions.id))
    .all();
}

export function recordCustomerPayment(input: RecordCustomerPaymentInput): void {
  if (!Number.isInteger(input.customer_id) || input.customer_id <= 0) {
    throw new Error('Valid customer ID is required');
  }
  if (!Number.isInteger(input.amount_minor) || input.amount_minor <= 0) {
    throw new Error('Payment amount must be a positive integer in minor units');
  }

  withTransaction((tx) => {
    const customer = tx.select().from(customers).where(eq(customers.id, input.customer_id)).get();
    if (!customer) {
      throw new Error(`Customer with ID ${String(input.customer_id)} not found`);
    }

    // Customer payment reduces their debt (receivable decreases)
    const newBalance = customer.current_balance_minor - input.amount_minor;

    tx.update(customers)
      .set({
        current_balance_minor: newBalance,
        updated_at: new Date().toISOString(),
      })
      .where(eq(customers.id, input.customer_id))
      .run();

    tx.insert(customerPayments).values({
      customer_id: input.customer_id,
      payment_method: input.payment_method,
      amount_minor: input.amount_minor,
      notes: input.notes?.trim() || null,
    }).run();

    tx.insert(customerTransactions).values({
      customer_id: input.customer_id,
      transaction_type: 'PAYMENT',
      amount_minor: -input.amount_minor, // Negative in ledger to represent payment reducing balance
      reference_type: 'PAYMENT',
      reference_id: null,
      notes: input.notes?.trim() || `Khata payment received via ${input.payment_method}`,
    }).run();

    if (input.payment_method === 'cash') {
      const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
      if (session) {
        tx.insert(cashMovements).values({
          session_id: session.id,
          movement_type: 'CUSTOMER_PAYMENT',
          amount_minor: input.amount_minor,
          reference_type: 'CUSTOMER',
          reference_id: input.customer_id,
          description: input.notes?.trim() || `Khata payment from customer ${customer.name}`
        }).run();
      }
    }
  });

  logAuditEvent({
    event_type: 'KHATA_PAYMENT',
    status: 'SUCCESS',
    details: `Recorded Khata payment of ${String(input.amount_minor)} minor for customer #${String(input.customer_id)} via ${input.payment_method}`,
  });
}

export function getCustomerKpis(): CustomerKpis {
  const db = getDb();
  const allCustomers = db.select().from(customers).where(eq(customers.is_active, true)).all();

  let totalReceivables = 0;
  for (const c of allCustomers) {
    if (c.current_balance_minor > 0) {
      totalReceivables += c.current_balance_minor;
    }
  }

  return {
    total_customers_count: allCustomers.length,
    total_receivables_minor: totalReceivables,
  };
}
