import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { suppliers, supplierTransactions, cashSessions, cashMovements } from '../database/schema/index';
import { eq, and, like, desc, or } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  SupplierRow,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierSearchParams,
  SupplierTransactionRow,
  RecordSupplierPaymentInput,
} from '@shared/types/purchases';

export function listSuppliers(params: SupplierSearchParams = {}): SupplierRow[] {
  const db = getDb();
  let query = db.select().from(suppliers);

  const conditions = [];

  if (params.is_active !== undefined) {
    conditions.push(eq(suppliers.is_active, params.is_active));
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(suppliers.name, term),
        like(suppliers.phone, term),
        like(suppliers.contact_person, term),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(suppliers.created_at)).all();
}

export function getSupplierById(id: number): SupplierRow {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Valid supplier ID is required');
  }

  const db = getDb();
  const row = db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!row) {
    throw new Error(`Supplier with ID ${String(id)} not found`);
  }

  return row;
}

export function createSupplier(input: CreateSupplierInput): SupplierRow {
  if (!input.name.trim()) {
    throw new Error('Supplier name is required');
  }

  const openingBalance = typeof input.opening_balance_minor === 'number' ? input.opening_balance_minor : 0;

  const supplierId = withTransaction((tx) => {
    const inserted = tx
      .insert(suppliers)
      .values({
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        opening_balance_minor: openingBalance,
        current_balance_minor: openingBalance,
        is_active: true,
      })
      .returning({ id: suppliers.id })
      .get();

    if (openingBalance !== 0) {
      tx.insert(supplierTransactions).values({
        supplier_id: inserted.id,
        transaction_type: 'ADJUSTMENT',
        amount_minor: openingBalance,
        reference_type: 'MANUAL',
        reference_id: null,
        notes: 'Opening balance entry',
      }).run();
    }

    return inserted.id;
  });

  return getSupplierById(supplierId);
}

export function updateSupplier(input: UpdateSupplierInput): SupplierRow {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('Valid supplier ID is required');
  }

  const updateData: Partial<typeof suppliers.$inferInsert> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Supplier name cannot be empty');
    updateData.name = input.name.trim();
  }
  if (input.contact_person !== undefined) updateData.contact_person = input.contact_person.trim() || null;
  if (input.phone !== undefined) updateData.phone = input.phone.trim() || null;
  if (input.email !== undefined) updateData.email = input.email.trim() || null;
  if (input.address !== undefined) updateData.address = input.address.trim() || null;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  withTransaction((tx) => {
    tx.update(suppliers).set(updateData).where(eq(suppliers.id, input.id)).run();
  });

  return getSupplierById(input.id);
}

export function getSupplierLedger(supplierId: number): SupplierTransactionRow[] {
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    throw new Error('Valid supplier ID is required');
  }

  const db = getDb();
  return db
    .select()
    .from(supplierTransactions)
    .where(eq(supplierTransactions.supplier_id, supplierId))
    .orderBy(desc(supplierTransactions.created_at), desc(supplierTransactions.id))
    .all();
}

export function recordSupplierPayment(input: RecordSupplierPaymentInput): void {
  if (!Number.isInteger(input.supplier_id) || input.supplier_id <= 0) {
    throw new Error('Valid supplier ID is required');
  }
  if (!Number.isInteger(input.amount_minor) || input.amount_minor <= 0) {
    throw new Error('Payment amount must be a positive integer in minor units');
  }

  withTransaction((tx) => {
    const supplier = tx.select().from(suppliers).where(eq(suppliers.id, input.supplier_id)).get();
    if (!supplier) {
      throw new Error(`Supplier with ID ${String(input.supplier_id)} not found`);
    }

    // Payment reduces what we owe to supplier (decrements current_balance_minor)
    const newBalance = supplier.current_balance_minor - input.amount_minor;

    tx.update(suppliers)
      .set({
        current_balance_minor: newBalance,
        updated_at: new Date().toISOString(),
      })
      .where(eq(suppliers.id, input.supplier_id))
      .run();

    tx.insert(supplierTransactions).values({
      supplier_id: input.supplier_id,
      transaction_type: 'PAYMENT',
      amount_minor: -input.amount_minor, // Negative in ledger to represent payment reducing balance
      reference_type: 'PAYMENT',
      reference_id: input.purchase_id || null,
      notes: input.notes?.trim() || `Payment via ${input.payment_method}${input.reference_number ? ` (Ref: ${input.reference_number})` : ''}`,
    }).run();

    if (input.payment_method === 'cash') {
      const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
      if (session) {
        tx.insert(cashMovements).values({
          session_id: session.id,
          movement_type: 'SUPPLIER_PAYMENT',
          amount_minor: input.amount_minor,
          reference_type: 'SUPPLIER',
          reference_id: input.supplier_id,
          description: input.notes?.trim() || `Payment to supplier ${supplier.name}`
        }).run();
      }
    }
  });

  logAuditEvent({
    event_type: 'SUPPLIER_PAYMENT',
    status: 'SUCCESS',
    details: `Recorded payment of ${String(input.amount_minor)} minor for supplier #${String(input.supplier_id)} via ${input.payment_method}`,
  });
}
