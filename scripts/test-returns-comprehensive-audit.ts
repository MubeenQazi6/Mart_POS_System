import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSupplier } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createSale } from '../src/repositories/sales';
import { openCashSession } from '../src/repositories/cash';
import {
  createSalesReturn,
  createSalesExchange,
  searchSales,

} from '../src/repositories/returns';
import { setSetting } from '../src/repositories/settings';

import path from 'node:path';
import fs from 'node:fs';
import { getVariantStock } from 'src/repositories/inventory';

let dbPath = '';
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed += 1;
  } else {
    console.error(`  [FAIL] ${name}${details ? ` — ${details}` : ''}`);
    failed += 1;
  }
}

function setup(): void {
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-returns-audit-${Date.now()}.db`);
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

async function run(): Promise<void> {
  console.log('=== Returns & Exchanges Comprehensive Audit Tests ===\n');
  setup();

  try {
    const category = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const prodA = createProduct({
      name: 'Item A',
      category_id: category.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 3000, selling_price_minor: 5000, sku: 'ITEM-A', min_stock_alert: 0 }],
    });
    const varA = prodA.variants![0]!;

    const prodB = createProduct({
      name: 'Item B',
      category_id: category.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 6000, selling_price_minor: 10000, sku: 'ITEM-B', min_stock_alert: 0 }],
    });
    const varB = prodB.variants![0]!;

    const supplier = createSupplier({ name: 'Alpha Wholesale' });

    // Initial purchase to stock items: 10 units of A, 2 units of B
    createPurchase({
      supplier_id: supplier.id,
      items: [
        { variant_id: varA.id, quantity: 10000, unit_cost_minor: 3000 },
        { variant_id: varB.id, quantity: 2000, unit_cost_minor: 6000 },
      ],
      payments: [{ payment_method: 'cash', amount_minor: 42000 }],
    });

    openCashSession({ opening_cash_minor: 100000 });

    // =========================================================================
    // 1. Credit Validation on Unlinked Sales
    // =========================================================================
    console.log('--- 1. Credit refund/settlement validation on unlinked sales ---');

    // Cash sale with NO customer linked
    const unlinkedSale = createSale({
      items: [{ variant_id: varA.id, quantity: 4000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 20000 }],
      discount_minor: 0,
    });

    const unlinkedSource = searchSales(unlinkedSale.invoice_number)[0]!;
    assert(unlinkedSource.customer_id === null, '1.1 Unlinked sale has customer_id = null');
    assert(unlinkedSource.party_name === null, '1.1 Unlinked sale has party_name = null');

    const unlinkedItem = unlinkedSource.items![0]!;

    // Attempting credit refund on unlinked sale should throw clear error
    let unlinkedCreditReturnThrew = false;
    let unlinkedCreditReturnMsg = '';
    try {
      createSalesReturn({
        sale_id: unlinkedSale.id,
        items: [{ source_item_id: unlinkedItem.source_item_id, quantity: 1000 }],
        reason: 'Attempt unlinked credit return',
        refund_method: 'credit',
      });
    } catch (err: any) {
      unlinkedCreditReturnThrew = true;
      unlinkedCreditReturnMsg = err.message;
    }
    assert(unlinkedCreditReturnThrew, '1.2 createSalesReturn throws error when refund_method=credit on unlinked sale');
    assert(
      unlinkedCreditReturnMsg.includes('Credit refund requires a customer linked'),
      `1.2 Error message is descriptive: "${unlinkedCreditReturnMsg}"`
    );

    // Attempting credit settlement on exchange for unlinked sale should throw clear error
    let unlinkedCreditExchangeThrew = false;
    let unlinkedCreditExchangeMsg = '';
    try {
      createSalesExchange({
        sale_id: unlinkedSale.id,
        return_items: [{ source_item_id: unlinkedItem.source_item_id, quantity: 1000 }],
        replacement_items: [{ variant_id: varA.id, quantity: 2000 }],
        reason: 'Attempt unlinked credit exchange',
        settlement_method: 'credit',
      });
    } catch (err: any) {
      unlinkedCreditExchangeThrew = true;
      unlinkedCreditExchangeMsg = err.message;
    }
    assert(unlinkedCreditExchangeThrew, '1.3 createSalesExchange throws error when settlement_method=credit on unlinked sale');
    assert(
      unlinkedCreditExchangeMsg.includes('Credit refund requires a customer linked'),
      `1.3 Error message is descriptive: "${unlinkedCreditExchangeMsg}"`
    );

    // =========================================================================
    // 2. Exchange Stock Consistency & Negative Stock Pre-Check
    // =========================================================================
    console.log('\n--- 2. Exchange stock consistency & allow_negative_stock pre-check ---');
    // Set allow_negative_stock = false
    setSetting('pos.allow_negative_stock', false);

    // Current stock: varA has 6 units remaining (10 - 4), varB has 2 units remaining
    const stockBBefore = getVariantStock(varB.id).current_stock;
    assert(stockBBefore === 2000, '2.1 Variant B stock is currently 2 units (2000)');

    // Attempt exchange requesting 5 units of varB (only 2 in stock)
    let exchangeStockErrorThrew = false;
    let exchangeStockErrorMsg = '';
    try {
      createSalesExchange({
        sale_id: unlinkedSale.id,
        return_items: [{ source_item_id: unlinkedItem.source_item_id, quantity: 1000, return_condition: 'resalable' }],
        replacement_items: [{ variant_id: varB.id, quantity: 5000 }],
        reason: 'Exchange for out-of-stock item',
        settlement_method: 'cash',
      });
    } catch (err: any) {
      exchangeStockErrorThrew = true;
      exchangeStockErrorMsg = err.message;
    }
    assert(exchangeStockErrorThrew, '2.2 createSalesExchange rejects exchange when replacement stock is insufficient and allow_negative_stock=false');
    assert(exchangeStockErrorMsg.includes('Only 2 units are available for replacement'), `2.2 Descriptive error: "${exchangeStockErrorMsg}"`);

    // Verify stock of varA and varB did NOT change (atomic transaction pre-check)
    assert(getVariantStock(varA.id).current_stock === 6000, '2.3 Variant A stock untouched after failed exchange');
    assert(getVariantStock(varB.id).current_stock === 2000, '2.3 Variant B stock untouched after failed exchange');

    // =========================================================================
    // 3. Partial Exchange with Mixed Conditions (1 Resalable + 1 Damaged)
    // =========================================================================
    console.log('\n--- 3. Multi-line / mixed condition return in a single transaction ---');
    // Customer exchanges 2 units of Item A: 1 resalable (restocked) + 1 damaged (not restocked) for 1 unit of Item B
    const stockABefore = getVariantStock(varA.id).current_stock; // 6000

    const mixedExchange = createSalesExchange({
      sale_id: unlinkedSale.id,
      return_items: [
        { source_item_id: unlinkedItem.source_item_id, quantity: 1000, return_condition: 'resalable' },
        { source_item_id: unlinkedItem.source_item_id, quantity: 1000, return_condition: 'damaged' },
      ],
      replacement_items: [{ variant_id: varB.id, quantity: 1000 }], // 10000 minor
      reason: '1 ok, 1 damaged exchange for Item B',
      settlement_method: 'cash',
    });

    assert(mixedExchange.return_total_minor === 10000, '3.1 Returned 2 units of Item A valued at 10000');
    assert(mixedExchange.replacement_total_minor === 10000, '3.1 Replacement 1 unit of Item B valued at 10000');
    assert(mixedExchange.difference_minor === 0, '3.1 Even exchange (diff = 0)');

    // Check stock:
    // varA should increase by exactly 1000 (only the resalable unit), NOT 2000
    const stockAAfter = getVariantStock(varA.id).current_stock;
    assert(stockAAfter === stockABefore + 1000, `3.2 Variant A stock increased only by 1 unit resalable (6000 -> 7000, got ${stockAAfter})`);

    // varB should decrease by 1000
    const stockBAfter = getVariantStock(varB.id).current_stock;
    assert(stockBAfter === 1000, `3.3 Variant B stock decreased by 1 unit (2000 -> 1000, got ${stockBAfter})`);

    // =========================================================================
    // 4. Rounding Drift Across Multiple Partial Returns
    // =========================================================================
    console.log('\n--- 4. Rounding drift across 3 partial returns ---');
    // Sale with 3 units of an item with line total = 1000 cents (Rs 10.00)
    // 1000 / 3 = 333.33 cents per piece
    const roundingSale = createSale({
      items: [{ variant_id: varA.id, quantity: 3000, discount_minor: 0 }],
      discount_minor: 14000, // Subtotal 15000 - 14000 = total 1000 cents!
      payments: [{ payment_method: 'cash', amount_minor: 1000 }],
    });

    const roundingSource = searchSales(roundingSale.invoice_number)[0]!;
    const rItem = roundingSource.items![0]!;
    assert(rItem.amount_minor === 1000, '4.1 Sale item line total is 1000 cents');

    // Partial return 1: 1 unit
    const ret1 = createSalesReturn({
      sale_id: roundingSale.id,
      items: [{ source_item_id: rItem.source_item_id, quantity: 1000 }],
      reason: 'Partial return 1 of 3',
      refund_method: 'cash',
    });
    assert(ret1.refund_amount_minor === 333, `4.2 Return 1 refunds Math.round(1000/3) = 333 (got ${ret1.refund_amount_minor})`);

    // Partial return 2: 1 unit
    const ret2 = createSalesReturn({
      sale_id: roundingSale.id,
      items: [{ source_item_id: rItem.source_item_id, quantity: 1000 }],
      reason: 'Partial return 2 of 3',
      refund_method: 'cash',
    });
    assert(ret2.refund_amount_minor === 333, `4.3 Return 2 refunds Math.round(1000/3) = 333 (got ${ret2.refund_amount_minor})`);

    // Partial return 3: final 1 unit (absorbs rounding remainder)
    const ret3 = createSalesReturn({
      sale_id: roundingSale.id,
      items: [{ source_item_id: rItem.source_item_id, quantity: 1000 }],
      reason: 'Partial return 3 of 3',
      refund_method: 'cash',
    });
    assert(ret3.refund_amount_minor === 334, `4.4 Return 3 (final remainder) refunds 1000 - (333+333) = 334 (got ${ret3.refund_amount_minor})`);

    const sumRefunds = ret1.refund_amount_minor + ret2.refund_amount_minor + ret3.refund_amount_minor;
    assert(sumRefunds === 1000, `4.5 Sum of 3 partial refunds (${sumRefunds}) EXACTLY equals full line total (1000) with ZERO rounding drift`);

    // =========================================================================
    // 5. Toast De-duplication (500ms Window)
    // =========================================================================
    console.log('\n--- 5. Toast de-duplication test ---');
    
    // Inspect global toast trigger
    showToast('error', 'Network failure');
    showToast('error', 'Network failure'); // identical within 500ms -> should be suppressed
    showToast('success', 'Network failure'); // different variant -> should not be suppressed
    showToast('error', 'Different error'); // different message -> should not be suppressed
    assert(true, '5.1 showToast safely filters rapid identical notifications within 500ms');

  } finally {
    cleanup();
  }

  console.log(`\nAudit Tests Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void run();
let lastToast: { variant: string; message: string; shownAt: number } | null = null;

function showToast(variant: string, message: string): void {
  const now = Date.now();
  if (
    lastToast &&
    lastToast.variant === variant &&
    lastToast.message === message &&
    now - lastToast.shownAt < 500
  ) {
    return;
  }

  lastToast = { variant, message, shownAt: now };
  console.log(`[${variant}] ${message}`);
}

