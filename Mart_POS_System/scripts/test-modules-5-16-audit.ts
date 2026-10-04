import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct, addBarcode } from '../src/repositories/products';
import { createSupplier } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { generateHtmlReportContent, generateCsvContent } from '../src/main/services/exportGenerators';
import { listNotifications, dismissNotification, undismissNotification } from '../src/repositories/notifications';
import { createPrintJob, listPrintJobs, updatePrintJobStatus } from '../src/repositories/barcode-jobs';
import { createExpenseCategory, createExpense, listExpenses, voidExpense } from '../src/repositories/expenses';
import { openCashSession, getCurrentCashSession } from '../src/repositories/cash';
import { getSalesReport, getInventoryReport, getProfitSummaryReport } from '../src/repositories/reports';
import type { ExportReportInput } from '../src/shared/types/reports';
import path from 'node:path';
import fs from 'node:fs';

let dbPath = '';
let rawDb: Database.Database | null = null;
let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: boolean, message: string): void {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function setup(): void {
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-mod5-16-audit-${Date.now()}.db`);
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

async function runAuditTests(): Promise<void> {
  console.log('=== Starting Modules 5-16 Functional & Database Audit Tests ===\n');
  setup();

  try {
    // 0. Base Fixtures Setup
    const cat = createCategory({ name: 'General Grocery' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pcs', decimals: 0 });
    const sup = createSupplier({ name: 'Alpha Traders', phone: '03001234567', opening_balance_minor: 0 });
    const cust = createCustomer({ name: 'Walk-in Customer', phone: '03120000000', credit_limit_minor: 5000000 });

    const prod = createProduct({
      name: 'Nestle Milkpak 1L',
      category_id: cat.id,
      variants: [{
        variant_name: 'Standard Pack',
        sku: 'MLK-1L',
        unit_id: unit.id,
        purchase_price_minor: 25000,
        selling_price_minor: 29000,
        min_stock_alert: 5000,
      }],
    });
    const variantId = prod.variants?.[0]?.id;
    if (!variantId) throw new Error('Variant not created');
    const barcodeRow = addBarcode({ variant_id: variantId, barcode: '8964000123456', barcode_type: 'EAN13', is_primary: true });

    // Open cash session
    openCashSession({ opening_cash_minor: 1000000, business_date: '2026-08-30' });

    // Create a purchase & sale to populate data
    createPurchase({
      supplier_id: sup.id,
      items: [{ variant_id: variantId, quantity: 20000, unit_cost_minor: 25000 }],
      payments: [{ payment_method: 'cash', amount_minor: 500000 }],
    });

    createSale({
      customer_id: cust.id,
      discount_minor: 0,
      items: [{ variant_id: variantId, quantity: 2000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 58000 }],
    });

    // 1. Report Generation & Branding Test (Module 14)
    console.log('--- 1. Testing Reports PDF/HTML Content & Branding (Module 14) ---');
    const sampleInput: ExportReportInput = {
      report_type: 'sales',
      title: 'sales_summary_report',
      format: 'pdf',
      headers: ['Invoice #', 'Date', 'Total Amount', 'Status'],
      rows: [['INV-00001', '2026-08-30', 'Rs. 580.00', 'completed']],
      summaryLines: [
        { label: 'Total Invoices', value: '1' },
        { label: 'Net Sales', value: 'Rs. 580.00' },
      ],
      filters: { date_from: '2026-08-01', date_to: '2026-08-30', payment_method: 'cash' },
    };

    const htmlContent = generateHtmlReportContent(sampleInput);
    assert(htmlContent.includes('Kings Mart POS'), 'HTML report includes Kings Mart POS branding');
    assert(htmlContent.includes('Zenthropic Technologies'), 'HTML report includes Zenthropic Technologies attribution');
    assert(htmlContent.includes('INV-00001'), 'HTML report includes actual invoice data');
    assert(htmlContent.includes('Total Invoices'), 'HTML report includes metric summary lines');
    assert(htmlContent.includes('page-break-inside: avoid'), 'HTML report includes print pagination rules');

    const csvContent = generateCsvContent(sampleInput);
    assert(csvContent.includes('INV-00001'), 'CSV report includes table rows');
    assert(csvContent.startsWith('\uFEFF'), 'CSV report includes UTF-8 BOM');

    // Verify real DB report queries execute without error
    const salesRep = getSalesReport();
    assert(typeof salesRep.summary.net_sales_minor === 'number', 'Authoritative sales report query returned data');
    const invRep = getInventoryReport();
    assert(Array.isArray(invRep.rows), 'Authoritative inventory report query returned rows');
    const profRep = getProfitSummaryReport();
    assert(typeof profRep.total_gross_profit_minor === 'number', 'Authoritative profit summary query returned data');

    // 2. Barcode Print Jobs DB Persistence Test (Module 15)
    console.log('\n--- 2. Testing Barcode Print Jobs & Stickers DB Persistence (Module 15) ---');
    const job = createPrintJob({
      variant_id: variantId,
      barcode_id: barcodeRow.id,
      quantity: 25,
    });
    assert(job.id > 0, `Created barcode print job with ID #${job.id}`);
    assert(job.quantity === 25, 'Print job quantity correctly set to 25');
    assert(job.status === 'pending', 'Initial status is pending');

    const updatedJob = updatePrintJobStatus(job.id, 'printed');
    assert(updatedJob.status === 'printed', 'Updated print job status to printed');

    const allJobs = listPrintJobs();
    assert(allJobs.some((j) => j.id === job.id && j.status === 'printed'), 'Persisted print job listed in print queue');

    // 3. Notifications Dismissal & Persistence Test (Module 16)
    console.log('\n--- 3. Testing Notifications Dismissal & Persistent Filtering (Module 16) ---');
    const activeNotifs = listNotifications({ dismissed: false });
    assert(Array.isArray(activeNotifs), 'Listed active notifications');

    if (activeNotifs.length > 0 && activeNotifs[0]) {
      const targetId = activeNotifs[0].id;
      dismissNotification(targetId);

      const postDismissActive = listNotifications({ dismissed: false });
      assert(!postDismissActive.some((n) => n.id === targetId), 'Dismissed notification excluded from active list');

      const dismissedList = listNotifications({ dismissed: true });
      assert(dismissedList.some((n) => n.id === targetId), 'Dismissed notification included in dismissed list');

      // Un-dismiss / restore
      undismissNotification(targetId);
      const restoredActive = listNotifications({ dismissed: false });
      assert(restoredActive.some((n) => n.id === targetId), 'Restored notification back in active list');
    }

    // 4. Expenses & Cash Outflow Integrity (Module 12 & 13)
    console.log('\n--- 4. Testing Expenses & Cash Movements Integration (Modules 12 & 13) ---');
    const activeSession = getCurrentCashSession();
    assert(Boolean(activeSession), 'Active cash session confirmed');

    // Create test expense category
    const testCatName = `Office Utilities ${Date.now()}`;
    const expCat = createExpenseCategory({ name: testCatName, description: 'Test category' });
    assert(expCat.id > 0, `Created expense category: ${expCat.name}`);

    // Create cash expense
    const exp = createExpense({
      category_id: expCat.id,
      amount_minor: 250000, // Rs. 2,500
      payment_method: 'cash',
      description: 'Tea and coffee supplies',
    });
    assert(exp.id > 0, `Created expense #${exp.expense_number}`);
    assert(exp.amount_minor === 250000, 'Expense amount persisted accurately');

    // Check that expense appears in expense list
    const expList = listExpenses({ category_id: expCat.id });
    assert(expList.some((e) => e.id === exp.id), 'Expense found in DB query');

    // Void expense
    const voided = voidExpense(exp.id);
    assert(voided.status === 'VOIDED', 'Expense successfully voided and audited');

    console.log(`\n==================================================`);
    console.log(`All ${passedAssertions}/${totalAssertions} audit assertions passed successfully!`);
    console.log(`==================================================\n`);
  } finally {
    cleanup();
  }
}

runAuditTests()
  .catch((err) => {
    console.error('Audit test run failed:', err);
    process.exit(1);
  });
