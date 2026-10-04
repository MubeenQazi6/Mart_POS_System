import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import {
  purchases,
  purchaseItems,
  purchasePayments,
  suppliers,
  supplierTransactions,
  productVariants,
  products,
  units,
  stockMovements,
  settings,
  cashSessions,
  cashMovements,
} from '../database/schema/index';
import { eq, and, desc, gte, lte, like, or } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  PurchaseRow,
  CreatePurchaseInput,
  PurchaseSearchParams,
  PurchaseKpis,
  PaymentStatus,
} from '@shared/types/purchases';

const PURCHASE_SEQUENCE_KEY = 'purchase.internal_sequence';

export function generatePurchaseNumber(seq: number): string {
  return `PUR-${seq.toString().padStart(5, '0')}`;
}

export function getPurchaseById(id: number): PurchaseRow {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Valid purchase ID is required');
  }

  const db = getDb();
  const purchase = db
    .select({
      id: purchases.id,
      purchase_number: purchases.purchase_number,
      supplier_id: purchases.supplier_id,
      supplier_name: suppliers.name,
      supplier_invoice_number: purchases.supplier_invoice_number,
      subtotal_minor: purchases.subtotal_minor,
      discount_minor: purchases.discount_minor,
      tax_minor: purchases.tax_minor,
      total_minor: purchases.total_minor,
      paid_amount_minor: purchases.paid_amount_minor,
      balance_minor: purchases.balance_minor,
      payment_status: purchases.payment_status,
      notes: purchases.notes,
      created_at: purchases.created_at,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplier_id, suppliers.id))
    .where(eq(purchases.id, id))
    .get();

  if (!purchase) {
    throw new Error(`Purchase with ID ${String(id)} not found`);
  }

  const items = db
    .select({
      id: purchaseItems.id,
      purchase_id: purchaseItems.purchase_id,
      variant_id: purchaseItems.variant_id,
      quantity: purchaseItems.quantity,
      unit_cost_minor: purchaseItems.unit_cost_minor,
      line_total_minor: purchaseItems.line_total_minor,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      unit_abbreviation: units.abbreviation,
      unit_decimals: units.decimals,
    })
    .from(purchaseItems)
    .innerJoin(productVariants, eq(purchaseItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .leftJoin(units, eq(productVariants.unit_id, units.id))
    .where(eq(purchaseItems.purchase_id, id))
    .all();

  const payments = db
    .select()
    .from(purchasePayments)
    .where(eq(purchasePayments.purchase_id, id))
    .all();

  return {
    ...purchase,
    payment_status: purchase.payment_status as PaymentStatus,
    items,
    payments,
  };
}

export function listPurchases(params: PurchaseSearchParams = {}): PurchaseRow[] {
  const db = getDb();
  const limit = typeof params.limit === 'number' && params.limit > 0 ? params.limit : 100;

  let query = db
    .select({
      id: purchases.id,
      purchase_number: purchases.purchase_number,
      supplier_id: purchases.supplier_id,
      supplier_name: suppliers.name,
      supplier_invoice_number: purchases.supplier_invoice_number,
      subtotal_minor: purchases.subtotal_minor,
      discount_minor: purchases.discount_minor,
      tax_minor: purchases.tax_minor,
      total_minor: purchases.total_minor,
      paid_amount_minor: purchases.paid_amount_minor,
      balance_minor: purchases.balance_minor,
      payment_status: purchases.payment_status,
      notes: purchases.notes,
      created_at: purchases.created_at,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplier_id, suppliers.id));

  const conditions = [];

  if (params.supplier_id !== undefined) {
    conditions.push(eq(purchases.supplier_id, params.supplier_id));
  }
  if (params.payment_status !== undefined) {
    conditions.push(eq(purchases.payment_status, params.payment_status));
  }
  if (params.date_from) {
    conditions.push(gte(purchases.created_at, params.date_from));
  }
  if (params.date_to) {
    conditions.push(lte(purchases.created_at, params.date_to));
  }
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(purchases.purchase_number, term),
        like(purchases.supplier_invoice_number, term),
        like(suppliers.name, term),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = query.orderBy(desc(purchases.created_at), desc(purchases.id)).limit(limit).all();

  return rows.map((r) => ({
    ...r,
    payment_status: r.payment_status as PaymentStatus,
  }));
}

export function createPurchase(input: CreatePurchaseInput): PurchaseRow {
  if (!Number.isInteger(input.supplier_id) || input.supplier_id <= 0) {
    throw new Error('Valid supplier ID is required');
  }
  if (input.items.length === 0) {
    throw new Error('Purchase must contain at least one item');
  }

  const discountMinor = typeof input.discount_minor === 'number' && input.discount_minor >= 0 ? input.discount_minor : 0;
  const taxMinor = typeof input.tax_minor === 'number' && input.tax_minor >= 0 ? input.tax_minor : 0;

  // Validate items
  for (const item of input.items) {
    if (!Number.isInteger(item.variant_id) || item.variant_id <= 0) {
      throw new Error('Valid variant ID is required for each purchase item');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Item quantity must be a positive integer in thousandths');
    }
    if (!Number.isInteger(item.unit_cost_minor) || item.unit_cost_minor < 0) {
      throw new Error('Unit cost must be a non-negative integer in minor units');
    }
  }

  const purchaseId = withTransaction((tx) => {
    const supplier = tx.select().from(suppliers).where(eq(suppliers.id, input.supplier_id)).get();
    if (!supplier) {
      throw new Error(`Supplier with ID ${String(input.supplier_id)} not found`);
    }

    // Monotonic sequence increment
    const currentSeqRow = tx.select().from(settings).where(eq(settings.key, PURCHASE_SEQUENCE_KEY)).get();
    let nextSeq = 1;
    if (currentSeqRow) {
      const parsed = parseInt(currentSeqRow.value, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        nextSeq = parsed + 1;
      }
    }

    const now = new Date().toISOString();
    if (currentSeqRow) {
      tx.update(settings)
        .set({ value: nextSeq.toString(), updated_at: now })
        .where(eq(settings.key, PURCHASE_SEQUENCE_KEY))
        .run();
    } else {
      tx.insert(settings)
        .values({ key: PURCHASE_SEQUENCE_KEY, value: nextSeq.toString(), updated_at: now })
        .run();
    }

    const purchaseNumber = generatePurchaseNumber(nextSeq);

    // Calculate item line totals
    let subtotalMinor = 0;
    const rawLineTotals: number[] = [];
    for (const item of input.items) {
      const lineSubtotal = Math.round((item.quantity * item.unit_cost_minor) / 1000);
      subtotalMinor += lineSubtotal;
      rawLineTotals.push(lineSubtotal);
    }

    if (discountMinor > subtotalMinor) {
      throw new Error(`Discount (${String(discountMinor)}) exceeds purchase subtotal (${String(subtotalMinor)})`);
    }

    let allocatedDiscount = 0;
    const computedItems = input.items.map((item, i) => {
      const lineSubtotal = rawLineTotals[i]!;
      let lineDiscount = 0;
      if (discountMinor > 0 && subtotalMinor > 0) {
        if (i === input.items.length - 1) {
          lineDiscount = discountMinor - allocatedDiscount;
        } else {
          lineDiscount = Math.round((lineSubtotal * discountMinor) / subtotalMinor);
          allocatedDiscount += lineDiscount;
        }
      }
      const lineTotal = Math.max(0, lineSubtotal - lineDiscount);
      return {
        ...item,
        line_total_minor: lineTotal,
      };
    });

    const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor);

    // Calculate payment total
    let paidAmountMinor = 0;
    const payments = input.payments || [];
    for (const p of payments) {
      if (!Number.isInteger(p.amount_minor) || p.amount_minor <= 0) {
        throw new Error('Payment amount must be a positive integer in minor units');
      }
      paidAmountMinor += p.amount_minor;
    }

    const balanceMinor = Math.max(0, totalMinor - paidAmountMinor);
    const paymentStatus: PaymentStatus =
      paidAmountMinor >= totalMinor ? 'paid' : paidAmountMinor > 0 ? 'partial' : 'unpaid';

    // Insert purchase record
    const insertedPurchase = tx
      .insert(purchases)
      .values({
        purchase_number: purchaseNumber,
        supplier_id: input.supplier_id,
        supplier_invoice_number: input.supplier_invoice_number?.trim() || null,
        subtotal_minor: subtotalMinor,
        discount_minor: discountMinor,
        tax_minor: taxMinor,
        total_minor: totalMinor,
        paid_amount_minor: paidAmountMinor,
        balance_minor: balanceMinor,
        payment_status: paymentStatus,
        notes: input.notes?.trim() || null,
      })
      .returning({ id: purchases.id })
      .get();

    // Insert purchase items and IN stock movements
    for (const item of computedItems) {
      tx.insert(purchaseItems).values({
        purchase_id: insertedPurchase.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_cost_minor: item.unit_cost_minor,
        line_total_minor: item.line_total_minor,
      }).run();

      // Inbound stock movement
      tx.insert(stockMovements).values({
        variant_id: item.variant_id,
        movement_type: 'IN',
        quantity: item.quantity,
        unit_cost_minor: item.unit_cost_minor,
        reference_type: 'PURCHASE',
        reference_id: insertedPurchase.id,
        notes: `Purchase order ${purchaseNumber}`,
      }).run();

      // Optional: update variant catalog purchase price
      if (input.update_variant_cost) {
        tx.update(productVariants)
          .set({
            purchase_price_minor: item.unit_cost_minor,
            updated_at: new Date().toISOString(),
          })
          .where(eq(productVariants.id, item.variant_id))
          .run();
      }
    }

    // Insert purchase payments
    for (const p of payments) {
      tx.insert(purchasePayments).values({
        purchase_id: insertedPurchase.id,
        supplier_id: input.supplier_id,
        payment_method: p.payment_method,
        amount_minor: p.amount_minor,
        reference_number: p.reference_number?.trim() || null,
        notes: p.notes?.trim() || null,
      }).run();

      if (p.payment_method === 'cash') {
        const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
        if (session) {
          tx.insert(cashMovements).values({
            session_id: session.id,
            movement_type: 'PURCHASE',
            amount_minor: p.amount_minor,
            reference_type: 'PURCHASE',
            reference_id: insertedPurchase.id,
            description: `Cash payment for purchase ${purchaseNumber}`
          }).run();
        }
      }
    }

    // Update supplier balance:
    // Net unpaid balance from this purchase adds to what we owe supplier
    if (balanceMinor > 0) {
      const newSupplierBalance = supplier.current_balance_minor + balanceMinor;
      tx.update(suppliers)
        .set({
          current_balance_minor: newSupplierBalance,
          updated_at: new Date().toISOString(),
        })
        .where(eq(suppliers.id, input.supplier_id))
        .run();

      tx.insert(supplierTransactions).values({
        supplier_id: input.supplier_id,
        transaction_type: 'PURCHASE_BILL',
        amount_minor: balanceMinor,
        reference_type: 'PURCHASE',
        reference_id: insertedPurchase.id,
        notes: `Unpaid balance for purchase ${purchaseNumber}`,
      }).run();
    }

    return insertedPurchase.id;
  });

  const purchase = getPurchaseById(purchaseId);

  logAuditEvent({
    event_type: 'PURCHASE_CREATE',
    status: 'SUCCESS',
    details: `Purchase order ${purchase.purchase_number} created (Total: ${String(purchase.total_minor)} minor, Supplier #${String(purchase.supplier_id)})`,
  });

  return purchase;
}

export function getPurchaseKpis(): PurchaseKpis {
  const db = getDb();
  const allPurchases = db.select().from(purchases).all();
  const allSuppliers = db.select().from(suppliers).where(eq(suppliers.is_active, true)).all();

  let totalValue = 0;
  for (const p of allPurchases) {
    totalValue += p.total_minor;
  }

  let totalPayables = 0;
  for (const s of allSuppliers) {
    if (s.current_balance_minor > 0) {
      totalPayables += s.current_balance_minor;
    }
  }

  return {
    total_purchases_count: allPurchases.length,
    total_purchases_value_minor: totalValue,
    total_payables_minor: totalPayables,
  };
}
