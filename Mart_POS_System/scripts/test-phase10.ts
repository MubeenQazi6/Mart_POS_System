/**
 * MARTPOS Phase 10 Automated Test Suite
 *
 * Tests:
 * 1. Sales report calculations (subtotal, discount, tax, total, payment methods)
 * 2. Purchases report calculations (orders count, total value, paid, balance)
 * 3. Inventory valuation report (stock counts, purchase valuation, retail valuation)
 * 4. Stock movement ledger report (inward vs outward movements)
 * 5. Supplier payables report (opening, purchases, current payables)
 * 6. Customer Khata report (opening, credit debt, limit)
 * 7. Profit summary report (revenue, COGS, gross profit, margin %)
 * 8. Date and entity filtering
 * 9. Offline report export generator (RFC 4180 CSV with BOM, Print HTML template)
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSale } from '../src/repositories/sales';
import { createPurchase } from '../src/repositories/purchases';
import { createSupplier } from '../src/repositories/suppliers';
import { createCustomer } from '../src/repositories/customers';
import {
  getSalesReport,
  getPurchasesReport,
  getInventoryReport,
  getStockMovementReport,
  getSuppliersPayableReport,
  getCustomersKhataReport,
  getProfitSummaryReport,
} from '../src/repositories/reports';
import { generateCsvContent, generateHtmlReportContent } from '../src/main/services/exportGenerators';
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

function setupTestDb(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  testDbPath = path.join(tempDir, `martpos-test-phase10-${String(Date.now())}.db`);

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

function runPhase10Tests(): void {
  console.log('====================================================');
  console.log('MARTPOS Phase 10 Automated Test Suite (Isolated DB)');
  console.log('====================================================');

  setupTestDb();

  try {
    // ======================================================
    // Setup Fixtures: Catalog, Supplier, Customer, Stock, Sales
    // ======================================================
    console.log('\n--- Setup: Seeding Test Data ---');
    const cat = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const prod1 = createProduct({
      name: 'Basmati Rice 5kg',
      category_id: cat.id,
      variants: [
        {
          variant_name: '5 KG Bag',
          unit_id: unit.id,
          purchase_price_minor: 100000, // Rs. 1,000.00
          selling_price_minor: 150000,  // Rs. 1,500.00
          sku: 'RICE-5KG',
          min_stock_alert: 5000,
        },
      ],
    });
    const vRice = prod1.variants?.[0];
    if (!vRice) throw new Error('Failed to create Rice variant');

    const prod2 = createProduct({
      name: 'Cooking Oil 1L',
      category_id: cat.id,
      variants: [
        {
          variant_name: '1 Liter Bottle',
          unit_id: unit.id,
          purchase_price_minor: 40000,  // Rs. 400.00
          selling_price_minor: 55000,   // Rs. 550.00
          sku: 'OIL-1L',
          min_stock_alert: 2000,
        },
      ],
    });
    const vOil = prod2.variants?.[0];
    if (!vOil) throw new Error('Failed to create Oil variant');

    // Supplier & Purchase
    const sup = createSupplier({
      name: 'Sunrise Foods',
      opening_balance_minor: 50000, // Rs. 500.00
    });

    const purchase = createPurchase({
      supplier_id: sup.id,
      items: [
        { variant_id: vRice.id, quantity: 20000, unit_cost_minor: 100000 }, // 20 bags = 2,000,000
        { variant_id: vOil.id, quantity: 50000, unit_cost_minor: 40000 },    // 50 bottles = 2,000,000
      ],
      discount_minor: 100000, // Rs. 1,000.00 discount
      tax_minor: 0,
      payments: [{ payment_method: 'bank_transfer', amount_minor: 2000000 }], // 2M paid, 1.9M balance
    });
    assert(purchase.id > 0, 'Setup: Purchase order created');

    // Customer
    const cust = createCustomer({
      name: 'Tariq Mehmood',
      phone: '03001234567',
      credit_limit_minor: 500000,
      opening_balance_minor: 0,
    });

    // Sale 1: Cash sale for 2 Rice bags (2 * 1,500 = 3,000)
    const sale1 = createSale({
      items: [{ variant_id: vRice.id, quantity: 2000, discount_minor: 0 }],
      discount_minor: 0,
      payments: [{ payment_method: 'cash', amount_minor: 300000 }],
    });
    assert(sale1.id > 0, 'Setup: Cash sale created');

    // Sale 2: Credit sale for 5 Oil bottles (5 * 550 = 2,750)
    const sale2 = createSale({
      customer_id: cust.id,
      items: [{ variant_id: vOil.id, quantity: 5000, discount_minor: 0 }],
      discount_minor: 0,
      payments: [{ payment_method: 'credit', amount_minor: 275000 }],
    });
    assert(sale2.id > 0, 'Setup: Credit sale created');

    // ======================================================
    // 1. Sales Report
    // ======================================================
    console.log('\n--- 1. Sales Report ---');
    const salesReport = getSalesReport();
    assert(salesReport.summary.total_sales_count === 2, '1. Sales report counts 2 invoices');
    assert(salesReport.summary.net_sales_minor === 575000, '1a. Net sales revenue accurately 575,000 minor (300k + 275k)');
    assert(salesReport.summary.cash_collected_minor === 300000, '1b. Cash collected is 300,000');
    assert(salesReport.summary.credit_generated_minor === 275000, '1c. Khata credit generated is 275,000');

    // Filter by payment method
    const cashSalesReport = getSalesReport({ payment_method: 'cash' });
    assert(cashSalesReport.summary.total_sales_count === 1, '1d. Payment method filter returns only cash sales');

    // ======================================================
    // 2. Purchases Report
    // ======================================================
    console.log('\n--- 2. Purchases Report ---');
    const purchasesReport = getPurchasesReport();
    assert(purchasesReport.summary.total_purchases_count === 1, '2. Purchases report counts 1 order');
    assert(purchasesReport.summary.total_purchases_minor === 3900000, '2a. Total purchases value is 3,900,000');
    assert(purchasesReport.summary.total_paid_minor === 2000000, '2b. Paid amount is 2,000,000');
    assert(purchasesReport.summary.total_balance_minor === 1900000, '2c. Payables balance is 1,900,000');

    // ======================================================
    // 3. Inventory Valuation Report
    // ======================================================
    console.log('\n--- 3. Inventory Valuation Report ---');
    // Rice stock: 20 - 2 = 18 bags = 18,000 qty. Purchase cost = 1,000. Valuation = 18 * 1,000 = 18,000.
    // Oil stock: 50 - 5 = 45 bottles = 45,000 qty. Purchase cost = 400. Valuation = 45 * 400 = 18,000.
    // Total Purchase Valuation = 36,000 Rs (3,600,000 minor)
    const invReport = getInventoryReport();
    assert(invReport.summary.total_items_count === 2, '3. Inventory report contains 2 variants');
    assert(invReport.summary.total_in_stock_items === 2, '3a. Both items are in stock');
    assert(invReport.summary.total_valuation_purchase_minor === 3600000, '3b. Total purchase valuation is 3,600,000 minor');
    assert(invReport.summary.total_valuation_retail_minor === 5175000, '3c. Total retail valuation is 5,175,000 minor (18*1500 + 45*550)');

    // ======================================================
    // 4. Stock Movement Report
    // ======================================================
    console.log('\n--- 4. Stock Movement Report ---');
    const movReport = getStockMovementReport();
    assert(movReport.summary.total_movements_count === 4, '4. Total movements is 4 (2 inward from PO, 2 outward from Sales)');
    assert(movReport.summary.total_in_movements === 2, '4a. 2 inward movements');
    assert(movReport.summary.total_out_movements === 2, '4b. 2 outward movements');
    assert(movReport.summary.total_in_quantity === 70000, '4c. Total inward quantity is 70,000');
    assert(movReport.summary.total_out_quantity === 7000, '4d. Total outward quantity is 7,000');

    // ======================================================
    // 5. Supplier Payables Report
    // ======================================================
    console.log('\n--- 5. Supplier Payables Report ---');
    // Opening 50,000 + unpaid balance 1,900,000 = 1,950,000
    const supReport = getSuppliersPayableReport();
    assert(supReport.summary.total_suppliers_count === 1, '5. 1 supplier returned');
    assert(supReport.summary.total_payable_balance_minor === 1950000, '5a. Total payable balance is 1,950,000 minor');

    // ======================================================
    // 6. Customers Khata Report
    // ======================================================
    console.log('\n--- 6. Customers Khata Report ---');
    const custReport = getCustomersKhataReport();
    assert(custReport.summary.total_customers_count === 1, '6. 1 customer returned');
    assert(custReport.summary.total_receivable_balance_minor === 275000, '6a. Total Khata debt is 275,000 minor');

    // ======================================================
    // 7. Profit & Margins Report
    // ======================================================
    console.log('\n--- 7. Profit & Margins Report ---');
    // Sale 1: 2 Rice sold @ 1,500 = 3,000 revenue. COGS = 2 * 1,000 = 2,000. Profit = 1,000.
    // Sale 2: 5 Oil sold @ 550 = 2,750 revenue. COGS = 5 * 400 = 2,000. Profit = 750.
    // Total Revenue = 5,750. Total COGS = 4,000. Total Gross Profit = 1,750 Rs (175,000 minor).
    // Margin = (1,750 / 5,750) * 100 = 30.43%
    const profitReport = getProfitSummaryReport();
    assert(profitReport.total_revenue_minor === 575000, '7. Total revenue is 575,000 minor');
    assert(profitReport.total_cogs_minor === 400000, '7a. Total COGS is 400,000 minor');
    assert(profitReport.total_gross_profit_minor === 175000, '7b. Total gross profit is 175,000 minor');
    assert(profitReport.overall_margin_percentage === 30.43, '7c. Overall gross margin is accurately 30.43%');

    // ======================================================
    // 8. Offline Export Formatting
    // ======================================================
    console.log('\n--- 8. Offline Export Formatting ---');
    const csvOutput = generateCsvContent({
      report_type: 'sales',
      format: 'csv',
      title: 'Sales Report',
      filters: {},
      headers: ['Invoice #', 'Total'],
      rows: [['INV-00001', '3000.00'], ['INV-00002', '2750.00']],
      summaryLines: [{ label: 'Total Invoices', value: '2' }],
    });
    assert(csvOutput.startsWith('\uFEFF'), '8. CSV output contains UTF-8 BOM for Microsoft Excel');
    assert(csvOutput.includes('MARTPOS — SALES REPORT'), '8a. CSV contains brand header');
    assert(csvOutput.includes('INV-00001'), '8b. CSV contains row data');

    const htmlOutput = generateHtmlReportContent({
      report_type: 'profit_summary',
      format: 'pdf',
      title: 'Profit and Margin Summary',
      filters: {},
      headers: ['Product', 'Gross Profit'],
      rows: [['Basmati Rice', '1000.00']],
    });
    assert(htmlOutput.includes('<!DOCTYPE html>'), '9. HTML print template generated');
    assert(htmlOutput.includes('MARTPOS — Profit and Margin Summary'), '9a. HTML contains MARTPOS branding');
    assert(htmlOutput.includes('Basmati Rice'), '9b. HTML contains tabular records');
  } finally {
    cleanupTestDb();
  }

  console.log('\n====================================================');
  console.log(`Phase 10 Test Results: ${String(passed)} Passed, ${String(failed)} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests();
