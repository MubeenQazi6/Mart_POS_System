/**
 * MARTPOS Phase 8 — Customers & Khata Accounts Automated Test Suite
 *
 * Tests customer management, Khata credit ledgers, POS credit sales, and credit limits:
 * 1.  Customer CRUD operations (create, update, soft-delete)
 * 2.  Customer phone lookup (instant exact match for POS)
 * 3.  Customer phone number uniqueness enforcement
 * 4.  Customer opening balance and credit limit setting
 * 5.  POS Credit Sale (Khata): Checkout with payment_method = 'credit' updates customer balance atomically
 * 6.  POS Credit Sale: Stock reduced (OUT movement) and customer_transaction (SALE_CREDIT) recorded
 * 7.  POS Credit Sale: Multiple payment methods (split payment: cash + credit) supported
 * 8.  Credit limit enforcement: Sale exceeding customer credit limit is strictly rejected with rollback
 * 9.  Deactivated customer cannot purchase on credit
 * 10. Direct Khata payment collection decrements customer receivable balance
 * 11. Customer transaction ledger returns full chronological history
 * 12. Customer KPIs (total count, total receivables) computed accurately
 * 13. Validation: Missing name or phone rejected
 * 14. Validation: POS credit sale without customer_id rejected
 * 15. Validation: Negative payment amounts rejected
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSale } from '../src/repositories/sales';
import { createMovement, getVariantStock } from '../src/repositories/inventory';
import {
  createCustomer,
  updateCustomer,
  getCustomerById,
  lookupCustomerByPhone,
  listCustomers,
  getCustomerLedger,
  recordCustomerPayment,
  getCustomerKpis,
} from '../src/repositories/customers';
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
  console.log('MARTPOS Phase 8 Automated Test Suite (Isolated DB)');
  console.log('====================================================\n');

  const testDbPath = join(tmpdir(), `martpos-test-phase8-${String(Date.now())}.db`);
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

    // --- SETUP: Catalog fixtures & initial stock ---
    console.log('--- Setup: Creating catalog & stock fixtures ---');
    const cat = createCategory({ name: 'Groceries' });
    const unitPc = createUnit({ name: 'Piece', abbreviation: 'PC', decimals: 0 });

    const riceProduct = createProduct({
      name: 'Basmati Rice 5kg',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Standard Bag',
          sku: 'RICE-5KG',
          unit_id: unitPc.id,
          purchase_price_minor: 120000, // Rs. 1,200.00
          selling_price_minor: 150000,  // Rs. 1,500.00
        },
      ],
    });
    const vRice = riceProduct.variants?.[0];
    if (!vRice) throw new Error('Rice fixture failed');

    // Add initial stock: 50 bags of rice
    createMovement({
      variant_id: vRice.id,
      adjustment_type: 'opening_stock',
      quantity: 50000, // 50 bags
      notes: 'Initial opening stock',
    });

    console.log('[Setup] Fixtures created successfully.\n');

    // ======================================================
    // 1. Customer CRUD & Phone Lookup
    // ======================================================
    console.log('--- 1. Customer Management & Phone Lookup ---');

    const customer1 = createCustomer({
      name: 'Chaudhry Tariq',
      phone: '0300-5551122',
      email: 'tariq@gmail.com',
      address: 'House 12, Street 3, Lahore',
      credit_limit_minor: 1000000, // Rs. 10,000.00 credit limit
      opening_balance_minor: 200000, // Rs. 2,000.00 opening debt
    });

    assert(customer1.id > 0, '1. Customer registered with auto ID');
    assert(customer1.name === 'Chaudhry Tariq', '1a. Customer name is correct');
    assert(customer1.credit_limit_minor === 1000000, '4. Credit limit set to 1,000,000 minor (Rs. 10,000)');
    assert(customer1.opening_balance_minor === 200000, '4a. Opening balance set to 200,000 minor');
    assert(customer1.current_balance_minor === 200000, '4b. Current balance initialized to 200,000 minor');

    // Phone lookup for POS
    const lookedUp = lookupCustomerByPhone('0300-5551122');
    assert(lookedUp !== null && lookedUp.id === customer1.id, '2. Phone lookup returns matching customer profile');

    const lookupMissing = lookupCustomerByPhone('0399-0000000');
    assert(lookupMissing === null, '2a. Non-existent phone returns null');

    // Duplicate phone check
    assertThrows(
      () => {
        createCustomer({
          name: 'Duplicate Person',
          phone: '0300-5551122',
        });
      },
      'already exists',
      '3. Duplicate phone number registration is strictly rejected',
    );

    // Update customer
    const updatedCust = updateCustomer({
      id: customer1.id,
      address: 'House 99, Model Town, Lahore',
      credit_limit_minor: 1500000, // Increased to Rs. 15,000
    });
    assert(updatedCust.address === 'House 99, Model Town, Lahore', '1b. Customer address updated');
    assert(updatedCust.credit_limit_minor === 1500000, '1c. Customer credit limit updated to 1,500,000');

    // ======================================================
    // 2. POS Credit Sale (Khata) & Balance Adjustment
    // ======================================================
    console.log('\n--- 2. POS Credit Sale (Khata) ---');

    const stockBeforeSale = getVariantStock(vRice.id).current_stock;
    assert(stockBeforeSale === 50000, 'Stock before sale is 50,000 (50 bags)');

    // POS Sale 1: 2 bags of rice @ Rs. 1,500 = Rs. 3,000 (300,000 minor).
    // Payment: 100% Credit (Khata)
    const sale1 = createSale({
      items: [{ variant_id: vRice.id, quantity: 2000, discount_minor: 0 }],
      discount_minor: 0,
      customer_id: customer1.id,
      payments: [{ payment_method: 'credit', amount_minor: 300000 }],
      notes: 'Customer took 2 bags on Khata',
    });

    assert(sale1.id > 0, '5. POS Credit Sale completed successfully');
    assert(sale1.total_minor === 300000, '5a. Sale total is 300,000 minor (Rs. 3,000)');

    // Customer balance: 200,000 (opening) + 300,000 (credit sale) = 500,000
    const custAfterSale1 = getCustomerById(customer1.id);
    assert(
      custAfterSale1.current_balance_minor === 500000,
      `5b. Customer current balance updated to 500,000 minor (got ${String(custAfterSale1.current_balance_minor)})`,
    );

    // Stock reduced
    const stockAfterSale1 = getVariantStock(vRice.id).current_stock;
    assert(stockAfterSale1 === 48000, '6. Inventory ledger decremented by 2,000 (48 bags remain)');

    // Customer ledger entry
    const ledgerAfterSale1 = getCustomerLedger(customer1.id);
    assert(ledgerAfterSale1.length === 2, '6a. Customer ledger has 2 entries (Opening + Credit Sale)');
    assert(ledgerAfterSale1[0]?.transaction_type === 'SALE_CREDIT', '6b. Recent transaction is SALE_CREDIT');
    assert(ledgerAfterSale1[0]?.amount_minor === 300000, '6c. Transaction amount is 300,000');

    // ======================================================
    // 3. Split Payment (Cash + Credit)
    // ======================================================
    console.log('\n--- 3. Split Payment (Cash + Khata Credit) ---');

    // POS Sale 2: 3 bags of rice @ 1,500 = 450,000 minor.
    // Payment: Rs. 2,000 cash (200,000) + Rs. 2,500 credit (250,000)
    const sale2 = createSale({
      items: [{ variant_id: vRice.id, quantity: 3000, discount_minor: 0 }],
      discount_minor: 0,
      customer_id: customer1.id,
      payments: [
        { payment_method: 'cash', amount_minor: 200000 },
        { payment_method: 'credit', amount_minor: 250000 },
      ],
      notes: 'Split payment: Partial cash and remaining on Khata',
    });

    assert(sale2.id > 0, '7. Split payment sale recorded');
    const custAfterSale2 = getCustomerById(customer1.id);
    // Customer balance: 500,000 + 250,000 = 750,000
    assert(
      custAfterSale2.current_balance_minor === 750000,
      `7a. Customer balance increased only by credit portion (250,000) -> 750,000 (got ${String(custAfterSale2.current_balance_minor)})`,
    );

    // ======================================================
    // 4. Credit Limit Enforcement
    // ======================================================
    console.log('\n--- 4. Credit Limit Enforcement ---');

    // Customer 1 limit is 1,500,000. Current balance is 750,000.
    // Attempting a credit sale of Rs. 8,000 (800,000 minor) would make balance 1,550,000 > 1,500,000 limit.
    assertThrows(
      () => {
        createSale({
          items: [{ variant_id: vRice.id, quantity: 6000, discount_minor: 0 }], // 6 bags = 900,000
          discount_minor: 100000, // Total = 800,000
          customer_id: customer1.id,
          payments: [{ payment_method: 'credit', amount_minor: 800000 }],
        });
      },
      'credit limit exceeded',
      '8. Credit sale exceeding customer limit is strictly rejected with descriptive message',
    );

    // Verify rollback: Customer balance and stock untouched
    const custAfterLimitFail = getCustomerById(customer1.id);
    assert(custAfterLimitFail.current_balance_minor === 750000, '8a. Rollback: Customer balance unchanged after limit rejection');
    const stockAfterLimitFail = getVariantStock(vRice.id).current_stock;
    assert(stockAfterLimitFail === 45000, '8b. Rollback: Stock unchanged after limit rejection');

    // ======================================================
    // 5. Deactivated Customer Check
    // ======================================================
    console.log('\n--- 5. Deactivated Customer Check ---');

    const customer2 = createCustomer({
      name: 'Blocked User',
      phone: '0311-9990000',
    });
    updateCustomer({ id: customer2.id, is_active: false });

    assertThrows(
      () => {
        createSale({
          items: [{ variant_id: vRice.id, quantity: 1000, discount_minor: 0 }],
          discount_minor: 0,
          customer_id: customer2.id,
          payments: [{ payment_method: 'credit', amount_minor: 150000 }],
        });
      },
      'deactivated',
      '9. Deactivated customer cannot make credit purchases',
    );

    // ======================================================
    // 6. Direct Payment Collection & Ledger
    // ======================================================
    console.log('\n--- 6. Khata Payment Collection ---');

    // Customer 1 pays Rs. 4,500 (450,000 minor) cash towards their Khata balance
    // Balance was 750,000 -> should become 300,000
    recordCustomerPayment({
      customer_id: customer1.id,
      amount_minor: 450000,
      payment_method: 'cash',
      notes: 'Customer cleared partial Khata balance',
    });

    const custAfterPay = getCustomerById(customer1.id);
    assert(
      custAfterPay.current_balance_minor === 300000,
      `10. Customer Khata balance decremented to 300,000 (got ${String(custAfterPay.current_balance_minor)})`,
    );

    const ledgerFull = getCustomerLedger(customer1.id);
    assert(ledgerFull.length === 4, `11. Ledger has 4 entries (got ${String(ledgerFull.length)})`);
    assert(ledgerFull[0]?.transaction_type === 'PAYMENT', '11a. Latest entry is PAYMENT');
    assert(ledgerFull[0]?.amount_minor === -450000, '11b. Payment recorded as negative ledger amount (-450,000)');

    // ======================================================
    // 7. KPIs & Filtering
    // ======================================================
    console.log('\n--- 7. KPIs & Filter Queries ---');

    const kpis = getCustomerKpis();
    assert(kpis.total_customers_count === 1, '12. Active customers count is 1 (excluding deactivated)');
    assert(kpis.total_receivables_minor === 300000, '12a. Total receivables is 300,000 minor (Rs. 3,000)');

    const debtOnlyCustomers = listCustomers({ has_balance_only: true });
    assert(debtOnlyCustomers.length === 1, '12b. has_balance_only returns only customers with positive debt');

    // ======================================================
    // 8. Input Validation Checks
    // ======================================================
    console.log('\n--- 8. Input Validation Checks ---');

    assertThrows(
      () => { createCustomer({ name: '', phone: '0300-1234567' }); },
      'name is required',
      '13. Empty customer name rejected',
    );

    assertThrows(
      () => { createCustomer({ name: 'Valid Name', phone: '' }); },
      'phone number is required',
      '13a. Empty customer phone rejected',
    );

    assertThrows(
      () => {
        createSale({
          items: [{ variant_id: vRice.id, quantity: 1000, discount_minor: 0 }],
          discount_minor: 0,
          payments: [{ payment_method: 'credit', amount_minor: 150000 }],
        });
      },
      'registered customer is required',
      '14. Credit payment without customer_id rejected',
    );

    assertThrows(
      () => { recordCustomerPayment({ customer_id: customer1.id, amount_minor: -500, payment_method: 'cash' }); },
      'positive integer',
      '15. Negative customer payment amount rejected',
    );

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
  console.log(`Phase 8 Test Results: ${String(passedTests)} Passed, ${String(failedTests)} Failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
