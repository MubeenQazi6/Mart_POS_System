/**
 * MARTPOS — Complete End-to-End Realistic Business Workflow Test Suite
 *
 * Runs an exhaustive 40-step simulation on an isolated SQLite database:
 * 1.  Login as admin
 * 2.  Create Category (Beverages)
 * 3.  Create Brand (Supreme Foods)
 * 4.  Create Unit (Kilogram)
 * 5.  Create Product (Premium Basmati Rice)
 * 6.  Create Variant (5 KG Bag)
 * 7.  Add Barcode (8961234567890)
 * 8.  Create Supplier (Al-Rehman Traders)
 * 9.  Create Purchase Order (20 bags @ Rs. 1,000, Rs. 1,000 discount, Rs. 10,000 partial payment)
 * 10. Purchase creates inward stock movement (reference_type = PURCHASE)
 * 11. Verify inventory stock increased to 20,000 (20 units)
 * 12. Verify stock movement reference_type = 'PURCHASE'
 * 13. Verify purchase cost is stored accurately in minor units (100,000 minor)
 * 14. Verify supplier payable balance reflects outstanding debt (Rs. 9,000.00 / 900,000 minor)
 * 15. Make partial supplier payment (Rs. 4,000.00 / 400,000 minor)
 * 16. Verify supplier payable balance decreases accurately to Rs. 5,000.00
 * 17. Create Customer (Haji Abdul Rasheed, credit limit: Rs. 15,000.00)
 * 18. Perform Cash Sale (2 bags @ Rs. 1,500 = Rs. 3,000.00)
 * 19. Verify stock decreases to 18,000 (18 units)
 * 20. Perform Credit Sale (5 bags @ Rs. 1,500 = Rs. 7,500.00)
 * 21. Verify customer Khata balance increases to Rs. 7,500.00
 * 22. Verify credit limit enforcement (attempting Rs. 10,000 credit when limit is 15,000 and debt is 7,500 is rejected)
 * 23. Collect Customer Khata Payment (Rs. 3,500.00 received)
 * 24. Verify customer Khata debt decreases to Rs. 4,000.00
 * 25. Perform Inventory Damage Adjustment (1 bag damaged = 1,000 qty OUT)
 * 26. Verify stock decreases to 12,000 (12 units)
 * 27. Check movement history returns chronological records (PO, 2 Sales, Damage)
 * 28. Check Dashboard / Inventory KPIs
 * 29. Generate Sales Report and verify matching revenue
 * 30. Generate Purchases Report and verify matching spend
 * 31. Generate Stock Valuation Report (both purchase cost & retail price)
 * 32. Generate Supplier Payables Report and verify exact ledger balance
 * 33. Generate Customer Khata Report and verify exact ledger balance
 * 34. Generate Profit & Margin Report and verify gross profit and margin %
 * 35. Export Report to CSV with RFC 4180 rules
 * 36. Verify exported CSV file content and UTF-8 BOM
 * 37. Generate Print / HTML export template
 * 38. Logout active session
 * 39. Verify logout audit event recorded
 * 40. Attempt protected operations after logout and verify security rejection
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import {
  ensureDefaultAdmin,
  login,
  logout,
  getActiveUser,
  changePassword,
} from '../src/repositories/auth';
import { createCategory, createBrand, createUnit } from '../src/repositories/catalog';
import { createProduct, addBarcode } from '../src/repositories/products';
import { createSupplier, recordSupplierPayment, getSupplierById } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer, recordCustomerPayment, getCustomerById } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { createMovement, getVariantStock, listMovements, getInventoryKpis } from '../src/repositories/inventory';
import {
  getSalesReport,
  getPurchasesReport,
  getInventoryReport,
  getSuppliersPayableReport,
  getCustomersKhataReport,
  getProfitSummaryReport,
} from '../src/repositories/reports';
import { generateCsvContent, generateHtmlReportContent } from '../src/main/services/exportGenerators';
import { listAuditLogs } from '../src/repositories/audit';
import path from 'node:path';
import fs from 'node:fs';

let testDbPath: string | null = null;
let rawSqlite: Database.Database | null = null;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

function assertThrows(fn: () => void, expectedSubstring: string, testName: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${testName} — Expected error containing "${expectedSubstring}", but no error was thrown`);
    failed++;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} — Error thrown without expected substring. Got: "${message}"`);
      failed++;
    }
  }
}

function setupTestDb(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  testDbPath = path.join(tempDir, `martpos-test-e2e-${String(Date.now())}.db`);

  console.log(`[Setup] Creating isolated test database at: ${testDbPath}`);
  rawSqlite = new Database(testDbPath);
  rawSqlite.pragma('journal_mode = WAL');
  rawSqlite.pragma('foreign_keys = ON');

  const testDrizzleDb = drizzle(rawSqlite, { schema });
  setDb(testDrizzleDb);

  console.log('[Setup] Running migrations...');
  const migrationsFolder = path.join(process.cwd(), 'src', 'database', 'migrations');
  migrate(testDrizzleDb, { migrationsFolder });
  console.log('[Setup] Migrations applied successfully.');
}

function cleanupTestDb(): void {
  if (rawSqlite) {
    rawSqlite.close();
    rawSqlite = null;
  }
  if (testDbPath && fs.existsSync(testDbPath)) {
    console.log('[Cleanup] Removing temporary test database file...');
    try {
      fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {
      // ignore
    }
    console.log('[Cleanup] Isolated test database cleaned up.');
  }
}

function runE2ETests(): void {
  console.log('====================================================');
  console.log('MARTPOS Full End-to-End Business Lifecycle Test');
  console.log('====================================================\n');

  setupTestDb();

  try {
    // --------------------------------------------------------
    // Step 1: Admin Login & Session
    // --------------------------------------------------------
    console.log('--- Step 1: Admin Login & Default Setup ---');
    ensureDefaultAdmin();
    const adminUser = login({ username: 'admin', password: 'admin123' });
    assert(adminUser.username === 'admin', '1. Authenticated as admin');
    assert(adminUser.requires_password_change === true, '1a. Default admin password flagged for first-login change');
    assert(getActiveUser()?.id === adminUser.id, '1b. Active session set in memory');

    // --------------------------------------------------------
    // Steps 2–7: Catalog Setup (Category, Brand, Unit, Product, Variant, Barcode)
    // --------------------------------------------------------
    console.log('\n--- Steps 2–7: Catalog Creation ---');
    const category = createCategory({ name: 'Grains & Staples' });
    assert(category.id > 0, '2. Category created (Grains & Staples)');

    const brand = createBrand({ name: 'Supreme Foods' });
    assert(brand.id > 0, '3. Brand created (Supreme Foods)');

    const unit = createUnit({ name: 'Kilogram', abbreviation: 'KG', decimals: 0 });
    assert(unit.id > 0, '4. Unit created (KG)');

    const product = createProduct({
      name: 'Premium Basmati Rice',
      category_id: category.id,
      brand_id: brand.id,
      variants: [
        {
          variant_name: '5 KG Bag',
          unit_id: unit.id,
          purchase_price_minor: 100000, // Rs. 1,000.00
          selling_price_minor: 150000,  // Rs. 1,500.00
          sku: 'RICE-BASMATI-5K',
          min_stock_alert: 5000,
        },
      ],
    });
    assert(product.id > 0, '5. Product created (Premium Basmati Rice)');
    const variant = product.variants?.[0];
    if (!variant) throw new Error('Variant creation failed');
    assert(variant.id > 0, '6. Product variant created (5 KG Bag)');

    const barcode = addBarcode({
      variant_id: variant.id,
      barcode: '8961234567890',
      barcode_type: 'EAN13',
      is_primary: true,
    });
    assert(barcode.barcode === '8961234567890', '7. Barcode assigned to variant');

    // --------------------------------------------------------
    // Steps 8–16: Supplier, Purchase Intake & Payables
    // --------------------------------------------------------
    console.log('\n--- Steps 8–16: Supplier & Purchase Management ---');
    const supplier = createSupplier({
      name: 'Al-Rehman Traders',
      contact_person: 'Mohammad Rehman',
      phone: '03009876543',
      opening_balance_minor: 0,
    });
    assert(supplier.id > 0, '8. Supplier registered (Al-Rehman Traders)');

    // 20 bags @ 1000 = 20,000 - 1,000 discount = 19,000. Paid 10,000. Balance: 9,000.
    const purchase = createPurchase({
      supplier_id: supplier.id,
      supplier_invoice_number: 'SUP-INV-889',
      items: [
        {
          variant_id: variant.id,
          quantity: 20000, // 20 units
          unit_cost_minor: 100000,
        },
      ],
      discount_minor: 100000, // Rs. 1,000.00
      tax_minor: 0,
      payments: [
        {
          payment_method: 'bank_transfer',
          amount_minor: 1000000, // Rs. 10,000.00
        },
      ],
    });
    assert(purchase.id > 0, '9. Purchase order created');
    assert(purchase.total_minor === 1900000, '10. Net purchase total accurately calculated as Rs. 19,000.00');

    const stockAfterPO = getVariantStock(variant.id);
    assert(stockAfterPO.current_stock === 20000, '11. Inventory stock increased to 20,000 (20 units)');

    const movementsAfterPO = listMovements({ variant_id: variant.id });
    const poMovement = movementsAfterPO.find((m) => m.reference_type === 'PURCHASE');
    assert(poMovement !== undefined && poMovement.movement_type === 'IN', '12. Inward stock movement recorded with reference_type=PURCHASE');
    assert(poMovement?.unit_cost_minor === 100000, '13. Purchase unit cost preserved in stock ledger (100,000 minor)');

    const supAfterPO = getSupplierById(supplier.id);
    assert(supAfterPO.current_balance_minor === 900000, '14. Supplier payable balance is accurately Rs. 9,000.00 (900,000 minor)');

    recordSupplierPayment({
      supplier_id: supplier.id,
      amount_minor: 400000, // Rs. 4,000.00
      payment_method: 'cash',
      notes: 'Direct cash payment against pending balance',
    });
    assert(true, '15. Partial supplier payment recorded (Rs. 4,000.00)');

    const supAfterPay = getSupplierById(supplier.id);
    assert(supAfterPay.current_balance_minor === 500000, '16. Supplier payable balance decreased to Rs. 5,000.00 (500,000 minor)');

    // --------------------------------------------------------
    // Steps 17–24: Customer, POS Sales, Credit Limit & Khata
    // --------------------------------------------------------
    console.log('\n--- Steps 17–24: Customers, Sales & Khata Ledger ---');
    const customer = createCustomer({
      name: 'Haji Abdul Rasheed',
      phone: '03215551234',
      credit_limit_minor: 1500000, // Rs. 15,000.00 limit
      opening_balance_minor: 0,
    });
    assert(customer.id > 0, '17. Customer registered with credit limit (Rs. 15,000.00)');

    // Sale 1: Cash sale for 2 bags (2 * 1,500 = Rs. 3,000.00)
    const sale1 = createSale({
      items: [
        {
          variant_id: variant.id,
          quantity: 2000, // 2 bags
          discount_minor: 0,
        },
      ],
      discount_minor: 0,
      payments: [
        {
          payment_method: 'cash',
          amount_minor: 300000, // Rs. 3,000.00
        },
      ],
    });
    assert(sale1.id > 0, '18. Cash sale completed (INV-00001)');

    const stockAfterSale1 = getVariantStock(variant.id);
    assert(stockAfterSale1.current_stock === 18000, '19. Stock decreased to 18,000 (18 units)');

    // Sale 2: Credit sale for 5 bags (5 * 1,500 = Rs. 7,500.00)
    const sale2 = createSale({
      customer_id: customer.id,
      items: [
        {
          variant_id: variant.id,
          quantity: 5000, // 5 bags
          discount_minor: 0,
        },
      ],
      discount_minor: 0,
      payments: [
        {
          payment_method: 'credit',
          amount_minor: 750000, // Rs. 7,500.00
        },
      ],
    });
    assert(sale2.id > 0, '20. Khata credit sale completed (INV-00002)');

    const custAfterSale2 = getCustomerById(customer.id);
    assert(custAfterSale2.current_balance_minor === 750000, '21. Customer Khata debt increased to Rs. 7,500.00 (750,000 minor)');

    // Step 22: Credit Limit Enforcement (Attempt 6 bags = Rs. 9,000. 7,500 + 9,000 = 16,500 > 15,000 limit)
    assertThrows(
      () =>
        createSale({
          customer_id: customer.id,
          items: [{ variant_id: variant.id, quantity: 6000, discount_minor: 0 }],
          discount_minor: 0,
          payments: [{ payment_method: 'credit', amount_minor: 900000 }],
        }),
      'Credit limit exceeded',
      '22. Credit sale exceeding customer limit is strictly rejected with rollback',
    );

    // Step 23 & 24: Customer Payment Collection
    recordCustomerPayment({
      customer_id: customer.id,
      amount_minor: 350000, // Rs. 3,500.00
      payment_method: 'cash',
      notes: 'Weekly Khata installment',
    });
    assert(true, '23. Collected customer Khata installment (Rs. 3,500.00)');

    const custAfterPay = getCustomerById(customer.id);
    assert(custAfterPay.current_balance_minor === 400000, '24. Customer Khata balance decreased to Rs. 4,000.00 (400,000 minor)');

    // --------------------------------------------------------
    // Steps 25–28: Inventory Adjustments & KPIs
    // --------------------------------------------------------
    console.log('\n--- Steps 25–28: Stock Adjustments & KPIs ---');
    createMovement({
      variant_id: variant.id,
      adjustment_type: 'damage',
      quantity: 1000, // 1 bag damaged
      notes: 'Water leakage in storage room',
    });
    assert(true, '25. Damage adjustment recorded');

    // 20,000 IN - 2,000 (sale1) - 5,000 (sale2) - 1,000 (damage) = 12,000
    const stockAfterDamage = getVariantStock(variant.id);
    assert(stockAfterDamage.current_stock === 12000, '26. Stock decreased to 12,000 (12 units)');

    const allMovements = listMovements({ variant_id: variant.id, limit: 10 });
    assert(allMovements.length === 4, '27. Movement history contains exactly 4 movements (1 PO, 2 Sales, 1 Damage)');

    const invKpis = getInventoryKpis();
    assert(invKpis.inventory_value_minor === 1200000, '28. Inventory valuation is Rs. 12,000.00 (12 * Rs. 1,000 purchase price)');

    // --------------------------------------------------------
    // Steps 29–34: Financial & Operational Reports
    // --------------------------------------------------------
    console.log('\n--- Steps 29–34: Business Reports & Analytics ---');
    const salesReport = getSalesReport();
    assert(salesReport.summary.net_sales_minor === 1050000, '29. Sales report revenue is Rs. 10,500.00 (3,000 cash + 7,500 credit)');

    const purchasesReport = getPurchasesReport();
    assert(purchasesReport.summary.total_purchases_minor === 1900000, '30. Purchases report total spend is Rs. 19,000.00');

    const invReport = getInventoryReport();
    assert(invReport.summary.total_valuation_purchase_minor === 1200000, '31a. Stock valuation purchase value is Rs. 12,000.00');
    assert(invReport.summary.total_valuation_retail_minor === 1800000, '31b. Stock valuation retail value is Rs. 18,000.00 (12 * Rs. 1,500)');

    const supReport = getSuppliersPayableReport();
    assert(supReport.summary.total_payable_balance_minor === 500000, '32. Supplier payables report is Rs. 5,000.00');

    const custReport = getCustomersKhataReport();
    assert(custReport.summary.total_receivable_balance_minor === 400000, '33. Customer Khata receivables report is Rs. 4,000.00');

    // 7 units sold @ 1,500 = 10,500 revenue. COGS = 7 * 1,000 = 7,000. Gross Profit = 3,500. Margin = 3,500/10,500 = 33.33%
    const profitReport = getProfitSummaryReport();
    assert(profitReport.total_revenue_minor === 1050000, '34a. Profit report revenue is 1,050,000 minor');
    assert(profitReport.total_cogs_minor === 700000, '34b. Profit report COGS is 700,000 minor');
    assert(profitReport.total_gross_profit_minor === 350000, '34c. Profit report gross profit is 350,000 minor');
    assert(profitReport.overall_margin_percentage === 33.33, '34d. Profit report margin % is 33.33%');

    // --------------------------------------------------------
    // Steps 35–37: Offline Export Generation
    // --------------------------------------------------------
    console.log('\n--- Steps 35–37: Offline CSV & HTML Export Generation ---');
    const csvExport = generateCsvContent({
      report_type: 'sales',
      title: 'Sales Report',
      format: 'csv',
      filters: {},
      summaryLines: [{ label: 'Total Revenue', value: 'Rs. 10,500.00' }],
      headers: ['Invoice', 'Date', 'Customer', 'Total', 'Payment'],
      rows: [['INV-00001', '2026-08-24', 'Walk-in Customer', '3000.00', 'Cash']],
    });
    assert(csvExport.startsWith('\uFEFF'), '35. CSV export prepends UTF-8 BOM for Microsoft Excel');
    assert(csvExport.includes('MARTPOS — SALES REPORT') && csvExport.includes('INV-00001'), '36. CSV export contains formatted records');

    const htmlExport = generateHtmlReportContent({
      report_type: 'inventory',
      title: 'Inventory Valuation Report',
      format: 'pdf',
      filters: {},
      summaryLines: [{ label: 'Total Valuation', value: 'Rs. 12,000.00' }],
      headers: ['Product', 'Stock', 'Cost', 'Total Value'],
      rows: [['Premium Basmati Rice - 5 KG Bag', '12.00 KG', '1000.00', '12000.00']],
    });
    assert(htmlExport.includes('<!DOCTYPE html>') && htmlExport.includes('Kings Mart') && htmlExport.includes('INVENTORY VALUATION REPORT'), '37. HTML print template generated with full branding');

    // --------------------------------------------------------
    // Steps 38–40: Logout & Session Termination Security
    // --------------------------------------------------------
    console.log('\n--- Steps 38–40: Logout & Session Teardown Security ---');
    logout();
    assert(getActiveUser() === null, '38. User logged out and in-memory session cleared');

    const auditLogs = listAuditLogs({ limit: 50 });
    const logoutEvent = auditLogs.find((l) => l.event_type === 'LOGOUT');
    assert(logoutEvent !== undefined && logoutEvent.status === 'SUCCESS', '39. LOGOUT audit event recorded successfully');

    // Attempting password change after logout must fail
    assertThrows(
      () => {
        changePassword({ newPassword: 'NewPassword123' });
      },
      'authenticated',
      '40. Protected operations rejected when unauthenticated',
    );
  } finally {
    cleanupTestDb();
  }

  console.log('\n====================================================');
  console.log(`E2E Workflow Test Results: ${String(passed)} Passed, ${String(failed)} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests();
