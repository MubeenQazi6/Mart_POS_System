import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { calculateCartTotals } from '../src/domain/sales';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSupplier } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { createSalesReturn, createSalesExchange, createPurchaseReturn, createPurchaseExchange, searchSales, searchPurchases } from '../src/repositories/returns';
import { openCashSession } from '../src/repositories/cash';
import path from 'node:path';
import fs from 'node:fs';

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
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-discount-returns-${Date.now()}.db`);
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
  console.log('=== Bill Discount & Proportional Returns Verification Test Suite ===\n');

  // =========================================================================
  // 1. Pure Domain Unit Tests: calculateCartTotals
  // =========================================================================
  console.log('--- 1. Domain calculateCartTotals Unit Tests ---');

  // Test 1.1: 3 items with bill discount remainder distribution
  const totals1 = calculateCartTotals(
    [
      { variant_id: 1, quantity: 1000, unit_price_minor: 1000, discount_minor: 0 }, // Rs 10.00
      { variant_id: 2, quantity: 1000, unit_price_minor: 1000, discount_minor: 0 }, // Rs 10.00
      { variant_id: 3, quantity: 1000, unit_price_minor: 1000, discount_minor: 0 }, // Rs 10.00
    ],
    100 // Bill discount Rs 1.00 (100 cents across 3 equal items = 33, 33, 34)
  );

  assert(totals1.subtotal_minor === 3000, '1.1 Subtotal is 3000');
  assert(totals1.discount_minor === 100, '1.1 Total discount is 100');
  assert(totals1.total_minor === 2900, '1.1 Total is 2900');
  assert(totals1.item_totals.length === 3, '1.1 Has 3 item totals');
  const sumLines1 = totals1.item_totals.reduce((s, it) => s + it.line_total_minor, 0);
  assert(sumLines1 === totals1.total_minor, '1.1 Sum of distributed line_total_minor equals total_minor exactly (2900)', `got ${sumLines1}`);
  assert(totals1.item_totals[0]?.line_total_minor === 967, '1.1 Item 1 line total is 967');
  assert(totals1.item_totals[1]?.line_total_minor === 967, '1.1 Item 2 line total is 967');
  assert(totals1.item_totals[2]?.line_total_minor === 966, '1.1 Item 3 (last) absorbs rounding remainder: 966');

  // Test 1.2: Items with both item discount and bill discount
  const totals2 = calculateCartTotals(
    [
      { variant_id: 1, quantity: 2000, unit_price_minor: 15000, discount_minor: 1000 }, // 2 x 150 = 300 - 10 = 290
      { variant_id: 2, quantity: 1000, unit_price_minor: 5000, discount_minor: 0 },     // 1 x 50 = 50
    ],
    2000 // Bill discount 20
  );
  assert(totals2.subtotal_minor === 35000, '1.2 Subtotal is 35000');
  assert(totals2.discount_minor === 3000, '1.2 Total discount is 3000 (1000 item + 2000 bill)');
  assert(totals2.total_minor === 32000, '1.2 Total is 32000');
  const sumLines2 = totals2.item_totals.reduce((s, it) => s + it.line_total_minor, 0);
  assert(sumLines2 === totals2.total_minor, '1.2 Sum of line totals equals total_minor exactly (32000)', `got ${sumLines2}`);

  // Test 1.3: Zero bill discount preserves exact line totals
  const totals3 = calculateCartTotals(
    [
      { variant_id: 1, quantity: 1000, unit_price_minor: 1250, discount_minor: 250 },
      { variant_id: 2, quantity: 2000, unit_price_minor: 2000, discount_minor: 0 },
    ],
    0
  );
  assert(totals3.item_totals[0]?.line_total_minor === 1000, '1.3 Zero bill discount preserves item 1 line total (1000)');
  assert(totals3.item_totals[1]?.line_total_minor === 4000, '1.3 Zero bill discount preserves item 2 line total (4000)');
  assert(totals3.total_minor === 5000, '1.3 Total is 5000');

  // =========================================================================
  // 2. Integration Tests: Sales Returns with Bill Discount
  // =========================================================================
  console.log('\n--- 2. Sales Returns Integration Tests ---');
  setup();

  try {
    const category = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const prodA = createProduct({
      name: 'Product A',
      category_id: category.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 5000, selling_price_minor: 10000, sku: 'PROD-A', min_stock_alert: 0 }],
    });
    const varA = prodA.variants![0]!;

    const prodB = createProduct({
      name: 'Product B',
      category_id: category.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 6000, selling_price_minor: 12000, sku: 'PROD-B', min_stock_alert: 0 }],
    });
    const varB = prodB.variants![0]!;

    const prodC = createProduct({
      name: 'Product C',
      category_id: category.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 3000, selling_price_minor: 8000, sku: 'PROD-C', min_stock_alert: 0 }],
    });
    const varC = prodC.variants![0]!;

    const supplier = createSupplier({ name: 'Test Supplier' });
    const customer = createCustomer({ name: 'Test Customer', phone: '03001234567' });

    // Stock up inventory
    createPurchase({
      supplier_id: supplier.id,
      items: [
        { variant_id: varA.id, quantity: 100000, unit_cost_minor: 5000 },
        { variant_id: varB.id, quantity: 100000, unit_cost_minor: 6000 },
        { variant_id: varC.id, quantity: 100000, unit_cost_minor: 3000 },
      ],
      payments: [],
    });

    openCashSession({ opening_cash_minor: 500000 });

    // Create Sale with 3 items and Rs 50.00 (5000 minor) bill discount:
    // Item A: 2 pcs @ 100 = 200.00 (20000 minor)
    // Item B: 1 pc  @ 120 = 120.00 (12000 minor)
    // Item C: 1 pc  @  80 =  80.00 ( 8000 minor)
    // Subtotal = 400.00 (40000 minor)
    // Bill discount = 50.00 (5000 minor)
    // Total = 350.00 (35000 minor)
    const sale1 = createSale({
      customer_id: customer.id,
      items: [
        { variant_id: varA.id, quantity: 2000, discount_minor: 0 }, // lineSubtotal 20000 -> bill discount 2500 -> net 17500
        { variant_id: varB.id, quantity: 1000, discount_minor: 0 }, // lineSubtotal 12000 -> bill discount 1500 -> net 10500
        { variant_id: varC.id, quantity: 1000, discount_minor: 0 }, // lineSubtotal  8000 -> bill discount 1000 -> net  7000
      ],
      discount_minor: 5000,
      payments: [{ payment_method: 'cash', amount_minor: 35000 }],
    });

    assert(sale1.total_minor === 35000, '2.1 Sale total_minor is 35000');
    assert(sale1.discount_minor === 5000, '2.1 Sale discount_minor is 5000');

    // Retrieve the sale items to get source_item_ids
    const saleSource = searchSales(sale1.invoice_number)[0]!;
    const itemA = saleSource.items!.find(i => i.variant_id === varA.id)!;
    const itemB = saleSource.items!.find(i => i.variant_id === varB.id)!;
    const itemC = saleSource.items!.find(i => i.variant_id === varC.id)!;

    assert(itemA.amount_minor === 17500, '2.2 Item A stored line total is discount-inclusive 17500 (not 20000)');
    assert(itemB.amount_minor === 10500, '2.2 Item B stored line total is discount-inclusive 10500 (not 12000)');
    assert(itemC.amount_minor === 7000, '2.2 Item C stored line total is discount-inclusive 7000 (not 8000)');

    // Test 2.3: FULL RETURN of the entire sale in a single return operation
    const fullReturn = createSalesReturn({
      sale_id: sale1.id,
      items: [
        { source_item_id: itemA.source_item_id, quantity: 2000 },
        { source_item_id: itemB.source_item_id, quantity: 1000 },
        { source_item_id: itemC.source_item_id, quantity: 1000 },
      ],
      reason: 'Full order return by customer',
      refund_method: 'cash',
    });

    assert(
      fullReturn.refund_amount_minor === sale1.total_minor,
      `2.3 Full return refund (${fullReturn.refund_amount_minor}) EXACTLY equals sale total_minor (${sale1.total_minor})`,
      `expected ${sale1.total_minor}, got ${fullReturn.refund_amount_minor}`
    );

    // =========================================================================
    // 3. Multi-Step Partial Returns with Bill Discount
    // =========================================================================
    console.log('\n--- 3. Multi-Step Partial Returns with Bill Discount ---');

    // Create Sale 2:
    // Item A: 2 pcs @ 100 = 20000
    // Item B: 1 pc  @ 120 = 12000
    // Bill discount = 4000 (40.00)
    // Subtotal = 32000, Total = 28000
    // Item A line total = 20000 - (20000*4000/32000 = 2500) = 17500 (8750 per piece)
    // Item B line total = 12000 - 1500 = 10500
    const sale2 = createSale({
      customer_id: customer.id,
      items: [
        { variant_id: varA.id, quantity: 2000, discount_minor: 0 },
        { variant_id: varB.id, quantity: 1000, discount_minor: 0 },
      ],
      discount_minor: 4000,
      payments: [{ payment_method: 'cash', amount_minor: 28000 }],
    });

    const sale2Source = searchSales(sale2.invoice_number)[0]!;
    const s2ItemA = sale2Source.items!.find(i => i.variant_id === varA.id)!;
    const s2ItemB = sale2Source.items!.find(i => i.variant_id === varB.id)!;

    // Step 1: Return 1 piece of Item A (out of 2 pcs)
    const ret1 = createSalesReturn({
      sale_id: sale2.id,
      items: [{ source_item_id: s2ItemA.source_item_id, quantity: 1000 }],
      reason: 'Returned 1 pc of Item A',
      refund_method: 'cash',
    });
    assert(ret1.refund_amount_minor === 8750, '3.1 Partial return 1 pc Item A refunds proportional discounted amount 8750 (not 10000)');

    // Step 2: Return remaining 1 piece of Item A
    const ret2 = createSalesReturn({
      sale_id: sale2.id,
      items: [{ source_item_id: s2ItemA.source_item_id, quantity: 1000 }],
      reason: 'Returned remaining pc of Item A',
      refund_method: 'cash',
    });
    assert(ret2.refund_amount_minor === 8750, '3.2 Second partial return refunds remaining 8750 (total for Item A = 17500)');

    // Step 3: Return Item B
    const ret3 = createSalesReturn({
      sale_id: sale2.id,
      items: [{ source_item_id: s2ItemB.source_item_id, quantity: 1000 }],
      reason: 'Returned Item B',
      refund_method: 'cash',
    });
    assert(ret3.refund_amount_minor === 10500, '3.3 Return Item B refunds 10500');

    const totalMultiRefund = ret1.refund_amount_minor + ret2.refund_amount_minor + ret3.refund_amount_minor;
    assert(
      totalMultiRefund === sale2.total_minor,
      `3.4 Sum of multi-step partial returns (${totalMultiRefund}) EXACTLY equals sale total_minor (${sale2.total_minor})`
    );

    // =========================================================================
    // 4. Sales Exchange with Bill Discount
    // =========================================================================
    console.log('\n--- 4. Sales Exchange with Bill Discount ---');

    // Create Sale 3 with bill discount:
    // Item A: 1 pc @ 100 = 10000
    // Bill discount = 2000 (20.00) -> Net line total = 8000
    const sale3 = createSale({
      customer_id: customer.id,
      items: [{ variant_id: varA.id, quantity: 1000, discount_minor: 0 }],
      discount_minor: 2000,
      payments: [{ payment_method: 'cash', amount_minor: 8000 }],
    });

    const sale3Source = searchSales(sale3.invoice_number)[0]!;
    const s3ItemA = sale3Source.items!.find(i => i.variant_id === varA.id)!;

    // Exchange Item A (value 8000) for Item B (selling price 12000)
    // Customer pays difference: 12000 - 8000 = 4000
    const exchange = createSalesExchange({
      sale_id: sale3.id,
      return_items: [{ source_item_id: s3ItemA.source_item_id, quantity: 1000 }],
      replacement_items: [{ variant_id: varB.id, quantity: 1000 }],
      settlement_method: 'cash',
      reason: 'Exchange for premium product',
    });

    assert(exchange.return_total_minor === 8000, '4.1 Exchange correctly values returned item at discounted price 8000 (not 10000)');
    assert(exchange.replacement_total_minor === 12000, '4.2 Replacement total is 12000');
    assert(exchange.difference_minor === 4000, '4.3 Exchange difference customer owes is 4000');

    // =========================================================================
    // 5. Purchase Returns & Exchanges with Supplier Discount
    // =========================================================================
    console.log('\n--- 5. Purchase Returns & Exchanges with Supplier Discount ---');

    // Create Purchase with 2 items and supplier bill discount:
    // Item A: 10 pcs @ 50 = 50000
    // Item B: 10 pcs @ 60 = 60000
    // Subtotal = 110000
    // Supplier bill discount = 11000 (10%)
    // Purchase Total = 99000
    // Item A line total = 50000 - 5000 = 45000 (45.00 per unit)
    // Item B line total = 60000 - 6000 = 54000 (54.00 per unit)
    const purch1 = createPurchase({
      supplier_id: supplier.id,
      items: [
        { variant_id: varA.id, quantity: 10000, unit_cost_minor: 5000 },
        { variant_id: varB.id, quantity: 10000, unit_cost_minor: 6000 },
      ],
      discount_minor: 11000,
      payments: [{ amount_minor: 99000, payment_method: 'cash' }],
    });

    assert(purch1.total_minor === 99000, '5.1 Purchase total is 99000');
    assert(purch1.discount_minor === 11000, '5.1 Purchase discount is 11000');

    const purchSource = searchPurchases(purch1.purchase_number)[0]!;
    const pItemA = purchSource.items!.find(i => i.variant_id === varA.id)!;
    const pItemB = purchSource.items!.find(i => i.variant_id === varB.id)!;

    assert(pItemA.amount_minor === 45000, '5.2 Purchase Item A has discount-inclusive line total 45000 (not 50000)');
    assert(pItemB.amount_minor === 54000, '5.2 Purchase Item B has discount-inclusive line total 54000 (not 60000)');

    // Test 5.3: Full Return to Supplier
    const purchFullReturn = createPurchaseReturn({
      purchase_id: purch1.id,
      items: [
        { source_item_id: pItemA.source_item_id, quantity: 10000 },
        { source_item_id: pItemB.source_item_id, quantity: 10000 },
      ],
      reason: 'Returning entire shipment to vendor',
      refund_method: 'cash',
    });

    assert(
      purchFullReturn.refund_amount_minor === purch1.total_minor,
      `5.3 Full purchase return refund (${purchFullReturn.refund_amount_minor}) EXACTLY equals purchase total_minor (${purch1.total_minor})`
    );

    // Test 5.4: Purchase Exchange with supplier discount
    const purch2 = createPurchase({
      supplier_id: supplier.id,
      items: [{ variant_id: varA.id, quantity: 10000, unit_cost_minor: 5000 }],
      discount_minor: 5000, // net total = 45000
      payments: [{ amount_minor: 45000, payment_method: 'cash' }],
    });

    const purch2Source = searchPurchases(purch2.purchase_number)[0]!;
    const p2ItemA = purch2Source.items!.find(i => i.variant_id === varA.id)!;

    const purchExchange = createPurchaseExchange({
      purchase_id: purch2.id,
      return_items: [{ source_item_id: p2ItemA.source_item_id, quantity: 10000 }],
      replacement_items: [{ variant_id: varB.id, quantity: 10000, unit_price_minor: 6000 }], // 60000
      settlement_method: 'cash',
      reason: 'Exchange defective stock with vendor',
    });

    assert(purchExchange.return_total_minor === 45000, '5.4 Purchase exchange return value is discount-inclusive 45000 (not 50000)');
    assert(purchExchange.replacement_total_minor === 60000, '5.4 Purchase replacement total is 60000');
    assert(purchExchange.difference_minor === 15000, '5.4 Difference owed to supplier is 15000');

  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
