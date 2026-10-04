import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct, addBarcode } from '../src/repositories/products';
import { createSupplier, getSupplierById, recordSupplierPayment, getSupplierLedger } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { openCashSession, getCashMovements } from '../src/repositories/cash';
import {
  createSalesReturn,
  createPurchaseReturn,
  createSalesExchange,
  searchSales,
  searchPurchases,
} from '../src/repositories/returns';
import { listStockSummary, createMovement, listMovements } from '../src/repositories/inventory';
import { listAuditLogs } from '../src/repositories/audit';
import { setSetting } from '../src/repositories/settings';
import { getSalesReport, getPurchasesReport, getInventoryReport } from '../src/repositories/reports';
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

function countRows(table: string): number {
  if (!rawDb) throw new Error('Test database is not initialized');
  const row = rawDb.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function setup(): void {
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-phase3-audit-${Date.now()}.db`);
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
  console.log('=== PHASE 3: Inventory, Purchases, Suppliers & Stock Integrity Audit ===\n');
  setup();

  try {
    // 0. Base Fixtures Setup
    const category = createCategory({ name: 'General Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const product1 = createProduct({
      name: 'Milk 1 Liter Pack',
      category_id: category.id,
      variants: [{
        variant_name: '1 Liter',
        unit_id: unit.id,
        purchase_price_minor: 15000, // Rs. 150.00
        selling_price_minor: 20000,  // Rs. 200.00
        sku: 'MILK-1L',
        min_stock_alert: 5000,
        barcodes: [{ barcode: '8964000111222', barcode_type: 'EAN13', is_primary: true }],
      }],
    });
    const varMilk = product1.variants?.[0];
    if (!varMilk) throw new Error('Milk variant missing');

    const product2 = createProduct({
      name: 'Bread Loaf Large',
      category_id: category.id,
      variants: [{
        variant_name: 'Large',
        unit_id: unit.id,
        purchase_price_minor: 8000,  // Rs. 80.00
        selling_price_minor: 12000,  // Rs. 120.00
        sku: 'BREAD-LRG',
        min_stock_alert: 2000,
        barcodes: [{ barcode: '8964000333444', barcode_type: 'EAN13', is_primary: true }],
      }],
    });
    const varBread = product2.variants?.[0];
    if (!varBread) throw new Error('Bread variant missing');

    const supplierA = createSupplier({
      name: 'Dairy & Bakery Distro',
      opening_balance_minor: 0,
      phone: '03009998877',
    });

    const customerA = createCustomer({
      name: 'Ahmed Khan',
      phone: '03112233445',
      credit_limit_minor: 500000, // Rs. 5000.00
    });

    const cashSession = openCashSession({ opening_cash_minor: 1000000 }); // Rs. 10,000.00 opening drawer

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Purchase increases inventory & 2. Purchase updates supplier ledger
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. Purchase & Inventory Inflow ---');
    const initialStockMilk = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(initialStockMilk === 0, 'Initial Milk stock is 0');

    // Credit Purchase of 50 units Milk (50 * 150 = Rs. 7,500)
    const purch1 = createPurchase({
      supplier_id: supplierA.id,
      items: [{ variant_id: varMilk.id, quantity: 50000, unit_cost_minor: 15000 }],
      payments: [], // 100% on credit
    });

    const stockAfterPurch1 = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(stockAfterPurch1 === 50000, '1. Purchase increases inventory accurately (0 -> 50 units)');

    const supAfterPurch1 = getSupplierById(supplierA.id);
    assert(supAfterPurch1.current_balance_minor === 750000, '2. Credit purchase updates supplier ledger balance (+Rs. 7,500.00)');

    const ledgerAfterPurch1 = getSupplierLedger(supplierA.id);
    assert(ledgerAfterPurch1.some(t => t.transaction_type === 'PURCHASE_BILL' && t.amount_minor === 750000), '2a. Supplier ledger entry created for purchase bill');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Cash purchase updates cash ledger & 4. Credit purchase updates supplier payable
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Cash Purchase & Drawer Impact ---');
    // Cash Purchase of 25 units Bread (25 * 80 = Rs. 2,000)
    const purch2 = createPurchase({
      supplier_id: supplierA.id,
      items: [{ variant_id: varBread.id, quantity: 25000, unit_cost_minor: 8000 }],
      payments: [{ payment_method: 'cash', amount_minor: 200000 }],
    });

    const stockBreadAfterPurch2 = listStockSummary().find(r => r.variant_id === varBread.id)?.current_stock ?? 0;
    assert(stockBreadAfterPurch2 === 25000, '3a. Cash purchase adds 25 units of Bread to inventory');

    const supAfterPurch2 = getSupplierById(supplierA.id);
    assert(supAfterPurch2.current_balance_minor === 750000, '3b. Fully paid cash purchase does not increase supplier payable balance');

    const drawerMovements = getCashMovements(cashSession.id);
    const cashPurchMovement = drawerMovements.find(m => m.reference_type === 'PURCHASE' && m.reference_id === purch2.id);
    assert(Boolean(cashPurchMovement && cashPurchMovement.amount_minor === 200000), '3. Cash purchase records purchase deduction from cash drawer');

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Sale reduces inventory
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. POS Sale & Stock Outflow ---');
    // Sell 10 units of Milk for Cash (10 * 200 = Rs. 2,000)
    const sale1 = createSale({
      customer_id: undefined,
      items: [{ variant_id: varMilk.id, quantity: 10000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 200000 }],
      discount_minor: 0,
    });
    assert(Boolean(sale1.id), 'Sale completed successfully');

    const stockMilkAfterSale1 = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(stockMilkAfterSale1 === 40000, '5. Sale reduces inventory accurately (50 -> 40 units)');

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Zero-stock sale rejected & 7. Negative stock follows setting
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Out-of-Stock & Negative Stock Rules ---');
    // Create an item with 0 stock
    const productZero = createProduct({
      name: 'Zero Stock Biscuit',
      category_id: category.id,
      variants: [{
        variant_name: 'Regular',
        unit_id: unit.id,
        purchase_price_minor: 2000,
        selling_price_minor: 3000,
        sku: 'ZERO-BISCUIT',
      }],
    });
    const varZero = productZero.variants?.[0];
    if (!varZero) throw new Error('Zero stock variant missing');

    // Disable negative stock
    setSetting('pos.allow_negative_stock', false);

    let zeroSaleBlocked = false;
    try {
      createSale({
        customer_id: undefined,
        items: [{ variant_id: varZero.id, quantity: 1000, discount_minor: 0 }],
        payments: [{ payment_method: 'cash', amount_minor: 3000 }],
        discount_minor: 0,
      });
    } catch {
      zeroSaleBlocked = true;
    }
    assert(zeroSaleBlocked, '6. Zero-stock sale is strictly rejected when allow_negative_stock=false');

    // Enable negative stock
    setSetting('pos.allow_negative_stock', true);
    const negSale = createSale({
      customer_id: undefined,
      items: [{ variant_id: varZero.id, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 6000 }],
      discount_minor: 0,
    });
    assert(Boolean(negSale.id), '7. Negative stock sale is permitted when allow_negative_stock=true');

    const stockZeroAfter = listStockSummary().find(r => r.variant_id === varZero.id)?.current_stock ?? 0;
    assert(stockZeroAfter === -2000, '7a. Stock accurately derived as negative (-2 units)');

    // Reset setting back to false for strict audit tests
    setSetting('pos.allow_negative_stock', false);

    // ──────────────────────────────────────────────────────────────────────────
    // 8. Customer return restores stock
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Customer Return & Exchange ---');
    const s1Source = searchSales(sale1.invoice_number)[0];
    const s1Item = s1Source?.items?.[0];
    if (!s1Item) throw new Error('s1Item missing');

    const milkStockBeforeRet = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    const cRet = createSalesReturn({
      sale_id: sale1.id,
      items: [{ source_item_id: s1Item.source_item_id, quantity: 3000, return_condition: 'resalable' }],
      reason: 'Customer bought too much',
      refund_method: 'cash',
    });
    assert(Boolean(cRet.id), 'Customer return processed');
    const milkStockAfterRet = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(milkStockAfterRet === milkStockBeforeRet + 3000, '8. Resalable customer return restores stock (+3 units)');

    // ──────────────────────────────────────────────────────────────────────────
    // 9. Supplier return reduces stock
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Supplier Return ---');
    const p1Source = searchPurchases(purch1.purchase_number)[0];
    const p1Item = p1Source?.items?.[0];
    if (!p1Item) throw new Error('p1Item missing');

    const supBalBeforeRet = getSupplierById(supplierA.id).current_balance_minor;
    const milkStockBeforeSupRet = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;

    const pRet = createPurchaseReturn({
      purchase_id: purch1.id,
      items: [{ source_item_id: p1Item.source_item_id, quantity: 5000 }],
      reason: 'Near expiry batch returned to supplier',
      refund_method: 'credit',
    });
    assert(Boolean(pRet.id), 'Supplier purchase return processed');

    const milkStockAfterSupRet = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(milkStockAfterSupRet === milkStockBeforeSupRet - 5000, '9. Supplier return reduces inventory stock (-5 units)');

    const supBalAfterRet = getSupplierById(supplierA.id).current_balance_minor;
    assert(supBalAfterRet === supBalBeforeRet - 75000, '9a. Supplier return reduces payable by returned value (5 * Rs. 150 = Rs. 750)');

    // ──────────────────────────────────────────────────────────────────────────
    // 10. Exchange IN/OUT correct & 11. Over-return rejected
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Exchanges & Boundary Protection ---');
    // Sell 4 units of Bread (value 4 * 120 = Rs. 480)
    const sale2 = createSale({
      customer_id: customerA.id,
      items: [{ variant_id: varBread.id, quantity: 4000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 48000 }],
      discount_minor: 0,
    });
    const s2Source = searchSales(sale2.invoice_number)[0];
    const s2Item = s2Source?.items?.[0];
    if (!s2Item) throw new Error('s2Item missing');

    const breadStockBeforeEx = listStockSummary().find(r => r.variant_id === varBread.id)?.current_stock ?? 0;
    const milkStockBeforeEx = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;

    // Exchange 2 units Bread (Rs. 240) for 1 unit Milk (Rs. 200) -> Store refunds Rs. 40
    const exch = createSalesExchange({
      sale_id: sale2.id,
      return_items: [{ source_item_id: s2Item.source_item_id, quantity: 2000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: varMilk.id, quantity: 1000 }],
      settlement_method: 'cash',
      reason: 'Wanted milk instead of bread',
    });
    assert(Boolean(exch.id), 'Exchange processed successfully');

    const breadStockAfterEx = listStockSummary().find(r => r.variant_id === varBread.id)?.current_stock ?? 0;
    const milkStockAfterEx = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(breadStockAfterEx === breadStockBeforeEx + 2000, '10a. Exchange returned item stock restored (+2 Bread)');
    assert(milkStockAfterEx === milkStockBeforeEx - 1000, '10b. Exchange replacement item stock deducted (-1 Milk)');

    // Over-return test: Only 2 units left on sale2
    let overReturnBlocked = false;
    try {
      createSalesReturn({
        sale_id: sale2.id,
        items: [{ source_item_id: s2Item.source_item_id, quantity: 3000 }],
        reason: 'Attempting to return more than remaining',
        refund_method: 'cash',
      });
    } catch {
      overReturnBlocked = true;
    }
    assert(overReturnBlocked, '11. Over-return exceeding remaining quantity is strictly rejected');

    // ──────────────────────────────────────────────────────────────────────────
    // 12. Duplicate barcode rejected
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. Barcode Integrity ---');
    let dupBarcodeBlocked = false;
    try {
      addBarcode({
        variant_id: varBread.id,
        barcode: '8964000111222', // already assigned to Milk
        barcode_type: 'EAN13',
      });
    } catch {
      dupBarcodeBlocked = true;
    }
    assert(dupBarcodeBlocked, '12. Duplicate barcode assignment is strictly rejected');

    // ──────────────────────────────────────────────────────────────────────────
    // 13. Manual adjustment creates stock movement & 14. Creates audit event
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 9. Manual Stock Adjustments ---');
    const milkBeforeAdj = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    const adj = createMovement({
      variant_id: varMilk.id,
      quantity: 5000,
      direction: 'in',
      adjustment_type: 'manual_adjustment',
      notes: 'Found extra pack during audit count',
    });
    assert(Boolean(adj.id), 'Manual IN adjustment created');

    const milkAfterAdj = listStockSummary().find(r => r.variant_id === varMilk.id)?.current_stock ?? 0;
    assert(milkAfterAdj === milkBeforeAdj + 5000, '13. Manual adjustment updates stock balance (+5 units)');

    const auditAfterAdj = listAuditLogs({ search: 'extra pack during audit' });
    assert(auditAfterAdj.length > 0, '14. Manual adjustment creates detailed audit event with reason');

    // ──────────────────────────────────────────────────────────────────────────
    // 15. Supplier payment updates ledger & 16. Supplier payment cash movement
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 10. Supplier Payments & Cash Out ---');
    const supBalBeforePay = getSupplierById(supplierA.id).current_balance_minor;
    recordSupplierPayment({
      supplier_id: supplierA.id,
      amount_minor: 200000, // Rs. 2,000.00
      payment_method: 'cash',
      notes: 'Weekly supplier settlement',
    });

    const supBalAfterPay = getSupplierById(supplierA.id).current_balance_minor;
    assert(supBalAfterPay === supBalBeforePay - 200000, '15. Supplier payment reduces payable balance (-Rs. 2,000.00)');

    const drawerAfterPay = getCashMovements(cashSession.id);
    const payMovement = drawerAfterPay.find(m => m.movement_type === 'SUPPLIER_PAYMENT' && m.amount_minor === 200000);
    assert(Boolean(payMovement), '16. Supplier cash payment records SUPPLIER_PAYMENT movement in cash drawer');

    // ──────────────────────────────────────────────────────────────────────────
    // 17. Rollback on failed purchase & 18. Rollback on failed inventory operation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 11. Transaction Safety & Atomic Rollback ---');
    const purchCountBefore = countRows('purchases');
    const movementsCountBefore = countRows('stock_movements');

    let failedPurchaseThrew = false;
    try {
      createPurchase({
        supplier_id: supplierA.id,
        items: [
          { variant_id: varMilk.id, quantity: 10000, unit_cost_minor: 15000 },
          { variant_id: 999999, quantity: 10000, unit_cost_minor: 10000 }, // invalid variant -> throws!
        ],
        payments: [],
      });
    } catch {
      failedPurchaseThrew = true;
    }
    assert(failedPurchaseThrew, 'Multi-item purchase with invalid variant throws');
    assert(countRows('purchases') === purchCountBefore, '17. Failed purchase transaction cleanly rolls back purchase record');
    assert(countRows('stock_movements') === movementsCountBefore, '17a. Failed purchase rolls back all stock movements');

    // Failed inventory adjustment (reduction below 0 with negative stock disabled)
    let failedAdjThrew = false;
    try {
      createMovement({
        variant_id: varBread.id,
        quantity: 999999000, // way more than stock
        direction: 'out',
        adjustment_type: 'manual_adjustment',
        notes: 'Excess reduction test',
      });
    } catch {
      failedAdjThrew = true;
    }
    assert(failedAdjThrew, 'Excess stock reduction throws');
    assert(countRows('stock_movements') === movementsCountBefore, '18. Failed inventory operation creates no orphaned stock movements');

    // ──────────────────────────────────────────────────────────────────────────
    // 19. Product movement history is complete & explainable
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 12. Product Movement History ---');
    const milkMovements = listMovements({ variant_id: varMilk.id });
    assert(milkMovements.length >= 4, '19. Product movement history captures all transactions for Milk');
    const typesPresent = new Set(milkMovements.map(m => m.reference_type));
    assert(typesPresent.has('PURCHASE'), '19a. History contains PURCHASE');
    assert(typesPresent.has('SALE'), '19b. History contains SALE');
    assert(typesPresent.has('SALE_RETURN'), '19c. History contains SALE_RETURN');
    assert(typesPresent.has('MANUAL_ADJUSTMENT'), '19d. History contains MANUAL_ADJUSTMENT');

    // ──────────────────────────────────────────────────────────────────────────
    // 20. Cross-module totals remain consistent
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 13. Cross-Module Consistency ---');
    const sReport = getSalesReport();
    const pReport = getPurchasesReport();
    const invReport = getInventoryReport();

    assert(sReport.summary.total_sales_count >= 2, '20a. Sales report reflects completed sales');
    assert(pReport.summary.total_purchases_count === 2, '20b. Purchases report reflects completed purchases');
    assert(invReport.summary.total_items_count >= 2, '20c. Inventory report includes active items');
    assert(invReport.summary.total_valuation_purchase_minor > 0, '20d. Inventory valuation computed dynamically from actual stock');

  } finally {
    cleanup();
  }

  console.log(`\n======================================================`);
  console.log(`Phase 3 Audit Summary: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exitCode = 1;
}

run();
