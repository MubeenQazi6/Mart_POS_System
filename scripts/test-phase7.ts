/**
 * MARTPOS Phase 7 — Purchases and Suppliers Automated Test Suite
 *
 * Tests the complete purchasing and supplier accounting engine in an isolated SQLite database:
 * 1.  Supplier CRUD operations (create, update, soft-delete)
 * 2.  Supplier opening balance recording
 * 3.  Purchase order creation with sequential numbering (PO-00001)
 * 4.  Inward stock movements created (movement_type = 'IN', reference_type = 'PURCHASE')
 * 5.  Stock calculation reflects purchase intake immediately
 * 6.  Variant purchase price updated in catalog if requested
 * 7.  Multiple items in a single purchase receiving order
 * 8.  Payment status computation (paid, partial, unpaid)
 * 9.  Purchase payments persisted in purchase_payments
 * 10. Supplier payable balance updated correctly for unpaid/partial purchases
 * 11. Direct supplier payment recording decrements supplier payable balance
 * 12. Supplier ledger returns complete chronological transaction history
 * 13. Purchase KPIs computed correctly
 * 14. Validation: Invalid supplier ID rejected
 * 15. Validation: Empty items list rejected
 * 16. Validation: Invalid item quantities or negative costs rejected
 * 17. Atomic transaction rollback: Stock movements & supplier balances not created on failure
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { getVariantStock } from '../src/repositories/inventory';
import {
  createSupplier,
  updateSupplier,
  getSupplierById,
  listSuppliers,
  getSupplierLedger,
  recordSupplierPayment,
} from '../src/repositories/suppliers';
import {
  createPurchase,
  getPurchaseById,
  listPurchases,
  getPurchaseKpis,
} from '../src/repositories/purchases';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

function assertThrows(fn: () => unknown, expectedFragment: string, message: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${message} — Expected an error but none was thrown`);
    failedTests++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes(expectedFragment.toLowerCase())) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message} — Got unexpected error: ${msg}`);
      failedTests++;
    }
  }
}

function runTests(): void {
  console.log('====================================================');
  console.log('MARTPOS Phase 7 Automated Test Suite (Isolated DB)');
  console.log('====================================================\n');

  const testDbPath = join(tmpdir(), `martpos-test-phase7-${String(Date.now())}.db`);
  console.log(`[Setup] Creating isolated test database at: ${testDbPath}`);

  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  dbClient.setDb(db);

  try {
    // Run all migrations
    console.log('[Setup] Running migrations...');
    const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
    migrate(db, { migrationsFolder });
    console.log('[Setup] Migrations applied successfully.\n');

    // --- SETUP: Catalog fixtures ---
    console.log('--- Setup: Creating catalog fixtures ---');
    const cat = createCategory({ name: 'Beverages' });
    const unitPc = createUnit({ name: 'Piece', abbreviation: 'PC', decimals: 0 });

    const teaProduct = createProduct({
      name: 'Black Tea',
      category_id: cat.id,
      variants: [
        {
          variant_name: '500g Pack',
          sku: 'TEA-500G',
          unit_id: unitPc.id,
          purchase_price_minor: 45000, // Rs. 450.00
          selling_price_minor: 55000,  // Rs. 550.00
          min_stock_alert: 10000,
        },
      ],
    });
    const vTea = teaProduct.variants?.[0];
    if (!vTea) throw new Error('Tea fixture failed');

    const sugarProduct = createProduct({
      name: 'Refined Sugar',
      category_id: cat.id,
      variants: [
        {
          variant_name: '1 KG Bag',
          sku: 'SUGAR-1KG',
          unit_id: unitPc.id,
          purchase_price_minor: 14000, // Rs. 140.00
          selling_price_minor: 16000,  // Rs. 160.00
          min_stock_alert: 20000,
        },
      ],
    });
    const vSugar = sugarProduct.variants?.[0];
    if (!vSugar) throw new Error('Sugar fixture failed');

    console.log('[Setup] Fixtures created successfully.\n');

    // ======================================================
    // 1. Supplier CRUD & Opening Balance
    // ======================================================
    console.log('--- 1. Supplier Management ---');

    const supplier1 = createSupplier({
      name: 'National Foods Distributor',
      contact_person: 'Ali Raza',
      phone: '0300-1112233',
      email: 'sales@nationalfoods.com',
      address: 'Industrial Area, Karachi',
      opening_balance_minor: 500000, // Rs. 5,000.00 opening payable
    });

    assert(supplier1.id > 0, '1. Supplier created with auto ID');
    assert(supplier1.name === 'National Foods Distributor', '1a. Supplier name persisted correctly');
    assert(supplier1.opening_balance_minor === 500000, '2. Supplier opening balance recorded as 500000 minor');
    assert(supplier1.current_balance_minor === 500000, '2a. Supplier current balance initialized to opening balance');

    // Check opening balance ledger entry
    const initialLedger = getSupplierLedger(supplier1.id);
    assert(initialLedger.length === 1, '2b. Opening balance created 1 supplier transaction record');
    assert(initialLedger[0]?.transaction_type === 'ADJUSTMENT', '2c. Transaction type is ADJUSTMENT');

    // Update supplier
    const updatedSupplier = updateSupplier({
      id: supplier1.id,
      contact_person: 'Muhammad Ali',
      phone: '0300-9998877',
    });
    assert(updatedSupplier.contact_person === 'Muhammad Ali', '1b. Supplier contact person updated');
    assert(updatedSupplier.phone === '0300-9998877', '1c. Supplier phone updated');

    const allSuppliers = listSuppliers({ is_active: true });
    assert(allSuppliers.length === 1, '1d. listSuppliers returns 1 active supplier');

    // ======================================================
    // 2. Purchase Order Creation & Sequential Numbering
    // ======================================================
    console.log('\n--- 2. Purchase Order Creation ---');

    // Stock before purchase
    const teaStockBefore = getVariantStock(vTea.id).current_stock;
    assert(teaStockBefore === 0, '4a. Tea stock before purchase is 0');

    // Create Purchase 1: 50 packs of tea @ Rs. 440 (cost changed from 450 to 440)
    // Total = 50 * 44000 = 2,200,000 minor. Fully paid upfront.
    const purchase1 = createPurchase({
      supplier_id: supplier1.id,
      supplier_invoice_number: 'SUP-INV-101',
      items: [
        {
          variant_id: vTea.id,
          quantity: 50000, // 50 packs
          unit_cost_minor: 44000, // Rs. 440.00
        },
      ],
      discount_minor: 0,
      tax_minor: 0,
      payments: [
        {
          payment_method: 'bank_transfer',
          amount_minor: 2200000,
          reference_number: 'TXN-98421',
        },
      ],
      update_variant_cost: true, // Should update catalog purchase price
      notes: 'Initial tea shipment',
    });

    assert(purchase1.id > 0, '3. Purchase order created successfully');
    assert(purchase1.purchase_number === 'PUR-00001', '3a. Purchase number formatted sequentially as PUR-00001');
    assert(purchase1.total_minor === 2200000, '3b. Purchase total calculated as 2,200,000 minor (50 x 440.00)');
    assert(purchase1.paid_amount_minor === 2200000, '8a. Paid amount matches total');
    assert(purchase1.balance_minor === 0, '8b. Outstanding balance is 0');
    assert(purchase1.payment_status === 'paid', '8. Payment status is "paid"');

    // ======================================================
    // 3. Inward Stock Movement & Inventory Reflection
    // ======================================================
    console.log('\n--- 3. Inward Stock Ledger Integration ---');

    // Check stock_movements table
    const movements = db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.reference_id, purchase1.id))
      .all();

    assert(movements.length === 1, '4. Exactly one stock movement record created for purchase 1');
    assert(movements[0]?.movement_type === 'IN', '4b. Movement type is "IN"');
    assert(movements[0]?.reference_type === 'PURCHASE', '4c. Reference type is "PURCHASE"');
    assert(movements[0]?.quantity === 50000, '4d. Inward quantity is 50,000 (50 units)');

    // Authoritative stock calculation
    const teaStockAfter = getVariantStock(vTea.id).current_stock;
    assert(teaStockAfter === 50000, '5. Stock calculation reflects purchase intake immediately (current_stock = 50,000)');

    // Check catalog standard price update
    const vTeaUpdated = db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, vTea.id))
      .get();
    assert(
      vTeaUpdated?.purchase_price_minor === 44000,
      '6. Variant catalog purchase price updated to 44,000 minor',
    );

    // ======================================================
    // 4. Multi-item, Partial & Unpaid Purchases
    // ======================================================
    console.log('\n--- 4. Multi-Item & Partial Purchases ---');

    // Create Purchase 2: Unpaid multi-item purchase
    // 20 packs Tea @ 44,000 = 880,000
    // 100 bags Sugar @ 13,500 = 1,350,000
    // Subtotal = 2,230,000. Discount = 30,000. Total = 2,200,000.
    // Paid = 1,000,000 (partial cash payment). Balance = 1,200,000.
    const purchase2 = createPurchase({
      supplier_id: supplier1.id,
      supplier_invoice_number: 'SUP-INV-102',
      items: [
        { variant_id: vTea.id, quantity: 20000, unit_cost_minor: 44000 },
        { variant_id: vSugar.id, quantity: 100000, unit_cost_minor: 13500 },
      ],
      discount_minor: 30000,
      tax_minor: 0,
      payments: [{ payment_method: 'cash', amount_minor: 1000000 }],
      notes: 'Second shipment with partial payment',
    });

    assert(purchase2.purchase_number === 'PUR-00002', '3c. Next purchase gets sequential number PUR-00002');
    assert(purchase2.items?.length === 2, '7. Purchase contains exactly 2 line items');
    assert(purchase2.subtotal_minor === 2230000, '7a. Subtotal is accurately 2,230,000');
    assert(purchase2.total_minor === 2200000, '7b. Total after discount is 2,200,000');
    assert(purchase2.balance_minor === 1200000, '8c. Remaining balance is 1,200,000');
    assert(purchase2.payment_status === 'partial', '8d. Payment status is "partial"');

    // Check sugar stock
    const sugarStock = getVariantStock(vSugar.id).current_stock;
    assert(sugarStock === 100000, '5a. Sugar stock increased to 100,000 (100 bags)');

    // Check tea stock updated again (50,000 + 20,000 = 70,000)
    const teaStockTotal = getVariantStock(vTea.id).current_stock;
    assert(teaStockTotal === 70000, '5b. Tea stock cumulative total is 70,000');

    // ======================================================
    // 5. Supplier Balances & Direct Payments
    // ======================================================
    console.log('\n--- 5. Supplier Ledger & Payables ---');

    // Supplier balance should now be:
    // Initial opening: 500,000
    // Purchase 1 (fully paid): +0
    // Purchase 2 (unpaid balance): +1,200,000
    // Total payable = 1,700,000
    const supAfterP2 = getSupplierById(supplier1.id);
    assert(
      supAfterP2.current_balance_minor === 1700000,
      `10. Supplier current payable balance is 1,700,000 (got ${String(supAfterP2.current_balance_minor)})`,
    );

    // Record direct payment to supplier: Pay Rs. 700,000 via cheque
    recordSupplierPayment({
      supplier_id: supplier1.id,
      amount_minor: 700000,
      payment_method: 'cheque',
      reference_number: 'CHQ-5544',
      notes: 'Cleared partial payable dues',
    });

    const supAfterPay = getSupplierById(supplier1.id);
    assert(
      supAfterPay.current_balance_minor === 1000000,
      `11. Direct payment reduced supplier balance to 1,000,000 (got ${String(supAfterPay.current_balance_minor)})`,
    );

    // Verify ledger history
    const ledger = getSupplierLedger(supplier1.id);
    assert(ledger.length >= 3, `12. Supplier ledger contains all transactions (${String(ledger.length)} records)`);
    assert(ledger[0]?.transaction_type === 'PAYMENT', '12a. Most recent ledger transaction is PAYMENT');

    // ======================================================
    // 6. KPIs & Queries
    // ======================================================
    console.log('\n--- 6. KPIs & Summary Queries ---');

    const kpis = getPurchaseKpis();
    assert(kpis.total_purchases_count === 2, '13. KPI: total_purchases_count = 2');
    assert(kpis.total_purchases_value_minor === 4400000, '13a. KPI: total_purchases_value_minor = 4,400,000 (2.2M + 2.2M)');
    assert(kpis.total_payables_minor === 1000000, '13b. KPI: total_payables_minor = 1,000,000');

    const recentPurchases = listPurchases({ limit: 10 });
    assert(recentPurchases.length === 2, '13c. listPurchases returns 2 records');
    assert(recentPurchases[0]?.purchase_number === 'PUR-00002', '13d. listPurchases ordered recent-first');

    const getByIdDetails = getPurchaseById(purchase2.id);
    assert(getByIdDetails.items?.length === 2, '13e. getPurchaseById resolves items');
    assert(getByIdDetails.payments?.length === 1, '13f. getPurchaseById resolves payments');

    // ======================================================
    // 7. Validation & Error Handling
    // ======================================================
    console.log('\n--- 7. Validation & Transaction Safety ---');

    assertThrows(
      () => { createPurchase({ supplier_id: 99999, items: [{ variant_id: vTea.id, quantity: 1000, unit_cost_minor: 100 }] }); },
      'supplier',
      '14. Non-existent supplier ID rejected',
    );

    assertThrows(
      () => { createPurchase({ supplier_id: supplier1.id, items: [] }); },
      'at least one item',
      '15. Empty items list rejected',
    );

    assertThrows(
      () => { createPurchase({ supplier_id: supplier1.id, items: [{ variant_id: vTea.id, quantity: 0, unit_cost_minor: 100 }] }); },
      'positive',
      '16. Zero quantity rejected',
    );

    assertThrows(
      () => { createPurchase({ supplier_id: supplier1.id, items: [{ variant_id: vTea.id, quantity: -1000, unit_cost_minor: 100 }] }); },
      'positive',
      '16a. Negative quantity rejected',
    );

    assertThrows(
      () => { createPurchase({ supplier_id: supplier1.id, items: [{ variant_id: vTea.id, quantity: 1000, unit_cost_minor: -50 }] }); },
      'non-negative',
      '16b. Negative unit cost rejected',
    );

    // Atomic transaction safety check
    const stockBeforeFail = getVariantStock(vTea.id).current_stock;
    const supBalanceBeforeFail = getSupplierById(supplier1.id).current_balance_minor;

    let threw = false;
    try {
      createPurchase({
        supplier_id: supplier1.id,
        items: [
          { variant_id: vTea.id, quantity: 10000, unit_cost_minor: 40000 },
          { variant_id: 99999, quantity: 5000, unit_cost_minor: 20000 }, // Variant 99999 fails
        ],
      });
    } catch {
      threw = true;
    }

    assert(threw, '17. Multi-item purchase throws when one variant is invalid');
    const stockAfterFail = getVariantStock(vTea.id).current_stock;
    const supBalanceAfterFail = getSupplierById(supplier1.id).current_balance_minor;
    assert(stockBeforeFail === stockAfterFail, '17a. Rollback: Tea stock unchanged after failed purchase');
    assert(supBalanceBeforeFail === supBalanceAfterFail, '17b. Rollback: Supplier balance unchanged after failed purchase');

    sqlite.close();
  } finally {
    console.log('\n[Cleanup] Removing temporary test database file...');
    try {
      if (existsSync(testDbPath)) unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (existsSync(wal)) unlinkSync(wal);
      if (existsSync(shm)) unlinkSync(shm);
      console.log('[Cleanup] Isolated test database cleaned up.');
    } catch {
      console.warn('[Cleanup] Note: Temporary files will be cleaned up by OS.');
    }
  }

  console.log('\n====================================================');
  console.log(`Phase 7 Test Results: ${String(passedTests)} Passed, ${String(failedTests)} Failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
