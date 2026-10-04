import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import {
  sales,
  saleItems,
  salePayments,
  heldBills,
  productVariants,
  products,
  stockMovements,
  settings,
  customers,
  customerTransactions,
  cashSessions,
  cashMovements,
} from '../database/schema/index';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';
import { generateInvoiceNumber, calculateCartTotals } from '../domain/sales';
import { logAuditEvent } from './audit';
import type {
  CreateSaleInput,
  SaleRow,
  SaleStatus,
  HeldBillRow,
  HoldBillInput,
  PosLookupResult,
  CartItemInput,
} from '@shared/types/sales';
import { productBarcodes } from '../database/schema/catalog';
import type { SaleSearchParams } from '@shared/types/sales';

const INVOICE_SEQUENCE_KEY = 'invoice.internal_sequence';

/**
 * Query database for the last invoice sequence number.
 * Inspects both the last created sale's invoice sequence and the settings table sequence.
 */
export function getLastInvoiceSequence(tx?: ReturnType<typeof getDb>): number {
  const db = tx ?? getDb();

  let maxSequenceFromSales = 0;

  const lastSale = db
    .select({
      id: sales.id,
      invoice_number: sales.invoice_number,
    })
    .from(sales)
    .orderBy(desc(sales.id))
    .limit(1)
    .get();

  if (lastSale?.invoice_number) {
    // Extract trailing sequence digits from formats like:
    // INV-20260828151535-00001 -> 1
    // INV-00001 -> 1
    const match = lastSale.invoice_number.match(/(\d+)$/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        maxSequenceFromSales = parsed;
      }
    }
  }

  const currentSetting = db
    .select()
    .from(settings)
    .where(eq(settings.key, INVOICE_SEQUENCE_KEY))
    .get();

  let settingSeq = 0;
  if (currentSetting?.value) {
    const parsed = parseInt(currentSetting.value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      settingSeq = parsed;
    }
  }

  return Math.max(maxSequenceFromSales, settingSeq);
}

/**
 * Look up a product variant by barcode string for POS scanning.
 * Returns the variant details needed for the cart, or null if not found.
 */
export function lookupByBarcode(barcode: string): PosLookupResult | null {
  const db = getDb();
  const row = db
    .select({
      variant_id: productVariants.id,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      selling_price_minor: productVariants.selling_price_minor,
      barcode: productBarcodes.barcode,
      is_active: productVariants.is_active,
      available_stock: sql<number>`coalesce((select sum(case when sm.movement_type = 'IN' then sm.quantity else -sm.quantity end) from stock_movements sm where sm.variant_id = ${productVariants.id}), 0)`.mapWith(Number),
    })
    .from(productBarcodes)
    .innerJoin(productVariants, eq(productBarcodes.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(
      and(
        eq(productBarcodes.barcode, barcode),
        eq(productBarcodes.is_active, true),
        eq(productVariants.is_active, true),
        eq(products.is_active, true),
      ),
    )
    .get();

  if (!row) return null;
  return row;
}

/**
 * Merge duplicate variant_id entries in cart items.
 * Quantities are summed; discounts are summed.
 */
function mergeCartDuplicates(items: CartItemInput[]): CartItemInput[] {
  const merged = new Map<number, CartItemInput>();
  for (const item of items) {
    const existing = merged.get(item.variant_id);
    if (existing) {
      existing.quantity += item.quantity;
      existing.discount_minor += item.discount_minor;
      if (item.is_manual) {
        existing.is_manual = true;
      }
    } else {
      merged.set(item.variant_id, { ...item, is_manual: item.is_manual === true });
    }
  }
  return Array.from(merged.values());
}

/**
 * Create a completed sale atomically with retry logic.
 *
 * Performs ALL of the following inside a single SQLite transaction:
 * 1. Query database for last invoice number, increment sequence, and format invoice
 * 2. Merge duplicate variant_ids in cart
 * 3. Fetch authoritative prices from DB for each variant
 * 4. Calculate totals using domain logic (ignoring frontend totals)
 * 5. Validate that payment amounts sum to exact total
 * 6. Insert sale, sale_items, sale_payments, stock_movements
 *
 * Retries up to 3 attempts on duplicate constraint or concurrency collision.
 * Frontend totals are treated as UNTRUSTED and ignored.
 */
export function createSale(input: CreateSaleInput): SaleRow {
  // --- Pre-transaction validation ---
  if (input.items.length === 0) {
    throw new Error('Sale must contain at least one item');
  }

  if (input.payments.length === 0) {
    throw new Error('Sale must contain at least one payment');
  }

  if (input.discount_minor < 0) {
    throw new Error('Bill discount cannot be negative');
  }

  // Validate individual items
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Quantity must be a positive integer for variant ${String(item.variant_id)}`);
    }
    if (!Number.isInteger(item.discount_minor) || item.discount_minor < 0) {
      throw new Error(`Item discount must be a non-negative integer for variant ${String(item.variant_id)}`);
    }
  }

  // Validate payments
  let creditAmount = 0;
  for (const payment of input.payments) {
    if (!['cash', 'card', 'credit'].includes(payment.payment_method)) {
      throw new Error(`Invalid payment method: ${payment.payment_method}`);
    }
    if (!Number.isInteger(payment.amount_minor) || payment.amount_minor <= 0) {
      throw new Error('Payment amount must be a positive integer');
    }
    if (payment.payment_method === 'credit') {
      creditAmount += payment.amount_minor;
    }
  }

  if (creditAmount > 0 && (!input.customer_id || input.customer_id <= 0)) {
    throw new Error('A valid registered customer is required for Khata/credit payment');
  }

  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const saleId = withTransaction((tx) => {
        // 1. Query database for last invoice sequence and increment
        const lastSeq = getLastInvoiceSequence(tx);
        const seq = lastSeq + 1;

        const now = new Date().toISOString();
        const currentSetting = tx
          .select()
          .from(settings)
          .where(eq(settings.key, INVOICE_SEQUENCE_KEY))
          .get();

        if (currentSetting) {
          tx.update(settings)
            .set({ value: String(seq), updated_at: now })
            .where(eq(settings.key, INVOICE_SEQUENCE_KEY))
            .run();
        } else {
          tx.insert(settings)
            .values({ key: INVOICE_SEQUENCE_KEY, value: String(seq), updated_at: now })
            .run();
        }

        const invoiceNumber = generateInvoiceNumber(seq);

        // 2. Merge duplicate variant_ids
        const mergedItems = mergeCartDuplicates(input.items);

        // 3. Fetch authoritative prices from DB
        const authoritativeItems = mergedItems.map((item) => {
          const variant = tx
            .select({
              id: productVariants.id,
              selling_price_minor: productVariants.selling_price_minor,
              purchase_price_minor: productVariants.purchase_price_minor,
              is_active: productVariants.is_active,
              available_stock: sql<number>`coalesce((select sum(case when sm.movement_type = 'IN' then sm.quantity else -sm.quantity end) from stock_movements sm where sm.variant_id = ${item.variant_id}), 0)`.mapWith(Number),
            })
            .from(productVariants)
            .where(eq(productVariants.id, item.variant_id))
            .get();

          if (!variant) {
            throw new Error(`Variant with ID ${String(item.variant_id)} not found`);
          }
          if (!variant.is_active) {
            throw new Error(`Product variant #${String(item.variant_id)} is inactive and cannot be sold`);
          }

          const isManualItem = item.is_manual === true;
          if (!isManualItem && variant.available_stock <= 0) {
            throw new Error(`Variant #${String(item.variant_id)} is out of stock`);
          }
          if (!isManualItem && item.quantity > variant.available_stock) {
            throw new Error(`Only ${String(variant.available_stock / 1000)} units are available for variant #${String(item.variant_id)}`);
          }

          return {
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price_minor: variant.selling_price_minor,
            unit_cost_minor: variant.purchase_price_minor,
            discount_minor: item.discount_minor,
            is_manual: isManualItem,
          };
        });

    // 4. Calculate authoritative totals (ignoring frontend totals)
    const totals = calculateCartTotals(authoritativeItems, input.discount_minor);

    // 5. Validate payments sum to exact total
    const totalPayments = input.payments.reduce((sum, p) => sum + p.amount_minor, 0);
    if (totalPayments < totals.total_minor) {
      throw new Error(
        `Payment total (${String(totalPayments)}) is less than sale total (${String(totals.total_minor)})`
      );
    }

    // 6. Insert sale record
    const saleRecord = tx
      .insert(sales)
      .values({
        invoice_number: invoiceNumber,
        subtotal_minor: totals.subtotal_minor,
        discount_minor: totals.discount_minor,
        tax_minor: totals.tax_minor,
        total_minor: totals.total_minor,
        status: 'completed',
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      })
      .returning({ id: sales.id })
      .get();

    // 7. Insert sale items and stock movements
    for (let i = 0; i < authoritativeItems.length; i++) {
      const item = authoritativeItems[i];
      if (!item) continue;

      const itemTotal = totals.item_totals[i];
      if (!itemTotal) continue;

      tx.insert(saleItems)
        .values({
          sale_id: saleRecord.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price_minor: item.unit_price_minor,
          unit_cost_minor: item.unit_cost_minor,
          discount_minor: item.discount_minor,
          line_total_minor: itemTotal.line_total_minor,
          is_manual: Boolean(item.is_manual),
        })
        .run();

      // Create stock movement (OUT)
      // Manual sales record reference_type 'MANUAL_SALE' and deduct stock even if zero
      tx.insert(stockMovements)
        .values({
          variant_id: item.variant_id,
          movement_type: 'OUT',
          quantity: item.quantity, // Scaled by 1000 (same as input)
          unit_cost_minor: item.unit_price_minor,
          reference_type: item.is_manual ? 'MANUAL_SALE' : 'SALE',
          reference_id: saleRecord.id,
          notes: item.is_manual ? `Manual Sale ${invoiceNumber}` : `Sale ${invoiceNumber}`,
        })
        .run();
    }

    // 8. Insert payments
    for (const payment of input.payments) {
      tx.insert(salePayments)
        .values({
          sale_id: saleRecord.id,
          payment_method: payment.payment_method,
          amount_minor: payment.amount_minor,
          tendered_minor: payment.tendered_minor ?? payment.amount_minor,
        })
        .run();
        
      if (payment.payment_method === 'cash') {
        const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
        if (session) {
          tx.insert(cashMovements).values({
            session_id: session.id,
            movement_type: 'SALE',
            amount_minor: payment.amount_minor,
            reference_type: 'SALE',
            reference_id: saleRecord.id,
            description: `Cash sale ${invoiceNumber}`,
          }).run();
        }
      }
    }

    // 9. If credit payment (Khata), update customer balance and ledger
    if (creditAmount > 0 && input.customer_id) {
      const customer = tx.select().from(customers).where(eq(customers.id, input.customer_id)).get();
      if (!customer) {
        throw new Error(`Customer with ID ${String(input.customer_id)} not found`);
      }
      if (!customer.is_active) {
        throw new Error(`Customer "${customer.name}" is deactivated and cannot make credit purchases`);
      }

      // Check credit limit if configured (> 0)
      if (customer.credit_limit_minor > 0 && (customer.current_balance_minor + creditAmount) > customer.credit_limit_minor) {
        throw new Error(
          `Credit limit exceeded for customer "${customer.name}". Current balance: ${String(customer.current_balance_minor)}, Attempted addition: ${String(creditAmount)}, Limit: ${String(customer.credit_limit_minor)}`
        );
      }

      const newCustomerBalance = customer.current_balance_minor + creditAmount;
      tx.update(customers)
        .set({
          current_balance_minor: newCustomerBalance,
          updated_at: new Date().toISOString(),
        })
        .where(eq(customers.id, input.customer_id))
        .run();

      tx.insert(customerTransactions).values({
        customer_id: input.customer_id,
        transaction_type: 'SALE_CREDIT',
        amount_minor: creditAmount,
        reference_type: 'SALE',
        reference_id: saleRecord.id,
        notes: `Khata credit sale ${invoiceNumber}`,
      }).run();
    }

    return saleRecord.id;
  });

  const completedSale = getSaleById(saleId);

  if (creditAmount > 0 && input.customer_id) {
    logAuditEvent({
      event_type: 'CREDIT_SALE',
      status: 'SUCCESS',
      details: `Credit sale ${completedSale.invoice_number} (Credit: ${String(creditAmount)} minor) for customer #${String(input.customer_id)}`,
    });
  }

  return completedSale;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isUniqueOrConcurrencyError =
        errorMessage.includes('UNIQUE constraint failed') ||
        errorMessage.includes('invoice_number') ||
        errorMessage.includes('SQLITE_CONSTRAINT') ||
        errorMessage.includes('busy') ||
        errorMessage.includes('locked');

      if (attempt < MAX_ATTEMPTS && isUniqueOrConcurrencyError) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Get a sale by ID with items and payments.
 */
export function getSaleById(id: number): SaleRow {
  const db = getDb();
  const sale = db
    .select()
    .from(sales)
    .where(eq(sales.id, id))
    .get();

  if (!sale) {
    throw new Error(`Sale with ID ${String(id)} not found`);
  }

  // Fetch items with joined product/variant info
  const items = db
    .select({
      id: saleItems.id,
      sale_id: saleItems.sale_id,
      variant_id: saleItems.variant_id,
      quantity: saleItems.quantity,
      unit_price_minor: saleItems.unit_price_minor,
      discount_minor: saleItems.discount_minor,
      line_total_minor: saleItems.line_total_minor,
      is_manual: saleItems.is_manual,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
    })
    .from(saleItems)
    .leftJoin(productVariants, eq(saleItems.variant_id, productVariants.id))
    .leftJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(saleItems.sale_id, id))
    .all();

  const payments = db
    .select()
    .from(salePayments)
    .where(eq(salePayments.sale_id, id))
    .all();

  return {
    ...sale,
    status: sale.status as SaleStatus,
    items,
    payments,
  };
}

/**
 * List recent sales (most recent first).
 */
export function listRecentSales(limit = 50): SaleRow[] {
  const db = getDb();
  const rows = db
    .select()
    .from(sales)
    .orderBy(desc(sales.created_at))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    ...r,
    status: r.status as SaleStatus,
  }));
}

export function searchSales(params: SaleSearchParams = {}): SaleRow[] {
  const db = getDb();
  const conditions = [];
  if (params.status) conditions.push(eq(sales.status, params.status));
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(or(like(sales.invoice_number, term), like(sales.notes, term)));
  }
  let query = db.select().from(sales);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return query.orderBy(desc(sales.created_at), desc(sales.id)).limit(params.limit && params.limit > 0 ? params.limit : 50).all().map((row) => ({ ...row, status: row.status as SaleStatus }));
}

export function voidSale(id: number): SaleRow {
  if (!Number.isInteger(id) || id <= 0) throw new Error('Valid sale ID is required');
  const saleId = withTransaction((tx) => {
    const sale = tx.select().from(sales).where(eq(sales.id, id)).get();
    if (!sale) throw new Error(`Sale with ID ${String(id)} not found`);
    if (sale.status !== 'completed') throw new Error('Only completed sales can be voided');

    const items = tx.select().from(saleItems).where(eq(saleItems.sale_id, id)).all();
    for (const item of items) {
      tx.insert(stockMovements).values({
        variant_id: item.variant_id,
        movement_type: 'IN',
        quantity: item.quantity,
        unit_cost_minor: item.unit_price_minor,
        reference_type: 'SALE_VOID',
        reference_id: id,
        notes: `Voided sale ${sale.invoice_number}`,
      }).run();
    }

    const creditTransaction = tx.select().from(customerTransactions).where(and(eq(customerTransactions.reference_type, 'SALE'), eq(customerTransactions.reference_id, id), eq(customerTransactions.transaction_type, 'SALE_CREDIT'))).get();
    if (creditTransaction) {
      const customer = tx.select().from(customers).where(eq(customers.id, creditTransaction.customer_id)).get();
      if (customer) {
        tx.update(customers).set({ current_balance_minor: customer.current_balance_minor - creditTransaction.amount_minor, updated_at: new Date().toISOString() }).where(eq(customers.id, customer.id)).run();
        tx.insert(customerTransactions).values({ customer_id: customer.id, transaction_type: 'ADJUSTMENT', amount_minor: -creditTransaction.amount_minor, reference_type: 'SALE_VOID', reference_id: id, notes: `Voided credit sale ${sale.invoice_number}` }).run();
      }
    }

    const cashAmount = tx.select({ total: sql<number>`coalesce(sum(${salePayments.amount_minor}), 0)` }).from(salePayments).where(and(eq(salePayments.sale_id, id), eq(salePayments.payment_method, 'cash'))).get()?.total ?? 0;
    if (cashAmount > 0) {
      const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
      if (session) {
        tx.insert(cashMovements).values({ session_id: session.id, movement_type: 'REFUND', amount_minor: cashAmount, reference_type: 'SALE_VOID', reference_id: id, description: `Voided cash sale ${sale.invoice_number}` }).run();
      }
    }

    tx.update(sales).set({ status: 'cancelled' }).where(eq(sales.id, id)).run();
    return id;
  });
  const voided = getSaleById(saleId);
  logAuditEvent({ event_type: 'SALE_VOID', status: 'SUCCESS', details: `Voided sale ${voided.invoice_number}` });
  return voided;
}

// ---- Held Bills ----

/**
 * Hold a bill (save cart snapshot to SQLite).
 */
export function holdBill(input: HoldBillInput): HeldBillRow {
  if (input.items.length === 0) {
    throw new Error('Cannot hold an empty bill');
  }

  const db = getDb();
  const cartData = JSON.stringify({
    items: input.items,
    discount_minor: input.discount_minor,
  });

  const result = db
    .insert(heldBills)
    .values({
      cart_data: cartData,
      notes: input.notes ?? null,
    })
    .returning()
    .get();

  logAuditEvent({ event_type: 'BILL_HOLD', status: 'SUCCESS', details: `Held bill #${String(result.id)}` });
  return result;
}

/**
 * Get all held bills.
 */
export function getHeldBills(): HeldBillRow[] {
  const db = getDb();
  return db
    .select()
    .from(heldBills)
    .orderBy(desc(heldBills.created_at))
    .all();
}

/**
 * Resume a held bill (return cart data and delete the held bill).
 */
export function resumeHeldBill(id: number): HeldBillRow {
  const db = getDb();
  const bill = db.select().from(heldBills).where(eq(heldBills.id, id)).get();
  if (!bill) {
    throw new Error(`Held bill with ID ${String(id)} not found`);
  }

  // Delete the held bill since it's being resumed
  db.delete(heldBills).where(eq(heldBills.id, id)).run();

  logAuditEvent({ event_type: 'BILL_RESUME', status: 'SUCCESS', details: `Resumed held bill #${String(id)}` });
  return bill;
}

/**
 * Delete a held bill without resuming it.
 */
export function deleteHeldBill(id: number): void {
  const db = getDb();
  const bill = db.select().from(heldBills).where(eq(heldBills.id, id)).get();
  if (!bill) {
    throw new Error(`Held bill with ID ${String(id)} not found`);
  }
  db.delete(heldBills).where(eq(heldBills.id, id)).run();
  logAuditEvent({ event_type: 'BILL_DELETE', status: 'SUCCESS', details: `Deleted held bill #${String(id)}` });
}
