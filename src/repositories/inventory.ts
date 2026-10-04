import { getDb } from '../database/client/index';
import { dateToEndOfDay } from '@shared/utils/date-range';
import { withTransaction } from './base';
import {
  stockMovements,
  productVariants,
  products,
  categories,
  units,
  productBarcodes,
} from '../database/schema/index';
import { eq, and, or, like, desc, gte, lte, sql } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  StockSummaryFilters,
  StockSummaryRow,
  StockMovementRow,
  CreateMovementInput,
  MovementListParams,
  InventoryKpis,
  StockStatus,
  MovementDirection,
} from '@shared/types/inventory';

/** Stock balance subquery: IN sum − OUT sum per variant (quantity scaled ×1000). */
const currentStockExpr = sql<number>`coalesce((
  select
    sum(case when ${stockMovements.movement_type} = 'IN' then ${stockMovements.quantity} else 0 end)
    - sum(case when ${stockMovements.movement_type} = 'OUT' then ${stockMovements.quantity} else 0 end)
  from ${stockMovements}
  where ${stockMovements.variant_id} = ${productVariants.id}
), 0)`.mapWith(Number);

/** Primary (or first active) barcode for a variant. */
const primaryBarcodeExpr = sql<string | null>`(
  select ${productBarcodes.barcode}
  from ${productBarcodes}
  where ${productBarcodes.variant_id} = ${productVariants.id}
    and ${productBarcodes.is_active} = 1
  order by ${productBarcodes.is_primary} desc, ${productBarcodes.id} asc
  limit 1
)`.mapWith((v) => (v === null ? null : String(v)));

export function computeStockStatus(currentStock: number, minStockAlert: number): StockStatus {
  if (currentStock <= 0) {
    return 'out_of_stock';
  }
  if (minStockAlert > 0 && currentStock <= minStockAlert) {
    return 'low_stock';
  }
  return 'in_stock';
}

function mapAdjustmentToMovement(
  adjustmentType?: string,
  direction?: MovementDirection,
  source?: string,
): { movement_type: 'IN' | 'OUT'; reference_type: string } {
  const type = (source || adjustmentType || 'manual_adjustment').toLowerCase();

  switch (type) {
    case 'opening_stock':
      return { movement_type: 'IN', reference_type: 'OPENING_STOCK' };
    case 'return':
      return { movement_type: 'OUT', reference_type: 'RETURN' };
    case 'exchange_out':
      return { movement_type: 'OUT', reference_type: 'EXCHANGE_OUT' };
    case 'exchange_in':
      return { movement_type: 'IN', reference_type: 'EXCHANGE_IN' };
    case 'damage':
      return { movement_type: 'OUT', reference_type: 'DAMAGE' };
    case 'expiry':
      return { movement_type: 'OUT', reference_type: 'EXPIRY' };
    case 'manual_adjustment':
    case 'manual':
      if (direction === 'in') {
        return { movement_type: 'IN', reference_type: 'MANUAL_ADJUSTMENT' };
      }
      if (direction === 'out') {
        return { movement_type: 'OUT', reference_type: 'MANUAL_ADJUSTMENT' };
      }
      throw new Error('Manual adjustment requires direction (in or out)');
    default:
      if (direction === 'in') {
        return { movement_type: 'IN', reference_type: type.toUpperCase() };
      }
      if (direction === 'out') {
        return { movement_type: 'OUT', reference_type: type.toUpperCase() };
      }
      throw new Error(`Unknown adjustment type: ${String(adjustmentType || source)}`);
  }
}

function validateCreateMovementInput(input: CreateMovementInput): void {
  if (!Number.isInteger(input.variant_id) || input.variant_id <= 0) {
    throw new Error('Valid variant ID is required');
  }

  const rawQty = input.quantity ?? input.quantity_minor;
  if (typeof rawQty !== 'number' || !Number.isInteger(rawQty) || rawQty <= 0) {
    throw new Error('Quantity must be a positive integer (scaled by 1000)');
  }

  const notes = (input.notes ?? input.note ?? '').trim();
  const type = (input.source || input.adjustment_type || 'manual_adjustment').toLowerCase();

  if (type === 'manual_adjustment' || type === 'manual') {
    if (input.direction !== 'in' && input.direction !== 'out') {
      throw new Error('Manual adjustment requires direction (in or out)');
    }
    if (!notes) {
      throw new Error('A reason or note is required for manual stock adjustments');
    }
  }

  if (type === 'damage' || type === 'expiry') {
    if (!notes) {
      throw new Error(`A reason or note is required for ${type} adjustments`);
    }
  }
}

function buildStockSummaryRow(row: {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  barcode: string | null;
  category_id: number;
  category_name: string | null;
  unit_id: number;
  unit_name: string | null;
  unit_abbreviation: string | null;
  unit_decimals: number | null;
  purchase_price_minor: number;
  selling_price_minor?: number;
  min_stock_alert: number;
  current_stock: number;
  is_active: boolean;
}): StockSummaryRow {
  return {
    ...row,
    stock_status: computeStockStatus(row.current_stock, row.min_stock_alert),
  };
}

function fetchStockSummaryBaseQuery() {
  const db = getDb();
  return db
    .select({
      variant_id: productVariants.id,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      barcode: primaryBarcodeExpr,
      category_id: products.category_id,
      category_name: categories.name,
      unit_id: productVariants.unit_id,
      unit_name: units.name,
      unit_abbreviation: units.abbreviation,
      unit_decimals: units.decimals,
      purchase_price_minor: productVariants.purchase_price_minor,
      selling_price_minor: productVariants.selling_price_minor,
      min_stock_alert: productVariants.min_stock_alert,
      current_stock: currentStockExpr,
      is_active: productVariants.is_active,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .leftJoin(categories, eq(products.category_id, categories.id))
    .leftJoin(units, eq(productVariants.unit_id, units.id));
}

function applyStockSummaryFilters(
  filters: StockSummaryFilters,
): ReturnType<typeof and> | undefined {
  const conditions = [];

  const isActive = filters.is_active !== undefined ? filters.is_active : true;
  conditions.push(eq(productVariants.is_active, isActive));
  conditions.push(eq(products.is_active, isActive));

  if (filters.category_id !== undefined) {
    conditions.push(eq(products.category_id, filters.category_id));
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, term),
        like(productVariants.variant_name, term),
        like(productVariants.sku, term),
        sql`exists (
          select 1 from ${productBarcodes}
          where ${productBarcodes.variant_id} = ${productVariants.id}
            and ${productBarcodes.barcode} like ${term}
        )`,
      ),
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
}

export function getVariantStock(variantId: number): StockSummaryRow {
  if (!Number.isInteger(variantId) || variantId <= 0) {
    throw new Error('Valid variant ID is required');
  }

  const row = fetchStockSummaryBaseQuery()
    .where(eq(productVariants.id, variantId))
    .get();

  if (!row) {
    throw new Error(`Variant with ID ${String(variantId)} not found`);
  }

  return buildStockSummaryRow(row);
}

export function listStockSummary(filters: StockSummaryFilters = {}): StockSummaryRow[] {
  let query = fetchStockSummaryBaseQuery();

  const whereClause = applyStockSummaryFilters(filters);
  if (whereClause) {
    query = query.where(whereClause) as typeof query;
  }

  const rows = query.orderBy(products.name, productVariants.variant_name).all();

  const summaries = rows.map((row) => buildStockSummaryRow(row));

  let result = summaries;
  if (filters.low_stock_only && filters.out_of_stock_only) {
    result = result.filter((row) => row.stock_status === 'low_stock' || row.stock_status === 'out_of_stock');
  } else if (filters.low_stock_only) {
    result = result.filter((row) => row.stock_status === 'low_stock');
  } else if (filters.out_of_stock_only) {
    result = result.filter((row) => row.stock_status === 'out_of_stock');
  }

  return result;
}

export function listMovements(params: MovementListParams = {}): StockMovementRow[] {
  const db = getDb();
  const limit = typeof params.limit === 'number' && params.limit > 0 ? params.limit : 100;

  let query = db
    .select({
      id: stockMovements.id,
      variant_id: stockMovements.variant_id,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      movement_type: stockMovements.movement_type,
      reference_type: stockMovements.reference_type,
      reference_id: stockMovements.reference_id,
      quantity: stockMovements.quantity,
      unit_cost_minor: stockMovements.unit_cost_minor,
      notes: stockMovements.notes,
      created_at: stockMovements.created_at,
    })
    .from(stockMovements)
    .leftJoin(productVariants, eq(stockMovements.variant_id, productVariants.id))
    .leftJoin(products, eq(productVariants.product_id, products.id));

  const conditions = [];

  if (params.variant_id !== undefined) {
    if (!Number.isInteger(params.variant_id) || params.variant_id <= 0) {
      throw new Error('Valid variant ID is required when filtering movements');
    }
    conditions.push(eq(stockMovements.variant_id, params.variant_id));
  }

  if (params.date_from) {
    conditions.push(gte(stockMovements.created_at, params.date_from));
  }

  if (params.date_to) {
    conditions.push(lte(stockMovements.created_at, dateToEndOfDay(params.date_to) as string));
  }

  if (params.movement_type) {
    conditions.push(eq(stockMovements.movement_type, params.movement_type));
  }

  if (params.reference_type) {
    conditions.push(eq(stockMovements.reference_type, params.reference_type.toUpperCase()));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = query
    .orderBy(desc(stockMovements.created_at), desc(stockMovements.id))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    ...row,
    direction: row.movement_type === 'IN' ? 'in' : 'out',
  }));
}

export function getMovementById(id: number): StockMovementRow {
  const db = getDb();
  const row = db
    .select({
      id: stockMovements.id,
      variant_id: stockMovements.variant_id,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      movement_type: stockMovements.movement_type,
      reference_type: stockMovements.reference_type,
      reference_id: stockMovements.reference_id,
      quantity: stockMovements.quantity,
      unit_cost_minor: stockMovements.unit_cost_minor,
      notes: stockMovements.notes,
      created_at: stockMovements.created_at,
    })
    .from(stockMovements)
    .leftJoin(productVariants, eq(stockMovements.variant_id, productVariants.id))
    .leftJoin(products, eq(productVariants.product_id, products.id))
    .where(eq(stockMovements.id, id))
    .get();

  if (!row) {
    throw new Error(`Failed to retrieve created movement with ID ${String(id)}`);
  }

  return {
    ...row,
    direction: row.movement_type === 'IN' ? 'in' : 'out',
  };
}

export function createMovement(input: CreateMovementInput): StockMovementRow {
  validateCreateMovementInput(input);

  const { movement_type, reference_type } = mapAdjustmentToMovement(
    input.adjustment_type,
    input.direction,
    input.source,
  );

  const rawQty = input.quantity ?? input.quantity_minor;
  const quantity = Math.abs(rawQty ?? 0);
  const notes = (input.notes ?? input.note ?? '').trim();
  const adjType = input.source || input.adjustment_type || 'adjustment';

  let beforeStock = 0;
  let afterStock = 0;

  const movementId = withTransaction((tx) => {
    const variant = tx
      .select({
        id: productVariants.id,
        purchase_price_minor: productVariants.purchase_price_minor,
        is_active: productVariants.is_active,
        available_stock: sql<number>`coalesce((select sum(case when ${stockMovements.movement_type} = 'IN' then ${stockMovements.quantity} else -${stockMovements.quantity} end) from ${stockMovements} where ${stockMovements.variant_id} = ${input.variant_id}), 0)`.mapWith(Number),
      })
      .from(productVariants)
      .where(eq(productVariants.id, input.variant_id))
      .get();

    if (!variant) {
      throw new Error(`Variant with ID ${String(input.variant_id)} not found`);
    }
    if (!variant.is_active) {
      throw new Error(`Variant #${String(input.variant_id)} is inactive and cannot be adjusted`);
    }

    beforeStock = variant.available_stock;

    if (movement_type === 'OUT') {
      afterStock = beforeStock - quantity;
    } else {
      afterStock = beforeStock + quantity;
    }

    const inserted = tx
      .insert(stockMovements)
      .values({
        variant_id: input.variant_id,
        movement_type,
        quantity,
        unit_cost_minor: variant.purchase_price_minor,
        reference_type,
        reference_id: null,
        notes: notes || null,
      })
      .returning({ id: stockMovements.id })
      .get();

    return inserted.id;
  });

  const movement = getMovementById(movementId);

  logAuditEvent({
    event_type: 'STOCK_ADJUSTMENT',
    status: 'SUCCESS',
    details: `${adjType} adjustment: ${String(quantity / 1000)} units (${movement.movement_type}) for variant #${String(input.variant_id)} (Stock: ${String(beforeStock / 1000)} -> ${String(afterStock / 1000)}, Reason: ${notes})`,
  });

  return movement;
}

export function getInventoryKpis(): InventoryKpis {
  const summaries = listStockSummary({ is_active: true });

  let lowStockCount = 0;
  let inventoryValueMinor = 0;
  let totalCostMinor = 0;
  let potentialRevenueMinor = 0;

  for (const row of summaries) {
    if (row.stock_status === 'low_stock') {
      lowStockCount++;
    }
    const cost = Math.round((row.current_stock * row.purchase_price_minor) / 1000);
    const sellingPrice = row.selling_price_minor ?? row.purchase_price_minor;
    const revenue = Math.round((row.current_stock * sellingPrice) / 1000);

    totalCostMinor += cost;
    potentialRevenueMinor += revenue;
    inventoryValueMinor += cost;
  }

  const potentialProfitMinor = Math.max(0, potentialRevenueMinor - totalCostMinor);

  return {
    low_stock_count: lowStockCount,
    inventory_value_minor: inventoryValueMinor,
    total_cost_minor: totalCostMinor,
    potential_profit_minor: potentialProfitMinor,
  };
}
