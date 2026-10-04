import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createPurchase } from '../src/repositories/purchases';
import { createSupplier } from '../src/repositories/suppliers';
import { createSale } from '../src/repositories/sales';
import { openCashSession, recordCashIn, recordCashOut, getCashMovements } from '../src/repositories/cash';
import { createMovement, getVariantStock, listMovements } from '../src/repositories/inventory';
import { createSalesReturn, createSalesExchange, searchSales } from '../src/repositories/returns';
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
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-transition-flow-${Date.now()}.db`);
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
  console.log('=== Transaction Transition Flow Test ===\n');
  setup();

  try {
    const category = createCategory({ name: 'Transition Test Category' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const productA = createProduct({
      name: 'Transition Product A',
      category_id: category.id,
      variants: [{
        variant_name: 'Standard',
        unit_id: unit.id,
        purchase_price_minor: 5000,
        selling_price_minor: 8000,
        sku: 'TRANS-A',
        min_stock_alert: 0,
      }],
    });
    const productB = createProduct({
      name: 'Transition Product B',
      category_id: category.id,
      variants: [{
        variant_name: 'Premium',
        unit_id: unit.id,
        purchase_price_minor: 7000,
        selling_price_minor: 12000,
        sku: 'TRANS-B',
        min_stock_alert: 0,
      }],
    });
    const variantA = productA.variants?.[0];
    const variantB = productB.variants?.[0];
    if (!variantA || !variantB) throw new Error('Product fixtures were not created');
    const supplier = createSupplier({ name: 'Transition Test Supplier' });

    const cashSession = openCashSession({ opening_cash_minor: 100000 });
    assert(cashSession.opening_cash_minor === 100000, 'Cash session opens with expected float');

    // Inventory in through a supplier purchase and a manual opening-stock entry.
    const purchase = createPurchase({
      supplier_id: supplier.id,
      items: [{ variant_id: variantA.id, quantity: 10000, unit_cost_minor: 5000 }],
      payments: [{ payment_method: 'cash', amount_minor: 50000 }],
    });
    assert(purchase.id > 0, 'Supplier purchase is created for inventory-in');
    createMovement({
      variant_id: variantB.id,
      adjustment_type: 'opening_stock',
      direction: 'in',
      quantity: 5000,
      notes: 'Opening stock for transition flow',
    });
    assert(getVariantStock(variantA.id).current_stock === 10000, 'Product A inventory-in from purchase is recorded');
    assert(getVariantStock(variantB.id).current_stock === 5000, 'Product B inventory-in from opening stock is recorded');

    // Explicit register cash in/out transitions.
    recordCashIn({ session_id: cashSession.id, amount_minor: 20000, description: 'Owner cash added' });
    recordCashOut({ session_id: cashSession.id, amount_minor: 5000, description: 'Petty cash withdrawal' });
    const cashAfterManual = getCashMovements(cashSession.id);
    assert(cashAfterManual.some((m) => m.movement_type === 'CASH_IN' && m.amount_minor === 20000), 'Cash-in movement is recorded');
    assert(cashAfterManual.some((m) => m.movement_type === 'CASH_OUT' && m.amount_minor === 5000), 'Cash-out movement is recorded');

    // Inventory out through a manual adjustment and a cash sale.
    createMovement({
      variant_id: variantB.id,
      adjustment_type: 'manual_adjustment',
      direction: 'out',
      quantity: 1000,
      notes: 'Manual inventory issue',
    });
    const sale = createSale({
      items: [{ variant_id: variantA.id, quantity: 4000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 32000 }],
      discount_minor: 0,
    });
    assert(getVariantStock(variantA.id).current_stock === 6000, 'Product A inventory-out from sale is recorded');
    assert(getVariantStock(variantB.id).current_stock === 4000, 'Product B inventory-out from manual adjustment is recorded');

    // Customer return: cash refund and resalable inventory-in.
    const saleItem = searchSales(sale.invoice_number)[0]?.items?.[0];
    if (!saleItem) throw new Error('Sale item was not found for return');
    const customerReturn = createSalesReturn({
      sale_id: sale.id,
      items: [{ source_item_id: saleItem.source_item_id, quantity: 1000, return_condition: 'resalable' }],
      reason: 'Transition flow return',
      refund_method: 'cash',
    });
    assert(customerReturn.refund_amount_minor === 8000, 'Return calculates the cash refund correctly');
    assert(getVariantStock(variantA.id).current_stock === 7000, 'Resalable return restores product inventory-in');

    // Product exchange: return Product A and replace it with Product B, collecting cash difference.
    const exchangeSale = createSale({
      items: [{ variant_id: variantA.id, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 16000 }],
      discount_minor: 0,
    });
    const exchangeItem = searchSales(exchangeSale.invoice_number)[0]?.items?.[0];
    if (!exchangeItem) throw new Error('Exchange sale item was not found');
    const exchange = createSalesExchange({
      sale_id: exchangeSale.id,
      return_items: [{ source_item_id: exchangeItem.source_item_id, quantity: 2000, return_condition: 'resalable' }],
      replacement_items: [{ variant_id: variantB.id, quantity: 2000 }],
      settlement_method: 'cash',
      reason: 'Product upgrade',
    });
    assert(exchange.return_total_minor === 16000, 'Exchange return product value is correct');
    assert(exchange.replacement_total_minor === 24000, 'Exchange replacement product value is correct');
    assert(exchange.difference_minor === 8000, 'Exchange cash difference is correct');
    assert(getVariantStock(variantA.id).current_stock === 7000, 'Exchanged product is returned to inventory');
    assert(getVariantStock(variantB.id).current_stock === 2000, 'Replacement product leaves inventory');

    const finalCash = getCashMovements(cashSession.id);
    assert(finalCash.some((m) => m.movement_type === 'REFUND' && m.amount_minor === 8000), 'Return cash refund is recorded');
    assert(finalCash.some((m) => m.reference_id === exchange.id && m.movement_type === 'CASH_IN' && m.amount_minor === 8000), 'Exchange cash received is recorded');

    const movementsA = listMovements({ variant_id: variantA.id });
    const movementsB = listMovements({ variant_id: variantB.id });
    assert(movementsA.some((m) => m.reference_type === 'PURCHASE' && m.movement_type === 'IN'), 'Product A purchase movement is traceable');
    assert(movementsA.some((m) => m.reference_type === 'SALE' && m.movement_type === 'OUT'), 'Product A sale movement is traceable');
    assert(movementsA.some((m) => m.reference_type === 'SALE_RETURN' && m.movement_type === 'IN'), 'Product A return movement is traceable');
    assert(movementsB.some((m) => m.reference_type === 'OPENING_STOCK' && m.movement_type === 'IN'), 'Product B opening inventory movement is traceable');
    assert(movementsB.some((m) => m.reference_type === 'MANUAL_ADJUSTMENT' && m.movement_type === 'OUT'), 'Product B manual inventory-out movement is traceable');
  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
