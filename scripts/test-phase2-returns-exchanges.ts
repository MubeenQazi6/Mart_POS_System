import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSupplier, getSupplierById } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer, getCustomerById } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { openCashSession, getCashMovements } from '../src/repositories/cash';
import {
  createSalesReturn,
  createSalesExchange,
  createPurchaseExchange,
  searchSales,
  searchPurchases,
  getSalesExchangeById,
  getPurchaseExchangeById,
  listReturnHistory,
} from '../src/repositories/returns';
import { listStockSummary } from '../src/repositories/inventory';
import { listAuditLogs } from '../src/repositories/audit';
import path from 'node:path';
import fs from 'node:fs';

let dbPath = '';
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed += 1;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed += 1;
  }
}


function setup(): void {
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-phase2-exchanges-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
}

function cleanup(): void {
  rawDb?.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${dbPath}${suffix}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

function run(): void {
  console.log('=== PHASE 2: Returns & Exchanges Complete Test Suite ===\n');
  setup();

  try {
    // 1. Fixtures Setup
    const category = createCategory({ name: 'Phase2 Category' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    // Item A: 50.00 cost, 100.00 sell
    const productA = createProduct({
      name: 'Product A',
      category_id: category.id,
      variants: [{
        variant_name: 'Standard',
        unit_id: unit.id,
        purchase_price_minor: 5000,
        selling_price_minor: 10000,
        sku: 'SKU-ITEM-A',
        min_stock_alert: 0,
      }],
    });
    const varA = productA.variants?.[0];
    if (!varA) throw new Error('varA fixture missing');

    // Item B: 80.00 cost, 150.00 sell (higher price replacement)
    const productB = createProduct({
      name: 'Product B',
      category_id: category.id,
      variants: [{
        variant_name: 'Premium',
        unit_id: unit.id,
        purchase_price_minor: 8000,
        selling_price_minor: 15000,
        sku: 'SKU-ITEM-B',
        min_stock_alert: 0,
      }],
    });
    const varB = productB.variants?.[0];
    if (!varB) throw new Error('varB fixture missing');

    // Item C: 30.00 cost, 60.00 sell (lower price replacement)
    const productC = createProduct({
      name: 'Product C',
      category_id: category.id,
      variants: [{
        variant_name: 'Budget',
        unit_id: unit.id,
        purchase_price_minor: 3000,
        selling_price_minor: 6000,
        sku: 'SKU-ITEM-C',
        min_stock_alert: 0,
      }],
    });
    const varC = productC.variants?.[0];
    if (!varC) throw new Error('varC fixture missing');

    const supplier = createSupplier({ name: 'Main Wholesaler' });
    const customer = createCustomer({ name: 'John Doe', phone: '03001234567' });

    // Seed stock: 100 units of A, 100 units of B, 100 units of C via purchase
    const initialPurchase = createPurchase({
      supplier_id: supplier.id,
      items: [
        { variant_id: varA.id, quantity: 100000, unit_cost_minor: 5000 },
        { variant_id: varB.id, quantity: 100000, unit_cost_minor: 8000 },
        { variant_id: varC.id, quantity: 100000, unit_cost_minor: 3000 },
      ],
      payments: [{ payment_method: 'cash', amount_minor: 1600000 }],
    });
    assert(Boolean(initialPurchase.id), 'Initial purchase creates inventory stock');

    // Open cash session
    const cashSession = openCashSession({ opening_cash_minor: 500000 }); // 5000.00

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 1: Damaged/Defective sales return does NOT restore salable stock
    // ──────────────────────────────────────────────────────────────────────────
    const sale1 = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varA.id, quantity: 5000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 50000 }],
      discount_minor: 0,
    });
    const s1Item = searchSales(sale1.invoice_number)[0]?.items?.[0];
    if (!s1Item) throw new Error('Sale 1 item missing');

    const stockBeforeDamaged = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    assert(stockBeforeDamaged === 95000, 'Stock correctly decremented after sale (100 - 5 = 95)');

    const damagedReturn = createSalesReturn({
      sale_id: sale1.id,
      items: [{ source_item_id: s1Item.source_item_id, quantity: 2000, return_condition: 'damaged' }],
      reason: 'Arrived damaged',
      refund_method: 'cash',
    });
    assert(damagedReturn.return_number === 'RET-00001', 'Sequential return number RET-00001');
    const stockAfterDamaged = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    assert(stockAfterDamaged === 95000, 'Damaged return does NOT restore stock to salable inventory');

    // Return remaining 3000 as resalable
    const resalableReturn = createSalesReturn({
      sale_id: sale1.id,
      items: [{ source_item_id: s1Item.source_item_id, quantity: 3000, return_condition: 'resalable' }],
      reason: 'Wrong size',
      refund_method: 'cash',
    });
    assert(resalableReturn.return_number === 'RET-00002', 'Sequential return number RET-00002');
    const stockAfterResalable = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    assert(stockAfterResalable === 98000, 'Resalable return restores 3 units back to stock (95 + 3 = 98)');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 2: Sales Exchange — Customer pays difference (Upgrade item)
    // ──────────────────────────────────────────────────────────────────────────
    // Sell 2 units of Item A (value 200.00)
    const sale2 = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varA.id, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 20000 }],
      discount_minor: 0,
    });
    const s2Item = searchSales(sale2.invoice_number)[0]?.items?.[0];
    if (!s2Item) throw new Error('Sale 2 item missing');

    const stockABeforeEx1 = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    const stockBBeforeEx1 = listStockSummary({ is_active: true }).find(r => r.variant_id === varB.id)?.current_stock ?? 0;

    // Exchange 2 units of A (value 200.00) for 2 units of B (value 300.00)
    // Customer pays difference of 100.00 in cash
    const ex1 = createSalesExchange({
      sale_id: sale2.id,
      return_items: [{ source_item_id: s2Item.source_item_id, quantity: 2000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: varB.id, quantity: 2000 }],
      settlement_method: 'cash',
      reason: 'Upgraded to Premium',
    });

    assert(ex1.exchange_number === 'EXC-00001', 'Sequential sales exchange number EXC-00001');
    assert(ex1.return_total_minor === 20000, 'Exchange return value is 200.00');
    assert(ex1.replacement_total_minor === 30000, 'Exchange replacement value is 300.00');
    assert(ex1.difference_minor === 10000, 'Exchange difference is +100.00 (customer pays)');

    const stockAAfterEx1 = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    const stockBAfterEx1 = listStockSummary({ is_active: true }).find(r => r.variant_id === varB.id)?.current_stock ?? 0;
    assert(stockAAfterEx1 === stockABeforeEx1 + 2000, 'Item A returned: stock increased by 2 units');
    assert(stockBAfterEx1 === stockBBeforeEx1 - 2000, 'Item B replacement: stock decreased by 2 units');

    // Check cash movement
    const movements = getCashMovements(cashSession.id);
    const ex1CashIn = movements.find(m => m.reference_type === 'RETURN' && m.reference_id === ex1.id && m.movement_type === 'CASH_IN');
    assert(Boolean(ex1CashIn && ex1CashIn.amount_minor === 10000), 'Cash drawer received +100.00 CASH_IN for customer exchange upgrade');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 3: Sales Exchange — Store refunds customer (Downgrade item)
    // ──────────────────────────────────────────────────────────────────────────
    // Sell 2 units of Item B (value 300.00)
    const sale3 = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varB.id, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 30000 }],
      discount_minor: 0,
    });
    const s3Item = searchSales(sale3.invoice_number)[0]?.items?.[0];
    if (!s3Item) throw new Error('Sale 3 item missing');

    // Exchange 2 units of B (300.00) for 2 units of C (120.00)
    // Store refunds 180.00 in cash
    const ex2 = createSalesExchange({
      sale_id: sale3.id,
      return_items: [{ source_item_id: s3Item.source_item_id, quantity: 2000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: varC.id, quantity: 2000 }],
      settlement_method: 'cash',
      reason: 'Downgraded to Budget',
    });

    assert(ex2.exchange_number === 'EXC-00002', 'Sequential sales exchange number EXC-00002');
    assert(ex2.return_total_minor === 30000, 'Exchange 2 return value is 300.00');
    assert(ex2.replacement_total_minor === 12000, 'Exchange 2 replacement value is 120.00');
    assert(ex2.difference_minor === -18000, 'Exchange 2 difference is -180.00 (store refunds)');

    const movementsAfterEx2 = getCashMovements(cashSession.id);
    const ex2Refund = movementsAfterEx2.find(m => m.reference_type === 'RETURN' && m.reference_id === ex2.id && m.movement_type === 'REFUND');
    assert(Boolean(ex2Refund && ex2Refund.amount_minor === 18000), 'Cash drawer recorded REFUND of 180.00 for exchange downgrade');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 4: Even Exchange (Same value)
    // ──────────────────────────────────────────────────────────────────────────
    // Sell 3 units of Item A (value 300.00)
    const sale4 = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varA.id, quantity: 3000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 30000 }],
      discount_minor: 0,
    });
    const s4Item = searchSales(sale4.invoice_number)[0]?.items?.[0];
    if (!s4Item) throw new Error('Sale 4 item missing');

    // Exchange 3 units of A (300.00) for 2 units of B (300.00) => Difference 0
    const ex3 = createSalesExchange({
      sale_id: sale4.id,
      return_items: [{ source_item_id: s4Item.source_item_id, quantity: 3000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: varB.id, quantity: 2000 }],
      settlement_method: 'even',
      reason: 'Even value swap',
    });

    assert(ex3.exchange_number === 'EXC-00003', 'Sequential sales exchange number EXC-00003');
    assert(ex3.difference_minor === 0, 'Even exchange has 0 difference');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 5: Credit/Khata Exchange Adjustment
    // ──────────────────────────────────────────────────────────────────────────
    const creditSale = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varA.id, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'credit', amount_minor: 20000 }],
      discount_minor: 0,
    });
    const cItem = searchSales(creditSale.invoice_number)[0]?.items?.[0];
    if (!cItem) throw new Error('Credit item missing');

    const balBeforeCreditEx = getCustomerById(customer.id).current_balance_minor;
    // Customer exchanges 2 units of A (200.00) for 2 units of B (300.00) on Credit
    // Difference is +100.00 -> Khata balance increases by 100.00
    const creditEx = createSalesExchange({
      sale_id: creditSale.id,
      return_items: [{ source_item_id: cItem.source_item_id, quantity: 2000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: varB.id, quantity: 2000 }],
      settlement_method: 'credit',
      reason: 'Credit upgrade',
    });

    assert(creditEx.difference_minor === 10000, 'Credit upgrade difference +100.00');
    assert(getCustomerById(customer.id).current_balance_minor === balBeforeCreditEx + 10000, 'Customer Khata balance adjusted by +100.00');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 6: Rejection of over-exchange / over-return
    // ──────────────────────────────────────────────────────────────────────────
    let overExRejected = false;
    try {
      createSalesExchange({
        sale_id: sale4.id,
        return_items: [{ source_item_id: s4Item.source_item_id, quantity: 1000, return_condition: 'resalable' }],
        replacement_items: [{ variant_id: varB.id, quantity: 1000 }],
        settlement_method: 'even',
        reason: 'Over exchange attempt',
      });
    } catch {
      overExRejected = true;
    }
    assert(overExRejected, 'Exchange cannot return more items than remaining returnable qty');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 7: Supplier Purchase Exchange
    // ──────────────────────────────────────────────────────────────────────────
    const purch1 = createPurchase({
      supplier_id: supplier.id,
      items: [{ variant_id: varA.id, quantity: 10000, unit_cost_minor: 5000 }],
      payments: [], // Unpaid -> increases supplier balance by 500.00
    });
    const p1Item = searchPurchases(purch1.purchase_number)[0]?.items?.[0];
    if (!p1Item) throw new Error('Purchase item missing');

    const supBalBefore = getSupplierById(supplier.id).current_balance_minor;
    const stockABeforePEx = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    const stockBBeforePEx = listStockSummary({ is_active: true }).find(r => r.variant_id === varB.id)?.current_stock ?? 0;

    // Exchange 5 units of A (5 * 50 = 250.00) for 3 units of B (3 * 80 = 240.00)
    // Return total = 250.00, Replacement total = 240.00, Difference = -10.00
    const pEx1 = createPurchaseExchange({
      purchase_id: purch1.id,
      return_items: [{ source_item_id: p1Item.source_item_id, quantity: 5000 }],
      replacement_items: [{ variant_id: varB.id, quantity: 3000 }],
      settlement_method: 'balance_adjustment',
      reason: 'Exchange slow mover for fast mover',
    });

    assert(pEx1.exchange_number === 'PEXC-00001', 'Sequential purchase exchange number PEXC-00001');
    assert(pEx1.return_total_minor === 25000, 'Purchase exchange return total is 250.00');
    assert(pEx1.replacement_total_minor === 24000, 'Purchase exchange replacement total is 240.00');
    assert(pEx1.difference_minor === -1000, 'Purchase exchange difference is -10.00');

    const stockAAfterPEx = listStockSummary({ is_active: true }).find(r => r.variant_id === varA.id)?.current_stock ?? 0;
    const stockBAfterPEx = listStockSummary({ is_active: true }).find(r => r.variant_id === varB.id)?.current_stock ?? 0;
    assert(stockAAfterPEx === stockABeforePEx - 5000, 'Supplier exchange returned 5 units of Item A (stock decreased)');
    assert(stockBAfterPEx === stockBBeforePEx + 3000, 'Supplier exchange received 3 units of Item B (stock increased)');
    assert(getSupplierById(supplier.id).current_balance_minor === supBalBefore + 1000, 'Supplier balance adjusted accurately');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 8: Get by ID & History List
    // ──────────────────────────────────────────────────────────────────────────
    const fetchedSalesEx = getSalesExchangeById(ex1.id);
    assert(fetchedSalesEx.exchange_number === 'EXC-00001', 'getSalesExchangeById retrieves correct exchange number');
    assert(fetchedSalesEx.return_items.length === 1 && fetchedSalesEx.replacement_items.length === 1, 'getSalesExchangeById populates both return and replacement items');

    const fetchedPurchEx = getPurchaseExchangeById(pEx1.id);
    assert(fetchedPurchEx.exchange_number === 'PEXC-00001', 'getPurchaseExchangeById retrieves correct exchange number');

    const allHistory = listReturnHistory();
    assert(allHistory.length >= 6, 'listReturnHistory includes all returns and exchanges combined');
    const hasSalesExchangeInHistory = allHistory.some(h => h.record_type === 'exchange' && h.return_number.startsWith('EXC-'));
    const hasPurchExchangeInHistory = allHistory.some(h => h.record_type === 'exchange' && h.return_number.startsWith('PEXC-'));
    assert(hasSalesExchangeInHistory, 'History includes sales exchanges');
    assert(hasPurchExchangeInHistory, 'History includes purchase exchanges');

    // ──────────────────────────────────────────────────────────────────────────
    // Scenario 9: Audit logs verification
    // ──────────────────────────────────────────────────────────────────────────
    const auditLogs = listAuditLogs({ limit: 50 });
    assert(auditLogs.some(a => a.event_type === 'SALES_EXCHANGE_CREATE'), 'Sales exchange creation is audited');
    assert(auditLogs.some(a => a.event_type === 'PURCHASE_EXCHANGE_CREATE'), 'Purchase exchange creation is audited');

  } finally {
    cleanup();
  }

  console.log(`\n========================================`);
  console.log(`Phase 2 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exitCode = 1;
}

run();
