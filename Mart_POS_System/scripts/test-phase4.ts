import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, unlinkSync } from 'node:fs';
import {
  calculateEAN13CheckDigit,
  generateInternalBarcode,
  validateEAN13,
} from '../src/domain/barcode';
import {
  generateInternalBarcodeForVariant,
  createPrintJob,
  listPrintJobs,
  updatePrintJobStatus,
  retryFailedJob,
  deletePrintedJobs,
} from '../src/repositories/barcode-jobs';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct, getProductById } from '../src/repositories/products';
import * as dbClient from '../src/database/client/index';

const testDbPath = join(tmpdir(), `martpos-test-phase4-${Date.now().toString()}.db`);

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failedTests++;
  }
}

function runTests(): void {
  console.log('====================================================');
  console.log('MARTPOS Phase 4 Automated Test Suite (Isolated DB)');
  console.log('====================================================\n');

  // Initialize isolated database
  console.log(`[Setup] Creating isolated test database at: ${testDbPath}`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
  migrate(db, { migrationsFolder });

  // Hook dbClient with our test db instance
  dbClient.setDb(db);

  try {
    // --- PART 1: PURE DOMAIN LOGIC TESTS ---
    console.log('\n--- 1. EAN-13 Domain Logic Tests ---');

    // Test 1: Length & Prefix
    const code1 = generateInternalBarcode(1);
    assert(code1.length === 13 && code1.startsWith('29'), '1. EAN-13 generation length is exactly 13 digits with prefix 29');

    // Test 2: Numeric Only
    assert(/^\d{13}$/.test(code1), '2. Barcode is numeric-only');

    // Test 3: Correct Checksum Calculation
    const payload12 = code1.slice(0, 12);
    const checkDigit = calculateEAN13CheckDigit(payload12);
    assert(code1[12] === checkDigit, '3. EAN-13 check digit is calculated accurately');

    // Test 4: EAN-13 Validation Valid Case
    assert(validateEAN13(code1), '4. validateEAN13 returns true for valid generated barcode');

    // Test 5: EAN-13 Validation Invalid Check Digit
    const invalidChecksumCode = code1.slice(0, 12) + (code1[12] === '0' ? '1' : '0');
    assert(!validateEAN13(invalidChecksumCode), '5. validateEAN13 detects invalid check digit');

    // Test 6: EAN-13 Validation Short Length
    assert(!validateEAN13('12345'), '6. validateEAN13 rejects short barcode');

    // Test 7: EAN-13 Validation Alphanumeric
    assert(!validateEAN13('290000000001A'), '7. validateEAN13 rejects alphanumeric characters');

    // Test 8: Sequence boundary validation <= 0
    let boundaryErrorThrown = false;
    try {
      generateInternalBarcode(0);
    } catch {
      boundaryErrorThrown = true;
    }
    assert(boundaryErrorThrown, '8. generateInternalBarcode rejects sequence <= 0');

    // Test 9: Sequence boundary validation > MAX_SEQUENCE
    let overflowErrorThrown = false;
    try {
      generateInternalBarcode(10_000_000_000);
    } catch {
      overflowErrorThrown = true;
    }
    assert(overflowErrorThrown, '9. generateInternalBarcode rejects sequence > 9,999,999,999');

    // --- PART 2: DATABASE & REPOSITORY OPERATIONS ---
    console.log('\n--- 2. Database & Repository Operations ---');

    // Setup Master Data
    const category = createCategory({ name: 'Groceries' });
    const kgUnit = createUnit({ name: 'Kilogram', abbreviation: 'KG', decimals: 3 });
    const pcUnit = createUnit({ name: 'Piece', abbreviation: 'PC', decimals: 0 });

    // Create Sample Realistic Products
    const sugar = createProduct({
      name: 'Sugar',
      category_id: category.id,
      variants: [
        { variant_name: '1 KG', unit_id: kgUnit.id, purchase_price_minor: 14000, selling_price_minor: 16000, sku: 'SUGAR-1KG' },
        { variant_name: '2 KG', unit_id: kgUnit.id, purchase_price_minor: 27500, selling_price_minor: 31000, sku: 'SUGAR-2KG' },
        { variant_name: '5 KG', unit_id: kgUnit.id, purchase_price_minor: 68000, selling_price_minor: 75000, sku: 'SUGAR-5KG' },
      ],
    });

    const coke = createProduct({
      name: 'Coca Cola',
      category_id: category.id,
      variants: [
        { variant_name: '250 ML', unit_id: pcUnit.id, purchase_price_minor: 4000, selling_price_minor: 5000, sku: 'COKE-250ML' },
        { variant_name: '500 ML', unit_id: pcUnit.id, purchase_price_minor: 7500, selling_price_minor: 9000, sku: 'COKE-500ML' },
        { variant_name: '1.5 LTR', unit_id: pcUnit.id, purchase_price_minor: 15000, selling_price_minor: 18000, sku: 'COKE-15L' },
      ],
    });

    const kitkat = createProduct({
      name: 'KitKat Chocolate',
      category_id: category.id,
      variants: [
        { variant_name: 'Single', unit_id: pcUnit.id, purchase_price_minor: 8000, selling_price_minor: 10000, sku: 'KITKAT-1' },
        { variant_name: 'Pack of 6', unit_id: pcUnit.id, purchase_price_minor: 45000, selling_price_minor: 55000, sku: 'KITKAT-6' },
        { variant_name: 'Box of 24', unit_id: pcUnit.id, purchase_price_minor: 175000, selling_price_minor: 210000, sku: 'KITKAT-24' },
      ],
    });
    if (
      !sugar.variants ||
      !sugar.variants[0] ||
      !sugar.variants[1] ||
      !coke.variants ||
      !coke.variants[0] ||
      !kitkat.variants ||
      !kitkat.variants[0]
    ) {
      throw new Error('Test variants setup failed');
    }

    const sugar1Kg = sugar.variants[0];
    const sugar2Kg = sugar.variants[1];
    const coke250 = coke.variants[0];
    const kitkatSingle = kitkat.variants[0];

    // Test 10: Generate Internal Barcode for Variant
    const barcodeSugar1 = generateInternalBarcodeForVariant(sugar1Kg.id);
    assert(
      barcodeSugar1.barcode.length === 13 && barcodeSugar1.barcode_type === 'INTERNAL',
      '10. Internal barcode generated and associated with variant'
    );

    // Test 11: Multiple Variants receive unique and distinct barcodes
    const barcodeSugar2 = generateInternalBarcodeForVariant(sugar2Kg.id);
    const barcodeCoke250 = generateInternalBarcodeForVariant(coke250.id);
    assert(
      barcodeSugar1.barcode !== barcodeSugar2.barcode &&
        barcodeSugar2.barcode !== barcodeCoke250.barcode,
      '11. Different variants receive unique barcodes'
    );

    // Test 12: Duplicate Internal Barcode for Same Variant Prevented
    let duplicatePrevented = false;
    try {
      generateInternalBarcodeForVariant(sugar1Kg.id);
    } catch (e) {
      if (e instanceof Error && e.message.includes('already has an active internal barcode')) {
        duplicatePrevented = true;
      }
    }
    assert(duplicatePrevented, '12. Duplicate internal barcode generation for same variant is prevented');

    // Test 13: Invalid Variant ID Rejection
    let invalidVariantRejected = false;
    try {
      generateInternalBarcodeForVariant(99999);
    } catch {
      invalidVariantRejected = true;
    }
    assert(invalidVariantRejected, '13. Generate barcode for non-existent variant is rejected');

    // Test 14: Barcode Uniqueness Constraint at Database Level
    let dbUniqueConstraintEnforced = false;
    try {
      // Force insert duplicate barcode
      db.insert(schema.productBarcodes)
        .values({
          variant_id: sugar2Kg.id,
          barcode: barcodeSugar1.barcode,
          barcode_type: 'INTERNAL',
          is_active: true,
        })
        .run();
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
        dbUniqueConstraintEnforced = true;
      }
    }
    assert(dbUniqueConstraintEnforced, '14. Database-level UNIQUE constraint on barcode column enforced');

    // --- PART 3: PRINT QUEUE TESTS ---
    console.log('\n--- 3. Print Job Queue Operations ---');

    // Test 15: Create Print Job
    const job1 = createPrintJob({
      variant_id: sugar1Kg.id,
      barcode_id: barcodeSugar1.id,
      quantity: 50,
    });
    assert(
      job1.id > 0 && job1.quantity === 50 && job1.status === 'pending',
      '15. Print job created with status pending and quantity 50'
    );

    // Test 16: Print Job Quantity Validation (0)
    let qtyZeroRejected = false;
    try {
      createPrintJob({
        variant_id: sugar1Kg.id,
        barcode_id: barcodeSugar1.id,
        quantity: 0,
      });
    } catch {
      qtyZeroRejected = true;
    }
    assert(qtyZeroRejected, '16. Quantity 0 is rejected');

    // Test 17: Print Job Quantity Validation (negative)
    let negQtyRejected = false;
    try {
      createPrintJob({
        variant_id: sugar1Kg.id,
        barcode_id: barcodeSugar1.id,
        quantity: -10,
      });
    } catch {
      negQtyRejected = true;
    }
    assert(negQtyRejected, '17. Negative quantity is rejected');

    // Test 18: Missing / Mismatched Barcode Rejection
    let mismatchedBarcodeRejected = false;
    try {
      createPrintJob({
        variant_id: sugar1Kg.id,
        barcode_id: barcodeSugar2.id, // belongs to 2KG, not 1KG
        quantity: 10,
      });
    } catch {
      mismatchedBarcodeRejected = true;
    }
    assert(mismatchedBarcodeRejected, '18. Mismatched variant and barcode is rejected');

    // Test 19: List Print Jobs with Search and Filters
    const allJobs = listPrintJobs();
    assert(allJobs.length >= 1, '19. listPrintJobs returns created jobs with joined product/variant details');
    
    // Test 20: Joined product_name is accurately resolved
    if (allJobs[0]) {
      assert(allJobs[0].product_name === 'Sugar', '20. Joined product_name is accurately resolved');
    }

    // Test 21: Status Transition pending -> printed
    const printedJob = updatePrintJobStatus(job1.id, 'printed');
    assert(printedJob.status === 'printed', '21. Status transition from pending to printed succeeds');

    // Test 22: Status Transition pending -> failed
    const job2 = createPrintJob({
      variant_id: sugar2Kg.id,
      barcode_id: barcodeSugar2.id,
      quantity: 20,
    });
    const failedJob = updatePrintJobStatus(job2.id, 'failed');
    assert(failedJob.status === 'failed', '22. Status transition from pending to failed succeeds');

    // Test 23: Status Transition failed -> pending (Retry)
    const retriedJob = retryFailedJob(job2.id);
    assert(retriedJob.status === 'pending', '23. Retry failed job transitions status back to pending');

    // Test 24: Disallowed Status Transitions
    let invalidTransitionRejected = false;
    try {
      updatePrintJobStatus(printedJob.id, 'pending');
    } catch {
      invalidTransitionRejected = true;
    }
    assert(invalidTransitionRejected, '24. Reverting printed job back to pending is disallowed');

    // Test 25: Clear Printed Jobs
    const clearedCount = deletePrintedJobs();
    assert(clearedCount >= 1, '25. deletePrintedJobs deletes printed jobs');
    
    // Test 26: No printed jobs remain in the queue
    const remainingJobs = listPrintJobs({ status: 'printed' });
    assert(remainingJobs.length === 0, '26. No printed jobs remain in the queue');

    // Test 27: Barcode -> Variant -> Product Resolution
    const resolvedProduct = getProductById(sugar.id);
    const resolvedVariant = resolvedProduct.variants?.find((v) => v.id === sugar1Kg.id);
    const resolvedBarcode = resolvedVariant?.barcodes?.find((b) => b.id === barcodeSugar1.id);
    assert(
      Boolean(resolvedBarcode && resolvedBarcode.barcode === barcodeSugar1.barcode),
      '27. Full relational resolution: Product -> Variant -> Barcode succeeds'
    );

    // --- PART 4: PERSISTENCE ACROSS SIMULATED RESTART ---
    console.log('\n--- 4. Restart Persistence & Sequence Safety ---');

    // Check sequence in settings before close
    const seqRowBefore = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'barcode.internal_sequence'))
      .get();
    const currentSeqNum = parseInt(seqRowBefore?.value || '0', 10);

    // Close SQLite connection to simulate app shutdown
    sqlite.close();

    // Reopen SQLite connection to simulate app launch
    const reopenedSqlite = new Database(testDbPath);
    reopenedSqlite.pragma('journal_mode = WAL');
    reopenedSqlite.pragma('foreign_keys = ON');
    const reopenedDb = drizzle(reopenedSqlite, { schema });
    dbClient.setDb(reopenedDb);

    // Test 28: Sequence Survives Restart
    const seqRowAfter = reopenedDb
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'barcode.internal_sequence'))
      .get();
    assert(
      parseInt(seqRowAfter?.value || '0', 10) === currentSeqNum,
      '28. Barcode sequence persisted in settings table survives application restart'
    );

    // Test 29: Barcode generated after restart is 13 digits
    const barcodeKitkat = generateInternalBarcodeForVariant(kitkatSingle.id);
    assert(barcodeKitkat.barcode.length === 13, '29. Barcode generated after restart is 13 digits');
    
    // Test 30: New Barcode Generated After Restart Continues Monotonically
    const newSeqNum = parseInt(
      reopenedDb
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, 'barcode.internal_sequence'))
        .get()?.value || '0',
      10
    );
    assert(
      newSeqNum === currentSeqNum + 1,
      `30. Next generated barcode continues from sequence ${String(newSeqNum)} without resetting`
    );

    // Test 31: Barcode records and print jobs survive restart
    const jobsAfterRestart = listPrintJobs();
    assert(
      jobsAfterRestart.length >= 1,
      '31. Barcodes and print jobs persisted in SQLite survive application restart'
    );

    reopenedSqlite.close();
  } finally {
    // Clean up temporary database file
    console.log('\n[Cleanup] Removing temporary test database file...');
    try {
      if (existsSync(testDbPath)) unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (existsSync(walPath)) unlinkSync(walPath);
      if (existsSync(shmPath)) unlinkSync(shmPath);
      console.log('[Cleanup] Isolated test database cleaned up successfully.');
    } catch {
      console.warn('[Cleanup] Note: Temporary files will be cleaned by OS.');
    }
  }

  console.log('\n====================================================');
  console.log(`Phase 4 Test Results: ${String(passedTests)} Passed, ${String(failedTests)} Failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
