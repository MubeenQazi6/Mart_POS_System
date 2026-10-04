import { getDb } from '../database/client/index';
import {
  sales,
  saleItems,
  salePayments,
  productVariants,
  products,
} from '../database/schema/index';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { listStockSummary, listMovements } from './inventory';
import { listSuppliers } from './suppliers';
import { listCustomers } from './customers';
import { listPurchases } from './purchases';
import type {
  ReportFilterParams,
  SalesReportData,
  PurchasesReportData,
  InventoryReportData,
  StockMovementReportData,
  SuppliersPayableReportData,
  CustomersKhataReportData,
  ProfitSummaryData,
  ProfitSummaryItem,
} from '@shared/types/reports';
import type { SaleRow } from '@shared/types/sales';

export function getSalesReport(filters: ReportFilterParams = {}): SalesReportData {
  const db = getDb();
  let query = db.select().from(sales);
  const conditions = [];

  if (filters.date_from) {
    conditions.push(gte(sales.created_at, filters.date_from));
  }
  if (filters.date_to) {
    conditions.push(lte(sales.created_at, filters.date_to));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const saleRows = query.orderBy(desc(sales.created_at), desc(sales.id)).all();

  // Fetch payments for these sales
  const allPayments = db.select().from(salePayments).all();
  const paymentMap = new Map<number, typeof allPayments>();
  for (const p of allPayments) {
    const list = paymentMap.get(p.sale_id) || [];
    list.push(p);
    paymentMap.set(p.sale_id, list);
  }

  let subtotalMinor = 0;
  let discountMinor = 0;
  let taxMinor = 0;
  let netSalesMinor = 0;
  let cashCollected = 0;
  let cardCollected = 0;
  let creditGenerated = 0;

  const filteredSales: SaleRow[] = [];

  for (const s of saleRows) {
    const salePays = paymentMap.get(s.id) || [];

    if (filters.payment_method) {
      const hasMethod = salePays.some((p) => p.payment_method === filters.payment_method);
      if (!hasMethod) continue;
    }

    subtotalMinor += s.subtotal_minor;
    discountMinor += s.discount_minor;
    taxMinor += s.tax_minor;
    netSalesMinor += s.total_minor;

    for (const p of salePays) {
      if (p.payment_method === 'cash') cashCollected += p.amount_minor;
      else if (p.payment_method === 'card') cardCollected += p.amount_minor;
      else if (p.payment_method === 'credit') creditGenerated += p.amount_minor;
    }

    filteredSales.push({
      ...s,
      status: s.status as SaleRow['status'],
      payments: salePays.map((p) => ({
        id: p.id,
        sale_id: p.sale_id,
        payment_method: p.payment_method,
        amount_minor: p.amount_minor,
      })),
    });
  }

  return {
    summary: {
      total_sales_count: filteredSales.length,
      subtotal_minor: subtotalMinor,
      discount_minor: discountMinor,
      tax_minor: taxMinor,
      net_sales_minor: netSalesMinor,
      cash_collected_minor: cashCollected,
      card_collected_minor: cardCollected,
      credit_generated_minor: creditGenerated,
    },
    rows: filteredSales,
  };
}

export function getPurchasesReport(filters: ReportFilterParams = {}): PurchasesReportData {
  const purchaseRows = listPurchases({
    supplier_id: filters.supplier_id,
    payment_status: filters.status as 'paid' | 'partial' | 'unpaid' | undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    limit: filters.limit ?? 500,
  });

  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let totalPurchases = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  for (const p of purchaseRows) {
    subtotal += p.subtotal_minor;
    discount += p.discount_minor;
    tax += p.tax_minor;
    totalPurchases += p.total_minor;
    totalPaid += p.paid_amount_minor;
    totalBalance += p.balance_minor;
  }

  return {
    summary: {
      total_purchases_count: purchaseRows.length,
      subtotal_minor: subtotal,
      discount_minor: discount,
      tax_minor: tax,
      total_purchases_minor: totalPurchases,
      total_paid_minor: totalPaid,
      total_balance_minor: totalBalance,
    },
    rows: purchaseRows,
  };
}

export function getInventoryReport(filters: ReportFilterParams = {}): InventoryReportData {
  const stockSummary = listStockSummary({
    category_id: filters.category_id,
    low_stock_only: filters.low_stock_only,
    is_active: true,
  });

  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let valPurchase = 0;
  let valRetail = 0;

  for (const item of stockSummary) {
    if (item.stock_status === 'in_stock') inStockCount++;
    else if (item.stock_status === 'low_stock') lowStockCount++;
    else outOfStockCount++;

    if (item.current_stock > 0) {
      valPurchase += Math.round((item.current_stock * item.purchase_price_minor) / 1000);
      valRetail += Math.round((item.current_stock * (item.selling_price_minor ?? item.purchase_price_minor)) / 1000);
    }
  }

  return {
    summary: {
      total_items_count: stockSummary.length,
      total_in_stock_items: inStockCount,
      total_low_stock_items: lowStockCount,
      total_out_of_stock_items: outOfStockCount,
      total_valuation_purchase_minor: valPurchase,
      total_valuation_retail_minor: valRetail,
    },
    rows: stockSummary,
  };
}

export function getStockMovementReport(filters: ReportFilterParams = {}): StockMovementReportData {
  const movements = listMovements({
    date_from: filters.date_from,
    date_to: filters.date_to,
    movement_type: filters.status as 'IN' | 'OUT' | undefined,
    reference_type: filters.payment_method as 'purchase' | 'sale' | 'adjustment' | 'return' | undefined,
    limit: filters.limit ?? 500,
  });

  let inCount = 0;
  let outCount = 0;
  let inQty = 0;
  let outQty = 0;

  for (const m of movements) {
    if (m.movement_type === 'IN') {
      inCount++;
      inQty += m.quantity;
    } else {
      outCount++;
      outQty += m.quantity;
    }
  }

  return {
    summary: {
      total_movements_count: movements.length,
      total_in_movements: inCount,
      total_out_movements: outCount,
      total_in_quantity: inQty,
      total_out_quantity: outQty,
    },
    rows: movements,
  };
}

export function getSuppliersPayableReport(): SuppliersPayableReportData {
  const supplierRows = listSuppliers({ is_active: true });
  let totalPayables = 0;

  for (const s of supplierRows) {
    if (s.current_balance_minor > 0) {
      totalPayables += s.current_balance_minor;
    }
  }

  return {
    summary: {
      total_suppliers_count: supplierRows.length,
      total_payable_balance_minor: totalPayables,
    },
    rows: supplierRows,
  };
}

export function getCustomersKhataReport(filters: ReportFilterParams = {}): CustomersKhataReportData {
  const customerRows = listCustomers({
    has_balance_only: filters.low_stock_only, // re-used as has_balance_only filter
    is_active: true,
  });

  let totalReceivables = 0;
  let totalLimit = 0;

  for (const c of customerRows) {
    if (c.current_balance_minor > 0) {
      totalReceivables += c.current_balance_minor;
    }
    totalLimit += c.credit_limit_minor;
  }

  return {
    summary: {
      total_customers_count: customerRows.length,
      total_receivable_balance_minor: totalReceivables,
      total_credit_limit_minor: totalLimit,
    },
    rows: customerRows,
  };
}

export function getProfitSummaryReport(filters: ReportFilterParams = {}): ProfitSummaryData {
  const db = getDb();
  let query = db
    .select({
      variant_id: saleItems.variant_id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      purchase_price_minor: productVariants.purchase_price_minor,
      quantity: saleItems.quantity,
      line_total_minor: saleItems.line_total_minor,
      created_at: sales.created_at,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.sale_id, sales.id))
    .innerJoin(productVariants, eq(saleItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id));

  const conditions = [];
  if (filters.date_from) {
    conditions.push(gte(sales.created_at, filters.date_from));
  }
  if (filters.date_to) {
    conditions.push(lte(sales.created_at, filters.date_to));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const itemRows = query.all();

  // Aggregate by variant
  const aggMap = new Map<number, ProfitSummaryItem>();

  let totalRevenue = 0;
  let totalCogs = 0;

  for (const row of itemRows) {
    const existing = aggMap.get(row.variant_id);
    const cogs = Math.round((row.quantity * row.purchase_price_minor) / 1000);
    const revenue = row.line_total_minor;
    const grossProfit = revenue - cogs;

    totalRevenue += revenue;
    totalCogs += cogs;

    if (existing) {
      existing.units_sold += row.quantity;
      existing.selling_revenue_minor += revenue;
      existing.cost_of_goods_sold_minor += cogs;
      existing.gross_profit_minor += grossProfit;
      existing.margin_percentage =
        existing.selling_revenue_minor > 0
          ? Math.round((existing.gross_profit_minor / existing.selling_revenue_minor) * 10000) / 100
          : 0;
    } else {
      aggMap.set(row.variant_id, {
        variant_id: row.variant_id,
        product_name: row.product_name,
        variant_name: row.variant_name,
        sku: row.sku,
        units_sold: row.quantity,
        selling_revenue_minor: revenue,
        cost_of_goods_sold_minor: cogs,
        gross_profit_minor: grossProfit,
        margin_percentage: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
      });
    }
  }

  const totalGrossProfit = totalRevenue - totalCogs;
  const overallMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100 : 0;

  return {
    total_revenue_minor: totalRevenue,
    total_cogs_minor: totalCogs,
    total_gross_profit_minor: totalGrossProfit,
    overall_margin_percentage: overallMargin,
    items: Array.from(aggMap.values()),
  };
}
