import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import {
  sales, saleItems,
  purchases, purchaseItems, suppliers, customers,
  stockMovements, settings, customerTransactions, cashSessions, cashMovements,
  supplierTransactions,
  salesReturns, salesReturnItems,
  salesExchanges, salesExchangeReturnItems, salesExchangeReplacementItems,
  purchaseReturns, purchaseReturnItems,
  purchaseExchanges, purchaseExchangeReturnItems, purchaseExchangeReplacementItems,
  products, productVariants,
} from '../database/schema/index';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  CreatePurchaseReturnInput,
  CreateSalesReturnInput,
  CreateSalesExchangeInput,
  CreatePurchaseExchangeInput,
  ReturnCondition,
  ReturnRow,
  ReturnItemRow,
  ExchangeRow,
  ExchangeReplacementItemRow,
} from '@shared/types/returns';
import type { Transaction } from './base';

const SALES_RETURN_SEQUENCE = 'sales_return.internal_sequence';
const PURCHASE_RETURN_SEQUENCE = 'purchase_return.internal_sequence';
const SALES_EXCHANGE_SEQUENCE = 'sales_exchange.internal_sequence';
const PURCHASE_EXCHANGE_SEQUENCE = 'purchase_exchange.internal_sequence';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function nextNumber(tx: Transaction, key: string, prefix: string): string {
  const current = tx.select().from(settings).where(eq(settings.key, key)).get();
  const next = (current ? Number.parseInt(current.value, 10) : 0) + 1;
  const now = new Date().toISOString();
  if (current) tx.update(settings).set({ value: String(next), updated_at: now }).where(eq(settings.key, key)).run();
  else tx.insert(settings).values({ key, value: String(next), updated_at: now }).run();
  return `${prefix}-${String(next).padStart(5, '0')}`;
}

function validateCommon(reason: string, items: { source_item_id: number; quantity: number }[]): void {
  if (!reason.trim()) throw new Error('Return reason is required');
  if (items.length === 0) throw new Error('At least one return item is required');
  for (const item of items) {
    if (!Number.isInteger(item.source_item_id) || item.source_item_id <= 0) throw new Error('Valid source item is required');
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error('Return quantity must be a positive integer');
  }
}

function getReturnedQtyForSaleItem(tx: Transaction, saleItemId: number): number {
  // Count both direct returns AND exchange returns
  const fromReturns = tx.select({ total: sql<number>`coalesce(sum(${salesReturnItems.quantity}), 0)` })
    .from(salesReturnItems)
    .where(eq(salesReturnItems.sale_item_id, saleItemId))
    .get();
  const fromExchanges = tx.select({ total: sql<number>`coalesce(sum(${salesExchangeReturnItems.quantity}), 0)` })
    .from(salesExchangeReturnItems)
    .where(eq(salesExchangeReturnItems.sale_item_id, saleItemId))
    .get();
  return Number(fromReturns?.total ?? 0) + Number(fromExchanges?.total ?? 0);
}

function getRefundedAmountForSaleItem(tx: Transaction, saleItemId: number): number {
  const fromReturns = tx.select({ total: sql<number>`coalesce(sum(${salesReturnItems.refund_amount_minor}), 0)` })
    .from(salesReturnItems)
    .where(eq(salesReturnItems.sale_item_id, saleItemId))
    .get();
  const fromExchanges = tx.select({ total: sql<number>`coalesce(sum(${salesExchangeReturnItems.total_amount_minor}), 0)` })
    .from(salesExchangeReturnItems)
    .where(eq(salesExchangeReturnItems.sale_item_id, saleItemId))
    .get();
  return Number(fromReturns?.total ?? 0) + Number(fromExchanges?.total ?? 0);
}

function getReturnedQtyForPurchaseItem(tx: Transaction, purchaseItemId: number): number {
  const fromReturns = tx.select({ total: sql<number>`coalesce(sum(${purchaseReturnItems.quantity}), 0)` })
    .from(purchaseReturnItems)
    .where(eq(purchaseReturnItems.purchase_item_id, purchaseItemId))
    .get();
  const fromExchanges = tx.select({ total: sql<number>`coalesce(sum(${purchaseExchangeReturnItems.quantity}), 0)` })
    .from(purchaseExchangeReturnItems)
    .where(eq(purchaseExchangeReturnItems.purchase_item_id, purchaseItemId))
    .get();
  return Number(fromReturns?.total ?? 0) + Number(fromExchanges?.total ?? 0);
}

function getRefundedAmountForPurchaseItem(tx: Transaction, purchaseItemId: number): number {
  const fromReturns = tx.select({ total: sql<number>`coalesce(sum(${purchaseReturnItems.refund_amount_minor}), 0)` })
    .from(purchaseReturnItems)
    .where(eq(purchaseReturnItems.purchase_item_id, purchaseItemId))
    .get();
  const fromExchanges = tx.select({ total: sql<number>`coalesce(sum(${purchaseExchangeReturnItems.total_amount_minor}), 0)` })
    .from(purchaseExchangeReturnItems)
    .where(eq(purchaseExchangeReturnItems.purchase_item_id, purchaseItemId))
    .get();
  return Number(fromReturns?.total ?? 0) + Number(fromExchanges?.total ?? 0);
}

/** Appends a REFUND/CASH_IN movement to the open cash session if one exists. No-op otherwise. */
function addCashMovement(
  tx: Transaction,
  amount: number,
  type: 'CASH_IN' | 'CASH_OUT' | 'REFUND',
  referenceId: number,
  description: string,
): void {
  const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
  if (!session) return; // no open session — no cash drawer entry (not a crash)
  tx.insert(cashMovements).values({
    session_id: session.id,
    movement_type: type,
    amount_minor: amount,
    reference_type: 'RETURN',
    reference_id: referenceId,
    description,
  }).run();
}



// ──────────────────────────────────────────────────────────────────────────────
// Search helpers (for the "find original invoice" flow)
// ──────────────────────────────────────────────────────────────────────────────

export function searchSales(search: string): ReturnRow[] {
  const db = getDb();
  const conditions = [eq(sales.status, 'completed')];
  if (search.trim()) {
    const s = `%${search.trim()}%`;
    const cond = or(
      like(sales.invoice_number, s),
      like(sales.notes, s),
      sql`sales.id like ${s}`,
      sql`exists (select 1 from customer_transactions ct inner join customers c on ct.customer_id = c.id where ct.reference_type = 'SALE' and ct.reference_id = sales.id and (c.name like ${s} or c.phone like ${s}))`,
    );
    if (cond) conditions.push(cond);
  }
  return db.select({
    id: sales.id,
    source_id: sales.id,
    source_number: sales.invoice_number,
    party_name: sql<string | null>`(select c.name from customer_transactions ct inner join customers c on ct.customer_id = c.id where ct.reference_type = 'SALE' and ct.reference_id = sales.id limit 1)`,
    customer_id: sql<number | null>`(select ct.customer_id from customer_transactions ct where ct.reference_type = 'SALE' and ct.reference_id = sales.id limit 1)`,
    refund_amount_minor: sales.total_minor,
    refund_method: sql<string>`''`,
    reason: sql<string>`''`,
    created_at: sales.created_at,
  }).from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.created_at))
    .limit(25)
    .all()
    .map((row) => {
      const saleItemRows = db.select({
        id: saleItems.id,
        source_item_id: saleItems.id,
        variant_id: saleItems.variant_id,
        quantity: saleItems.quantity,
        amount_minor: saleItems.line_total_minor,
        unit_amount_minor: saleItems.unit_price_minor,
        original_unit_price_minor: saleItems.unit_price_minor,
        discount_minor: saleItems.discount_minor,
        original_quantity: saleItems.quantity,
        product_name: products.name,
        variant_name: productVariants.variant_name,
        sku: productVariants.sku,
        barcode: sql<string | null>`(select b.barcode from product_barcodes b where b.variant_id = ${productVariants.id} and b.is_active = 1 order by b.is_primary desc, b.id asc limit 1)`,
      }).from(saleItems)
        .innerJoin(productVariants, eq(saleItems.variant_id, productVariants.id))
        .innerJoin(products, eq(productVariants.product_id, products.id))
        .where(eq(saleItems.sale_id, row.source_id))
        .all();

      return {
        ...row,
        return_number: '',
        refund_method: '',
        reason: '',
        record_type: 'return' as const,
        items: saleItemRows.map((item) => {
          const effectiveUnitPrice =
            item.quantity > 0
              ? Math.round((item.amount_minor * 1000) / item.quantity)
              : item.unit_amount_minor;

          return {
            ...item,
            unit_amount_minor: effectiveUnitPrice,
            original_unit_price_minor: item.original_unit_price_minor,
            discount_minor: item.discount_minor,
            remaining_quantity: item.quantity - (() => {
              const fromRet = db.select({ t: sql<number>`coalesce(sum(${salesReturnItems.quantity}),0)` }).from(salesReturnItems).where(eq(salesReturnItems.sale_item_id, item.id)).get();
              const fromEx = db.select({ t: sql<number>`coalesce(sum(${salesExchangeReturnItems.quantity}),0)` }).from(salesExchangeReturnItems).where(eq(salesExchangeReturnItems.sale_item_id, item.id)).get();
              return Number(fromRet?.t ?? 0) + Number(fromEx?.t ?? 0);
            })(),
          };
        }),
      } as ReturnRow;
    });
}

export function searchPurchases(search: string): ReturnRow[] {
  const db = getDb();
  let query = db.select({
    id: purchases.id,
    source_id: purchases.id,
    source_number: purchases.purchase_number,
    party_name: suppliers.name,
    refund_amount_minor: purchases.total_minor,
    refund_method: sql<string>`''`,
    reason: sql<string>`''`,
    created_at: purchases.created_at,
  }).from(purchases).innerJoin(suppliers, eq(purchases.supplier_id, suppliers.id));

  if (search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.where(or(
      like(purchases.purchase_number, s),
      like(purchases.supplier_invoice_number, s),
      like(suppliers.name, s),
    )) as typeof query;
  }

  return query.orderBy(desc(purchases.created_at)).limit(25).all().map((row) => {
    const purchItemRows = db.select({
      id: purchaseItems.id,
      source_item_id: purchaseItems.id,
      variant_id: purchaseItems.variant_id,
      quantity: purchaseItems.quantity,
      amount_minor: purchaseItems.line_total_minor,
      unit_amount_minor: purchaseItems.unit_cost_minor,
      original_quantity: purchaseItems.quantity,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      barcode: sql<string | null>`(select b.barcode from product_barcodes b where b.variant_id = ${productVariants.id} and b.is_active = 1 order by b.is_primary desc, b.id asc limit 1)`,
    }).from(purchaseItems)
      .innerJoin(productVariants, eq(purchaseItems.variant_id, productVariants.id))
      .innerJoin(products, eq(productVariants.product_id, products.id))
      .where(eq(purchaseItems.purchase_id, row.source_id))
      .all();

    return {
      ...row,
      return_number: '',
      refund_method: '',
      reason: '',
      record_type: 'return' as const,
      items: purchItemRows.map((item) => ({
        ...item,
        remaining_quantity: item.quantity - (() => {
          const fromRet = db.select({ t: sql<number>`coalesce(sum(${purchaseReturnItems.quantity}),0)` }).from(purchaseReturnItems).where(eq(purchaseReturnItems.purchase_item_id, item.id)).get();
          const fromEx = db.select({ t: sql<number>`coalesce(sum(${purchaseExchangeReturnItems.quantity}),0)` }).from(purchaseExchangeReturnItems).where(eq(purchaseExchangeReturnItems.purchase_item_id, item.id)).get();
          return Number(fromRet?.t ?? 0) + Number(fromEx?.t ?? 0);
        })(),
      })),
    } as ReturnRow;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Customer Sales Return (Return only — cash/credit/card refund)
// ──────────────────────────────────────────────────────────────────────────────

export function createSalesReturn(input: CreateSalesReturnInput): ReturnRow {
  validateCommon(input.reason, input.items);

  const id = withTransaction((tx) => {
    const sale = tx.select().from(sales).where(and(eq(sales.id, input.sale_id), eq(sales.status, 'completed'))).get();
    if (!sale) throw new Error('Completed sale not found');

    const saleItemRows = tx.select().from(saleItems).where(eq(saleItems.sale_id, sale.id)).all();
    let refundTotal = 0;
    type PreparedReturn = { item: typeof saleItemRows[number]; quantity: number; amount: number; condition: ReturnCondition };
    const prepared: PreparedReturn[] = [];
    const returnedQtyByItem: Record<number, number> = {};
    const refundedAmountByItem: Record<number, number> = {};

    for (const req of input.items) {
      const item = saleItemRows.find((si) => si.id === req.source_item_id);
      if (!item) throw new Error(`Sale item ${String(req.source_item_id)} does not belong to sale ${String(sale.id)}`);
      const dbReturnedQty = getReturnedQtyForSaleItem(tx, item.id);
      const txReturnedQtySoFar = returnedQtyByItem[item.id] ?? 0;
      const alreadyReturned = dbReturnedQty + txReturnedQtySoFar;
      const remaining = item.quantity - alreadyReturned;
      if (req.quantity > remaining) {
        throw new Error(`Cannot return ${String(req.quantity / 1000)} units — only ${String(remaining / 1000)} returnable`);
      }
      
      const dbRefundedAmount = getRefundedAmountForSaleItem(tx, item.id);
      const txRefundedAmountSoFar = refundedAmountByItem[item.id] ?? 0;
      const previouslyRefunded = dbRefundedAmount + txRefundedAmountSoFar;
      // Proportional refund using discount-inclusive line_total_minor
      let amount: number;
      if (req.quantity === item.quantity && alreadyReturned === 0) {
        amount = item.line_total_minor;
      } else if (req.quantity === remaining) {
        amount = item.line_total_minor - previouslyRefunded;
      } else {
        amount = Math.round((req.quantity * item.line_total_minor) / item.quantity);
      }
      returnedQtyByItem[item.id] = txReturnedQtySoFar + req.quantity;
      refundedAmountByItem[item.id] = txRefundedAmountSoFar + amount;
      refundTotal += amount;
      prepared.push({ item, quantity: req.quantity, amount, condition: req.return_condition ?? 'resalable' });
    }

    const returnNumber = nextNumber(tx, SALES_RETURN_SEQUENCE, 'RET');

    // Determine customer_id from input or credit sale linkage or customerTransactions
    let customerId: number | null = input.customer_id ?? null;
    if (!customerId) {
      const ctRow = tx.select({ customer_id: customerTransactions.customer_id })
        .from(customerTransactions)
        .where(and(
          eq(customerTransactions.reference_type, 'SALE'),
          eq(customerTransactions.reference_id, sale.id),
        )).get();
      customerId = ctRow?.customer_id ?? null;
    }

    if (input.refund_method === 'credit' && !customerId) {
      throw new Error('Credit refund requires a customer linked to this sale; use cash refund instead or link a customer first');
    }

    const created = tx.insert(salesReturns).values({
      return_number: returnNumber,
      sale_id: sale.id,
      customer_id: customerId,
      refund_amount_minor: refundTotal,
      refund_method: input.refund_method,
      reason: input.reason.trim(),
    }).returning({ id: salesReturns.id }).get();

    for (const entry of prepared) {
      tx.insert(salesReturnItems).values({
        return_id: created.id,
        sale_item_id: entry.item.id,
        variant_id: entry.item.variant_id,
        quantity: entry.quantity,
        unit_price_minor: entry.item.unit_price_minor,
        refund_amount_minor: entry.amount,
        return_condition: entry.condition,
      }).run();

      // Restore stock only for resalable items
      if (entry.condition === 'resalable') {
        tx.insert(stockMovements).values({
          variant_id: entry.item.variant_id,
          movement_type: 'IN',
          quantity: entry.quantity,
          unit_cost_minor: entry.item.unit_price_minor,
          reference_type: 'SALE_RETURN',
          reference_id: created.id,
          notes: input.reason.trim(),
        }).run();
      }
    }

    // Cash movement: cash refund decreases drawer
    if (input.refund_method === 'cash') {
      addCashMovement(tx, refundTotal, 'REFUND', created.id, `Sales return ${returnNumber}`);
    }

    // Credit refund: reverse customer Khata balance
    if (input.refund_method === 'credit' && customerId) {
      const customer = tx.select().from(customers).where(eq(customers.id, customerId)).get();
      if (customer) {
        tx.update(customers).set({
          current_balance_minor: Math.max(0, customer.current_balance_minor - refundTotal),
          updated_at: new Date().toISOString(),
        }).where(eq(customers.id, customer.id)).run();
        tx.insert(customerTransactions).values({
          customer_id: customer.id,
          transaction_type: 'ADJUSTMENT',
          amount_minor: -refundTotal,
          reference_type: 'SALE_RETURN',
          reference_id: created.id,
          notes: `Return ${returnNumber}: ${input.reason.trim()}`,
        }).run();
      }
    }

    return created.id;
  });

  logAuditEvent({ event_type: 'SALES_RETURN_CREATE', status: 'SUCCESS', details: `Sales return #${String(id)} created` });
  return getSalesReturnById(id);
}

// ──────────────────────────────────────────────────────────────────────────────
// Customer Sales Exchange
// ──────────────────────────────────────────────────────────────────────────────

export function createSalesExchange(input: CreateSalesExchangeInput): ExchangeRow {
  if (!input.reason.trim()) throw new Error('Exchange reason is required');
  if (input.return_items.length === 0) throw new Error('At least one return item is required');
  if (input.replacement_items.length === 0) throw new Error('At least one replacement item is required');

  const id = withTransaction((tx) => {
    const sale = tx.select().from(sales).where(and(eq(sales.id, input.sale_id), eq(sales.status, 'completed'))).get();
    if (!sale) throw new Error('Completed sale not found');

    const saleItemRows = tx.select().from(saleItems).where(eq(saleItems.sale_id, sale.id)).all();

    // --- Validate & prepare return side ---
    let returnTotal = 0;
    type PreparedReturn = { item: typeof saleItemRows[number]; quantity: number; amount: number; condition: ReturnCondition };
    const preparedReturns: PreparedReturn[] = [];
    const returnedQtyByItem: Record<number, number> = {};
    const refundedAmountByItem: Record<number, number> = {};

    for (const req of input.return_items) {
      const item = saleItemRows.find((si) => si.id === req.source_item_id);
      if (!item) throw new Error(`Sale item ${String(req.source_item_id)} does not belong to sale ${String(sale.id)}`);
      const dbReturnedQty = getReturnedQtyForSaleItem(tx, item.id);
      const txReturnedQtySoFar = returnedQtyByItem[item.id] ?? 0;
      const alreadyReturned = dbReturnedQty + txReturnedQtySoFar;
      const remaining = item.quantity - alreadyReturned;
      if (req.quantity > remaining) {
        throw new Error(`Cannot return ${String(req.quantity / 1000)} units — only ${String(remaining / 1000)} returnable`);
      }
      const dbRefundedAmount = getRefundedAmountForSaleItem(tx, item.id);
      const txRefundedAmountSoFar = refundedAmountByItem[item.id] ?? 0;
      const previouslyRefunded = dbRefundedAmount + txRefundedAmountSoFar;
      let amount: number;
      if (req.quantity === item.quantity && alreadyReturned === 0) {
        amount = item.line_total_minor;
      } else if (req.quantity === remaining) {
        amount = item.line_total_minor - previouslyRefunded;
      } else {
        amount = Math.round((req.quantity * item.line_total_minor) / item.quantity);
      }
      returnedQtyByItem[item.id] = txReturnedQtySoFar + req.quantity;
      refundedAmountByItem[item.id] = txRefundedAmountSoFar + amount;
      returnTotal += amount;
      preparedReturns.push({ item, quantity: req.quantity, amount, condition: req.return_condition ?? 'resalable' });
    }

    // --- Validate & prepare replacement side ---
    let replacementTotal = 0;
    type PreparedReplacement = { variant_id: number; quantity: number; unit_price_minor: number; total: number };
    const preparedReplacements: PreparedReplacement[] = [];

    for (const req of input.replacement_items) {
      const variant = tx.select().from(productVariants).where(and(eq(productVariants.id, req.variant_id), eq(productVariants.is_active, true))).get();
      if (!variant) throw new Error(`Variant ${String(req.variant_id)} not found or inactive`);
      if (!Number.isInteger(req.quantity) || req.quantity <= 0) throw new Error('Replacement quantity must be a positive integer');
      const unitPrice = req.unit_price_minor ?? variant.selling_price_minor;
      const total = Math.round((req.quantity * unitPrice) / 1000);
      replacementTotal += total;
      preparedReplacements.push({ variant_id: req.variant_id, quantity: req.quantity, unit_price_minor: unitPrice, total });
    }

    // Check allow_negative_stock setting BEFORE writing stock movements
    const allowNegSetting = tx
      .select()
      .from(settings)
      .where(eq(settings.key, 'pos.allow_negative_stock'))
      .get();
    let allowNegativeStock = false;
    if (allowNegSetting?.value) {
      try {
        allowNegativeStock = JSON.parse(allowNegSetting.value) === true;
      } catch {
        allowNegativeStock = allowNegSetting.value === 'true';
      }
    }

    if (!allowNegativeStock) {
      const neededByVariant: Record<number, number> = {};
      for (const rep of preparedReplacements) {
        neededByVariant[rep.variant_id] = (neededByVariant[rep.variant_id] ?? 0) + rep.quantity;
      }
      const restockedByVariant: Record<number, number> = {};
      for (const ret of preparedReturns) {
        if (ret.condition === 'resalable') {
          restockedByVariant[ret.item.variant_id] = (restockedByVariant[ret.item.variant_id] ?? 0) + ret.quantity;
        }
      }

      for (const [vIdStr, neededQty] of Object.entries(neededByVariant)) {
        const vId = Number(vIdStr);
        const currentStockRow = tx.select({
          stock: sql<number>`coalesce(sum(case when movement_type = 'IN' then quantity else -quantity end), 0)`.mapWith(Number),
        }).from(stockMovements).where(eq(stockMovements.variant_id, vId)).get();
        const currentStock = currentStockRow?.stock ?? 0;
        const restocked = restockedByVariant[vId] ?? 0;
        const available = currentStock + restocked;

        if (available < neededQty) {
          throw new Error(`Only ${String(available / 1000)} units are available for replacement variant #${String(vId)}`);
        }
      }
    }

    // Difference: positive = customer pays, negative = store refunds
    const difference = replacementTotal - returnTotal;

    // Determine customer from input or credit linkage or customerTransactions
    let customerId: number | null = input.customer_id ?? null;
    if (!customerId) {
      const ctRow = tx.select({ customer_id: customerTransactions.customer_id })
        .from(customerTransactions)
        .where(and(
          eq(customerTransactions.reference_type, 'SALE'),
          eq(customerTransactions.reference_id, sale.id),
        )).get();
      customerId = ctRow?.customer_id ?? null;
    }

    if (input.settlement_method === 'credit' && !customerId) {
      throw new Error('Credit refund requires a customer linked to this sale; use cash refund instead or link a customer first');
    }

    const exchangeNumber = nextNumber(tx, SALES_EXCHANGE_SEQUENCE, 'EXC');

    const created = tx.insert(salesExchanges).values({
      exchange_number: exchangeNumber,
      sale_id: sale.id,
      customer_id: customerId,
      return_total_minor: returnTotal,
      replacement_total_minor: replacementTotal,
      difference_minor: difference,
      settlement_method: input.settlement_method,
      reason: input.reason.trim(),
    }).returning({ id: salesExchanges.id }).get();

    // Insert return items + restore stock for resalable
    for (const entry of preparedReturns) {
      tx.insert(salesExchangeReturnItems).values({
        exchange_id: created.id,
        sale_item_id: entry.item.id,
        variant_id: entry.item.variant_id,
        quantity: entry.quantity,
        unit_price_minor: entry.item.unit_price_minor,
        total_amount_minor: entry.amount,
        return_condition: entry.condition,
      }).run();

      if (entry.condition === 'resalable') {
        tx.insert(stockMovements).values({
          variant_id: entry.item.variant_id,
          movement_type: 'IN',
          quantity: entry.quantity,
          unit_cost_minor: entry.item.unit_price_minor,
          reference_type: 'SALE_EXCHANGE_RETURN',
          reference_id: created.id,
          notes: input.reason.trim(),
        }).run();
      }
    }

    // Insert replacement items + deduct stock
    for (const entry of preparedReplacements) {
      tx.insert(salesExchangeReplacementItems).values({
        exchange_id: created.id,
        variant_id: entry.variant_id,
        quantity: entry.quantity,
        unit_price_minor: entry.unit_price_minor,
        total_amount_minor: entry.total,
      }).run();

      tx.insert(stockMovements).values({
        variant_id: entry.variant_id,
        movement_type: 'OUT',
        quantity: entry.quantity,
        unit_cost_minor: entry.unit_price_minor,
        reference_type: 'SALE_EXCHANGE_REPLACE',
        reference_id: created.id,
        notes: input.reason.trim(),
      }).run();
    }

    // Cash movements
    if (difference > 0) {
      // Customer pays extra — this is a CASH_IN for the store
      if (input.settlement_method === 'cash') {
        addCashMovement(tx, difference, 'CASH_IN', created.id, `Exchange ${exchangeNumber} — customer pays difference`);
      }
    } else if (difference < 0) {
      // Store refunds customer
      if (input.settlement_method === 'cash') {
        addCashMovement(tx, Math.abs(difference), 'REFUND', created.id, `Exchange ${exchangeNumber} — store refunds difference`);
      }
    }
    // difference === 0: no cash movement

    // Credit/Khata adjustment
    if (input.settlement_method === 'credit' && customerId) {
      const customer = tx.select().from(customers).where(eq(customers.id, customerId)).get();
      if (customer) {
        // Positive difference → customer owes more; negative → reduce balance
        const newBalance = customer.current_balance_minor + difference;
        tx.update(customers).set({
          current_balance_minor: Math.max(0, newBalance),
          updated_at: new Date().toISOString(),
        }).where(eq(customers.id, customer.id)).run();
        if (difference !== 0) {
          tx.insert(customerTransactions).values({
            customer_id: customer.id,
            transaction_type: 'ADJUSTMENT',
            amount_minor: difference,
            reference_type: 'SALE_EXCHANGE',
            reference_id: created.id,
            notes: `Exchange ${exchangeNumber}: ${input.reason.trim()}`,
          }).run();
        }
      }
    }

    return created.id;
  });

  logAuditEvent({ event_type: 'SALES_EXCHANGE_CREATE', status: 'SUCCESS', details: `Sales exchange #${String(id)} created` });
  return getSalesExchangeById(id);
}

// ──────────────────────────────────────────────────────────────────────────────
// Supplier Purchase Return
// ──────────────────────────────────────────────────────────────────────────────

export function createPurchaseReturn(input: CreatePurchaseReturnInput): ReturnRow {
  validateCommon(input.reason, input.items);

  const id = withTransaction((tx) => {
    const purchase = tx.select().from(purchases).where(eq(purchases.id, input.purchase_id)).get();
    if (!purchase) throw new Error('Purchase not found');

    const supplier = tx.select().from(suppliers).where(eq(suppliers.id, purchase.supplier_id)).get();
    if (!supplier) throw new Error(`Supplier with ID ${String(purchase.supplier_id)} not found`);

    const purchItemRows = tx.select().from(purchaseItems).where(eq(purchaseItems.purchase_id, purchase.id)).all();
    let refundTotal = 0;
    type PreparedReturn = { item: typeof purchItemRows[number]; quantity: number; amount: number };
    const prepared: PreparedReturn[] = [];
    const returnedQtyByItem: Record<number, number> = {};
    const refundedAmountByItem: Record<number, number> = {};

    for (const req of input.items) {
      const item = purchItemRows.find((pi) => pi.id === req.source_item_id);
      if (!item) throw new Error(`Purchase item ${String(req.source_item_id)} does not belong to purchase ${String(purchase.id)}`);
      const dbReturnedQty = getReturnedQtyForPurchaseItem(tx, item.id);
      const txReturnedQtySoFar = returnedQtyByItem[item.id] ?? 0;
      const alreadyReturned = dbReturnedQty + txReturnedQtySoFar;
      const remaining = item.quantity - alreadyReturned;
      if (req.quantity > remaining) {
        throw new Error(`Cannot return ${String(req.quantity / 1000)} units — only ${String(remaining / 1000)} returnable`);
      }
      
      const dbRefundedAmount = getRefundedAmountForPurchaseItem(tx, item.id);
      const txRefundedAmountSoFar = refundedAmountByItem[item.id] ?? 0;
      const previouslyRefunded = dbRefundedAmount + txRefundedAmountSoFar;
      // Proportional refund using discount-inclusive line_total_minor
      let amount: number;
      if (req.quantity === item.quantity && alreadyReturned === 0) {
        amount = item.line_total_minor;
      } else if (req.quantity === remaining) {
        amount = item.line_total_minor - previouslyRefunded;
      } else {
        amount = Math.round((req.quantity * item.line_total_minor) / item.quantity);
      }
      returnedQtyByItem[item.id] = txReturnedQtySoFar + req.quantity;
      refundedAmountByItem[item.id] = txRefundedAmountSoFar + amount;
      refundTotal += amount;
      prepared.push({ item, quantity: req.quantity, amount });
    }

    // Check allow_negative_stock setting BEFORE writing movements
    const allowNegSetting = tx
      .select()
      .from(settings)
      .where(eq(settings.key, 'pos.allow_negative_stock'))
      .get();
    let allowNegativeStock = false;
    if (allowNegSetting?.value) {
      try {
        allowNegativeStock = JSON.parse(allowNegSetting.value) === true;
      } catch {
        allowNegativeStock = allowNegSetting.value === 'true';
      }
    }

    if (!allowNegativeStock) {
      const neededByVariant: Record<number, number> = {};
      for (const entry of prepared) {
        neededByVariant[entry.item.variant_id] = (neededByVariant[entry.item.variant_id] ?? 0) + entry.quantity;
      }
      for (const [vIdStr, neededQty] of Object.entries(neededByVariant)) {
        const vId = Number(vIdStr);
        const currentStockRow = tx.select({
          stock: sql<number>`coalesce(sum(case when movement_type = 'IN' then quantity else -quantity end), 0)`.mapWith(Number),
        }).from(stockMovements).where(eq(stockMovements.variant_id, vId)).get();
        const currentStock = currentStockRow?.stock ?? 0;
        if (currentStock < neededQty) {
          throw new Error(`Only ${String(currentStock / 1000)} units are in stock to return for variant #${String(vId)}`);
        }
      }
    }

    const returnNumber = nextNumber(tx, PURCHASE_RETURN_SEQUENCE, 'PRET');

    const created = tx.insert(purchaseReturns).values({
      return_number: returnNumber,
      purchase_id: purchase.id,
      supplier_id: purchase.supplier_id,
      refund_amount_minor: refundTotal,
      refund_method: input.refund_method,
      reason: input.reason.trim(),
    }).returning({ id: purchaseReturns.id }).get();

    for (const entry of prepared) {
      tx.insert(purchaseReturnItems).values({
        return_id: created.id,
        purchase_item_id: entry.item.id,
        variant_id: entry.item.variant_id,
        quantity: entry.quantity,
        unit_cost_minor: entry.item.unit_cost_minor,
        refund_amount_minor: entry.amount,
      }).run();

      // Returning to supplier → stock decreases
      tx.insert(stockMovements).values({
        variant_id: entry.item.variant_id,
        movement_type: 'OUT',
        quantity: entry.quantity,
        unit_cost_minor: entry.item.unit_cost_minor,
        reference_type: 'PURCHASE_RETURN',
        reference_id: created.id,
        notes: input.reason.trim(),
      }).run();
    }

    // Supplier balance: returning goods reduces what we owe
    if (refundTotal > 0) {
      tx.update(suppliers).set({
        current_balance_minor: Math.max(0, supplier.current_balance_minor - refundTotal),
        updated_at: new Date().toISOString(),
      }).where(eq(suppliers.id, supplier.id)).run();
      tx.insert(supplierTransactions).values({
        supplier_id: supplier.id,
        transaction_type: 'ADJUSTMENT',
        amount_minor: -refundTotal,
        reference_type: 'PURCHASE_RETURN',
        reference_id: created.id,
        notes: `Return ${returnNumber}: ${input.reason.trim()}`,
      }).run();
    }

    // Cash in if supplier actually repays in cash
    if (input.refund_method === 'cash' && refundTotal > 0) {
      addCashMovement(tx, refundTotal, 'CASH_IN', created.id, `Purchase return ${returnNumber}`);
    }

    return created.id;
  });

  logAuditEvent({ event_type: 'PURCHASE_RETURN_CREATE', status: 'SUCCESS', details: `Purchase return #${String(id)} created` });
  return getPurchaseReturnById(id);
}

// ──────────────────────────────────────────────────────────────────────────────
// Supplier Purchase Exchange
// ──────────────────────────────────────────────────────────────────────────────

export function createPurchaseExchange(input: CreatePurchaseExchangeInput): ExchangeRow {
  if (!input.reason.trim()) throw new Error('Exchange reason is required');
  if (input.return_items.length === 0) throw new Error('At least one return item is required');
  if (input.replacement_items.length === 0) throw new Error('At least one replacement item is required');

  const id = withTransaction((tx) => {
    const purchase = tx.select().from(purchases).where(eq(purchases.id, input.purchase_id)).get();
    if (!purchase) throw new Error('Purchase not found');

    const supplier = tx.select().from(suppliers).where(eq(suppliers.id, purchase.supplier_id)).get();
    if (!supplier) throw new Error(`Supplier with ID ${String(purchase.supplier_id)} not found`);

    const purchItemRows = tx.select().from(purchaseItems).where(eq(purchaseItems.purchase_id, purchase.id)).all();
    let returnTotal = 0;
    type PreparedReturn = { item: typeof purchItemRows[number]; quantity: number; amount: number };
    const preparedReturns: PreparedReturn[] = [];
    const returnedQtyByItem: Record<number, number> = {};
    const refundedAmountByItem: Record<number, number> = {};

    for (const req of input.return_items) {
      const item = purchItemRows.find((pi) => pi.id === req.source_item_id);
      if (!item) throw new Error(`Purchase item ${String(req.source_item_id)} does not belong to purchase`);
      const dbReturnedQty = getReturnedQtyForPurchaseItem(tx, item.id);
      const txReturnedQtySoFar = returnedQtyByItem[item.id] ?? 0;
      const alreadyReturned = dbReturnedQty + txReturnedQtySoFar;
      const remaining = item.quantity - alreadyReturned;
      if (req.quantity > remaining) {
        throw new Error(`Cannot return ${String(req.quantity / 1000)} units — only ${String(remaining / 1000)} returnable`);
      }
      const dbRefundedAmount = getRefundedAmountForPurchaseItem(tx, item.id);
      const txRefundedAmountSoFar = refundedAmountByItem[item.id] ?? 0;
      const previouslyRefunded = dbRefundedAmount + txRefundedAmountSoFar;
      let amount: number;
      if (req.quantity === item.quantity && alreadyReturned === 0) {
        amount = item.line_total_minor;
      } else if (req.quantity === remaining) {
        amount = item.line_total_minor - previouslyRefunded;
      } else {
        amount = Math.round((req.quantity * item.line_total_minor) / item.quantity);
      }
      returnedQtyByItem[item.id] = txReturnedQtySoFar + req.quantity;
      refundedAmountByItem[item.id] = txRefundedAmountSoFar + amount;
      returnTotal += amount;
      preparedReturns.push({ item, quantity: req.quantity, amount });
    }

    let replacementTotal = 0;
    type PreparedReplacement = { variant_id: number; quantity: number; unit_cost_minor: number; total: number };
    const preparedReplacements: PreparedReplacement[] = [];

    for (const req of input.replacement_items) {
      const variant = tx.select().from(productVariants).where(eq(productVariants.id, req.variant_id)).get();
      if (!variant) throw new Error(`Variant ${String(req.variant_id)} not found`);
      if (!Number.isInteger(req.quantity) || req.quantity <= 0) throw new Error('Replacement quantity must be a positive integer');
      const unitCost = req.unit_price_minor ?? variant.purchase_price_minor;
      const total = Math.round((req.quantity * unitCost) / 1000);
      replacementTotal += total;
      preparedReplacements.push({ variant_id: req.variant_id, quantity: req.quantity, unit_cost_minor: unitCost, total });
    }

    // Check allow_negative_stock setting BEFORE writing stock movements
    const allowNegSetting = tx
      .select()
      .from(settings)
      .where(eq(settings.key, 'pos.allow_negative_stock'))
      .get();
    let allowNegativeStock = false;
    if (allowNegSetting?.value) {
      try {
        allowNegativeStock = JSON.parse(allowNegSetting.value) === true;
      } catch {
        allowNegativeStock = allowNegSetting.value === 'true';
      }
    }

    if (!allowNegativeStock) {
      const neededByVariant: Record<number, number> = {};
      for (const entry of preparedReturns) {
        neededByVariant[entry.item.variant_id] = (neededByVariant[entry.item.variant_id] ?? 0) + entry.quantity;
      }
      for (const [vIdStr, neededQty] of Object.entries(neededByVariant)) {
        const vId = Number(vIdStr);
        const currentStockRow = tx.select({
          stock: sql<number>`coalesce(sum(case when movement_type = 'IN' then quantity else -quantity end), 0)`.mapWith(Number),
        }).from(stockMovements).where(eq(stockMovements.variant_id, vId)).get();
        const currentStock = currentStockRow?.stock ?? 0;
        if (currentStock < neededQty) {
          throw new Error(`Only ${String(currentStock / 1000)} units are in stock to return for variant #${String(vId)}`);
        }
      }
    }

    const difference = replacementTotal - returnTotal;
    const exchangeNumber = nextNumber(tx, PURCHASE_EXCHANGE_SEQUENCE, 'PEXC');

    const created = tx.insert(purchaseExchanges).values({
      exchange_number: exchangeNumber,
      purchase_id: purchase.id,
      supplier_id: purchase.supplier_id,
      return_total_minor: returnTotal,
      replacement_total_minor: replacementTotal,
      difference_minor: difference,
      settlement_method: input.settlement_method ?? 'balance_adjustment',
      reason: input.reason.trim(),
    }).returning({ id: purchaseExchanges.id }).get();

    for (const entry of preparedReturns) {
      tx.insert(purchaseExchangeReturnItems).values({
        exchange_id: created.id,
        purchase_item_id: entry.item.id,
        variant_id: entry.item.variant_id,
        quantity: entry.quantity,
        unit_cost_minor: entry.item.unit_cost_minor,
        total_amount_minor: entry.amount,
      }).run();
      tx.insert(stockMovements).values({
        variant_id: entry.item.variant_id,
        movement_type: 'OUT',
        quantity: entry.quantity,
        unit_cost_minor: entry.item.unit_cost_minor,
        reference_type: 'PURCHASE_EXCHANGE_RETURN',
        reference_id: created.id,
        notes: input.reason.trim(),
      }).run();
    }

    for (const entry of preparedReplacements) {
      tx.insert(purchaseExchangeReplacementItems).values({
        exchange_id: created.id,
        variant_id: entry.variant_id,
        quantity: entry.quantity,
        unit_cost_minor: entry.unit_cost_minor,
        total_amount_minor: entry.total,
      }).run();
      tx.insert(stockMovements).values({
        variant_id: entry.variant_id,
        movement_type: 'IN',
        quantity: entry.quantity,
        unit_cost_minor: entry.unit_cost_minor,
        reference_type: 'PURCHASE_EXCHANGE_REPLACE',
        reference_id: created.id,
        notes: input.reason.trim(),
      }).run();
    }

    // Supplier balance: net difference
    const balanceChange = -difference; // returning goods is credit, receiving replacement is debit
    if (balanceChange !== 0) {
      tx.update(suppliers).set({
        current_balance_minor: Math.max(0, supplier.current_balance_minor + balanceChange),
        updated_at: new Date().toISOString(),
      }).where(eq(suppliers.id, supplier.id)).run();
      tx.insert(supplierTransactions).values({
        supplier_id: supplier.id,
        transaction_type: 'ADJUSTMENT',
        amount_minor: balanceChange,
        reference_type: 'PURCHASE_EXCHANGE',
        reference_id: created.id,
        notes: `Exchange ${exchangeNumber}: ${input.reason.trim()}`,
      }).run();
    }

    // Cash movement for cash settlement
    if (input.settlement_method === 'cash') {
      if (difference > 0) {
        addCashMovement(tx, difference, 'CASH_OUT', created.id, `Purchase exchange ${exchangeNumber} — we pay supplier`);
      } else if (difference < 0) {
        addCashMovement(tx, Math.abs(difference), 'CASH_IN', created.id, `Purchase exchange ${exchangeNumber} — supplier refunds`);
      }
    }

    return created.id;
  });

  logAuditEvent({ event_type: 'PURCHASE_EXCHANGE_CREATE', status: 'SUCCESS', details: `Purchase exchange #${String(id)} created` });
  return getPurchaseExchangeById(id);
}

// ──────────────────────────────────────────────────────────────────────────────
// Getters
// ──────────────────────────────────────────────────────────────────────────────

export function getSalesReturnById(id: number): ReturnRow {
  const db = getDb();
  const row = db.select({
    id: salesReturns.id,
    return_number: salesReturns.return_number,
    source_id: salesReturns.sale_id,
    source_number: sales.invoice_number,
    party_name: sql<string | null>`null`,
    refund_amount_minor: salesReturns.refund_amount_minor,
    refund_method: salesReturns.refund_method,
    reason: salesReturns.reason,
    created_at: salesReturns.created_at,
  }).from(salesReturns).innerJoin(sales, eq(salesReturns.sale_id, sales.id)).where(eq(salesReturns.id, id)).get();

  if (!row) throw new Error('Sales return not found');

  const items: ReturnItemRow[] = db.select({
    id: salesReturnItems.id,
    source_item_id: salesReturnItems.sale_item_id,
    variant_id: salesReturnItems.variant_id,
    quantity: salesReturnItems.quantity,
    amount_minor: salesReturnItems.refund_amount_minor,
    unit_amount_minor: salesReturnItems.unit_price_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
    return_condition: salesReturnItems.return_condition,
  }).from(salesReturnItems)
    .innerJoin(productVariants, eq(salesReturnItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(salesReturnItems.return_id, id))
    .all() as ReturnItemRow[];

  return { ...row, items, record_type: 'return', return_type: 'sales' };
}

export function getPurchaseReturnById(id: number): ReturnRow {
  const db = getDb();
  const row = db.select({
    id: purchaseReturns.id,
    return_number: purchaseReturns.return_number,
    source_id: purchaseReturns.purchase_id,
    source_number: purchases.purchase_number,
    party_name: suppliers.name,
    refund_amount_minor: purchaseReturns.refund_amount_minor,
    refund_method: purchaseReturns.refund_method,
    reason: purchaseReturns.reason,
    created_at: purchaseReturns.created_at,
  }).from(purchaseReturns)
    .innerJoin(purchases, eq(purchaseReturns.purchase_id, purchases.id))
    .innerJoin(suppliers, eq(purchaseReturns.supplier_id, suppliers.id))
    .where(eq(purchaseReturns.id, id))
    .get();

  if (!row) throw new Error('Purchase return not found');

  const items: ReturnItemRow[] = db.select({
    id: purchaseReturnItems.id,
    source_item_id: purchaseReturnItems.purchase_item_id,
    variant_id: purchaseReturnItems.variant_id,
    quantity: purchaseReturnItems.quantity,
    amount_minor: purchaseReturnItems.refund_amount_minor,
    unit_amount_minor: purchaseReturnItems.unit_cost_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
  }).from(purchaseReturnItems)
    .innerJoin(productVariants, eq(purchaseReturnItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(purchaseReturnItems.return_id, id))
    .all() as ReturnItemRow[];

  return { ...row, items, record_type: 'return', return_type: 'purchase' };
}

export function getSalesExchangeById(id: number): ExchangeRow {
  const db = getDb();
  const row = db.select({
    id: salesExchanges.id,
    exchange_number: salesExchanges.exchange_number,
    source_id: salesExchanges.sale_id,
    source_number: sales.invoice_number,
    party_name: sql<string | null>`null`,
    return_total_minor: salesExchanges.return_total_minor,
    replacement_total_minor: salesExchanges.replacement_total_minor,
    difference_minor: salesExchanges.difference_minor,
    settlement_method: salesExchanges.settlement_method,
    reason: salesExchanges.reason,
    created_at: salesExchanges.created_at,
  }).from(salesExchanges).innerJoin(sales, eq(salesExchanges.sale_id, sales.id)).where(eq(salesExchanges.id, id)).get();

  if (!row) throw new Error('Sales exchange not found');

  const returnItems: ReturnItemRow[] = db.select({
    id: salesExchangeReturnItems.id,
    source_item_id: salesExchangeReturnItems.sale_item_id,
    variant_id: salesExchangeReturnItems.variant_id,
    quantity: salesExchangeReturnItems.quantity,
    amount_minor: salesExchangeReturnItems.total_amount_minor,
    unit_amount_minor: salesExchangeReturnItems.unit_price_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
    return_condition: salesExchangeReturnItems.return_condition,
  }).from(salesExchangeReturnItems)
    .innerJoin(productVariants, eq(salesExchangeReturnItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(salesExchangeReturnItems.exchange_id, id))
    .all() as ReturnItemRow[];

  const replacementItems: ExchangeReplacementItemRow[] = db.select({
    id: salesExchangeReplacementItems.id,
    variant_id: salesExchangeReplacementItems.variant_id,
    quantity: salesExchangeReplacementItems.quantity,
    unit_price_minor: salesExchangeReplacementItems.unit_price_minor,
    total_amount_minor: salesExchangeReplacementItems.total_amount_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
  }).from(salesExchangeReplacementItems)
    .innerJoin(productVariants, eq(salesExchangeReplacementItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(salesExchangeReplacementItems.exchange_id, id))
    .all() as ExchangeReplacementItemRow[];

  return { ...row, return_items: returnItems, replacement_items: replacementItems, exchange_type: 'sales' };
}

export function getPurchaseExchangeById(id: number): ExchangeRow {
  const db = getDb();
  const row = db.select({
    id: purchaseExchanges.id,
    exchange_number: purchaseExchanges.exchange_number,
    source_id: purchaseExchanges.purchase_id,
    source_number: purchases.purchase_number,
    party_name: suppliers.name,
    return_total_minor: purchaseExchanges.return_total_minor,
    replacement_total_minor: purchaseExchanges.replacement_total_minor,
    difference_minor: purchaseExchanges.difference_minor,
    settlement_method: purchaseExchanges.settlement_method,
    reason: purchaseExchanges.reason,
    created_at: purchaseExchanges.created_at,
  }).from(purchaseExchanges)
    .innerJoin(purchases, eq(purchaseExchanges.purchase_id, purchases.id))
    .innerJoin(suppliers, eq(purchaseExchanges.supplier_id, suppliers.id))
    .where(eq(purchaseExchanges.id, id))
    .get();

  if (!row) throw new Error('Purchase exchange not found');

  const returnItems: ReturnItemRow[] = db.select({
    id: purchaseExchangeReturnItems.id,
    source_item_id: purchaseExchangeReturnItems.purchase_item_id,
    variant_id: purchaseExchangeReturnItems.variant_id,
    quantity: purchaseExchangeReturnItems.quantity,
    amount_minor: purchaseExchangeReturnItems.total_amount_minor,
    unit_amount_minor: purchaseExchangeReturnItems.unit_cost_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
  }).from(purchaseExchangeReturnItems)
    .innerJoin(productVariants, eq(purchaseExchangeReturnItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(purchaseExchangeReturnItems.exchange_id, id))
    .all() as ReturnItemRow[];

  const replacementItems: ExchangeReplacementItemRow[] = db.select({
    id: purchaseExchangeReplacementItems.id,
    variant_id: purchaseExchangeReplacementItems.variant_id,
    quantity: purchaseExchangeReplacementItems.quantity,
    unit_price_minor: purchaseExchangeReplacementItems.unit_cost_minor,
    total_amount_minor: purchaseExchangeReplacementItems.total_amount_minor,
    product_name: products.name,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
  }).from(purchaseExchangeReplacementItems)
    .innerJoin(productVariants, eq(purchaseExchangeReplacementItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(purchaseExchangeReplacementItems.exchange_id, id))
    .all() as ExchangeReplacementItemRow[];

  return { ...row, return_items: returnItems, replacement_items: replacementItems, exchange_type: 'purchase' };
}

// ──────────────────────────────────────────────────────────────────────────────
// History
// ──────────────────────────────────────────────────────────────────────────────

export function listReturnHistory(
  search = '',
  dateFrom?: string,
  dateTo?: string,
  returnType?: 'sales' | 'purchase',
): ReturnRow[] {
  const db = getDb();
  const term = `%${search.trim()}%`;

  // Sales returns
  const salesReturnRows: ReturnRow[] = returnType === 'purchase' ? [] :
    db.select({
      id: salesReturns.id,
      return_number: salesReturns.return_number,
      source_id: salesReturns.sale_id,
      source_number: sales.invoice_number,
      party_name: sql<string | null>`null`,
      refund_amount_minor: salesReturns.refund_amount_minor,
      refund_method: salesReturns.refund_method,
      reason: salesReturns.reason,
      created_at: salesReturns.created_at,
    }).from(salesReturns).innerJoin(sales, eq(salesReturns.sale_id, sales.id))
      .where(and(
        ...(search.trim() ? [or(like(salesReturns.return_number, term), like(sales.invoice_number, term), like(salesReturns.reason, term))!] : []),
        ...(dateFrom ? [gte(salesReturns.created_at, dateFrom)] : []),
        ...(dateTo ? [lte(salesReturns.created_at, `${dateTo}T23:59:59.999Z`)] : []),
      ))
      .all()
      .map((r) => ({ ...r, record_type: 'return' as const, return_type: 'sales' as const }));

  // Sales exchanges
  const salesExchangeRows: ReturnRow[] = returnType === 'purchase' ? [] :
    db.select({
      id: salesExchanges.id,
      return_number: salesExchanges.exchange_number,
      source_id: salesExchanges.sale_id,
      source_number: sales.invoice_number,
      party_name: sql<string | null>`null`,
      refund_amount_minor: salesExchanges.return_total_minor,
      refund_method: salesExchanges.settlement_method,
      reason: salesExchanges.reason,
      created_at: salesExchanges.created_at,
      return_total_minor: salesExchanges.return_total_minor,
      replacement_total_minor: salesExchanges.replacement_total_minor,
      difference_minor: salesExchanges.difference_minor,
      settlement_method: salesExchanges.settlement_method,
    }).from(salesExchanges).innerJoin(sales, eq(salesExchanges.sale_id, sales.id))
      .where(and(
        ...(search.trim() ? [or(like(salesExchanges.exchange_number, term), like(sales.invoice_number, term), like(salesExchanges.reason, term))!] : []),
        ...(dateFrom ? [gte(salesExchanges.created_at, dateFrom)] : []),
        ...(dateTo ? [lte(salesExchanges.created_at, `${dateTo}T23:59:59.999Z`)] : []),
      ))
      .all()
      .map((r) => ({ ...r, record_type: 'exchange' as const, return_type: 'sales' as const }));

  // Purchase returns
  const purchReturnRows: ReturnRow[] = returnType === 'sales' ? [] :
    db.select({
      id: purchaseReturns.id,
      return_number: purchaseReturns.return_number,
      source_id: purchaseReturns.purchase_id,
      source_number: purchases.purchase_number,
      party_name: suppliers.name,
      refund_amount_minor: purchaseReturns.refund_amount_minor,
      refund_method: purchaseReturns.refund_method,
      reason: purchaseReturns.reason,
      created_at: purchaseReturns.created_at,
    }).from(purchaseReturns)
      .innerJoin(purchases, eq(purchaseReturns.purchase_id, purchases.id))
      .innerJoin(suppliers, eq(purchaseReturns.supplier_id, suppliers.id))
      .where(and(
        ...(search.trim() ? [or(like(purchaseReturns.return_number, term), like(purchases.purchase_number, term), like(suppliers.name, term))!] : []),
        ...(dateFrom ? [gte(purchaseReturns.created_at, dateFrom)] : []),
        ...(dateTo ? [lte(purchaseReturns.created_at, `${dateTo}T23:59:59.999Z`)] : []),
      ))
      .all()
      .map((r) => ({ ...r, record_type: 'return' as const, return_type: 'purchase' as const }));

  // Purchase exchanges
  const purchExchangeRows: ReturnRow[] = returnType === 'sales' ? [] :
    db.select({
      id: purchaseExchanges.id,
      return_number: purchaseExchanges.exchange_number,
      source_id: purchaseExchanges.purchase_id,
      source_number: purchases.purchase_number,
      party_name: suppliers.name,
      refund_amount_minor: purchaseExchanges.return_total_minor,
      refund_method: purchaseExchanges.settlement_method,
      reason: purchaseExchanges.reason,
      created_at: purchaseExchanges.created_at,
      return_total_minor: purchaseExchanges.return_total_minor,
      replacement_total_minor: purchaseExchanges.replacement_total_minor,
      difference_minor: purchaseExchanges.difference_minor,
      settlement_method: purchaseExchanges.settlement_method,
    }).from(purchaseExchanges)
      .innerJoin(purchases, eq(purchaseExchanges.purchase_id, purchases.id))
      .innerJoin(suppliers, eq(purchaseExchanges.supplier_id, suppliers.id))
      .where(and(
        ...(search.trim() ? [or(like(purchaseExchanges.exchange_number, term), like(purchases.purchase_number, term), like(suppliers.name, term))!] : []),
        ...(dateFrom ? [gte(purchaseExchanges.created_at, dateFrom)] : []),
        ...(dateTo ? [lte(purchaseExchanges.created_at, `${dateTo}T23:59:59.999Z`)] : []),
      ))
      .all()
      .map((r) => ({ ...r, record_type: 'exchange' as const, return_type: 'purchase' as const }));

  return [
    ...salesReturnRows,
    ...salesExchangeRows,
    ...purchReturnRows,
    ...purchExchangeRows,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}