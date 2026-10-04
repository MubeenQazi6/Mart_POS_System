import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createMovement } from '../src/repositories/inventory';
import {
  createSale,
  getLastInvoiceSequence,
} from '../src/repositories/sales';
import {
  generateInvoiceNumber,
  isValidInvoiceNumber,
} from '../src/domain/sales';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed++;
  }
}

function run(): void {
  console.log('=== Testing Invoice Numbering & Duplicate Resolution Suite ===\n');

  const testDbPath = join(tmpdir(), `martpos-test-invoice-${Date.now()}.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  dbClient.setDb(db);

  try {
    const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
    migrate(db, { migrationsFolder });

    // 1. Initial State: sequence is 0 when no sales exist
    const initialSeq = getLastInvoiceSequence();
    assert(initialSeq === 0, `Initial getLastInvoiceSequence is 0 (got ${initialSeq})`);

    // 2. Format validation
    const testDate = new Date('2026-08-28T15:30:45');
    const invFormatted = generateInvoiceNumber(initialSeq + 1, testDate);
    assert(
      invFormatted === 'INV-20260828153045-00001',
      `generateInvoiceNumber formats correctly: INV-YYYYMMDDHHMMSS-00001 (got ${invFormatted})`
    );
    assert(isValidInvoiceNumber(invFormatted), `isValidInvoiceNumber validates new format`);

    // 3. Setup product fixtures
    const cat = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const prod = createProduct({
      name: 'Mineral Water 500ml',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Regular',
          sku: 'WATER-500ML',
          unit_id: unit.id,
          purchase_price_minor: 3000,
          selling_price_minor: 5000,
          min_stock_alert: 5,
        },
      ],
    });
    const vId = prod.variants![0]!.id;
    createMovement({ variant_id: vId, quantity: 10000, adjustment_type: 'opening_stock' });

    // 4. Create Sale 1 -> Should get sequence 1 (00001)
    const sale1 = createSale({
      items: [{ variant_id: vId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 5000 }],
      discount_minor: 0,
    });
    assert(
      sale1.invoice_number.endsWith('-00001') && /^INV-\d{14}-00001$/.test(sale1.invoice_number),
      `Sale 1 gets sequence 00001 (${sale1.invoice_number})`
    );

    // 5. Query last sequence -> Should now be 1
    const seqAfterSale1 = getLastInvoiceSequence();
    assert(seqAfterSale1 === 1, `getLastInvoiceSequence after Sale 1 is 1 (got ${seqAfterSale1})`);

    // 6. Create Sale 2 -> Should increment sequence to 2 (00002)
    const sale2 = createSale({
      items: [{ variant_id: vId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 5000 }],
      discount_minor: 0,
    });
    assert(
      sale2.invoice_number.endsWith('-00002') && /^INV-\d{14}-00002$/.test(sale2.invoice_number),
      `Sale 2 gets incremented sequence 00002 (${sale2.invoice_number})`
    );

    // 7. Query last sequence -> Should now be 2
    const seqAfterSale2 = getLastInvoiceSequence();
    assert(seqAfterSale2 === 2, `getLastInvoiceSequence after Sale 2 is 2 (got ${seqAfterSale2})`);

    // 8. Create Sale 3 -> Should increment sequence to 3 (00003)
    const sale3 = createSale({
      items: [{ variant_id: vId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 5000 }],
      discount_minor: 0,
    });
    assert(
      sale3.invoice_number.endsWith('-00003') && /^INV-\d{14}-00003$/.test(sale3.invoice_number),
      `Sale 3 gets incremented sequence 00003 (${sale3.invoice_number})`
    );

    // 9. Legacy format backward compatibility check in getLastInvoiceSequence
    // Insert a legacy invoice row directly: "INV-00042"
    db.insert(schema.sales).values({
      invoice_number: 'INV-00042',
      subtotal_minor: 5000,
      discount_minor: 0,
      tax_minor: 0,
      total_minor: 5000,
      status: 'completed',
    }).run();

    const seqAfterLegacy = getLastInvoiceSequence();
    assert(seqAfterLegacy === 42, `getLastInvoiceSequence accurately parses legacy INV-00042 as sequence 42 (got ${seqAfterLegacy})`);

    const saleAfterLegacy = createSale({
      items: [{ variant_id: vId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 5000 }],
      discount_minor: 0,
    });
    assert(
      saleAfterLegacy.invoice_number.endsWith('-00043') && /^INV-\d{14}-00043$/.test(saleAfterLegacy.invoice_number),
      `Next sale after legacy sequence 42 is 43 (${saleAfterLegacy.invoice_number})`
    );

  } finally {
    sqlite.close();
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    const wal = `${testDbPath}-wal`;
    const shm = `${testDbPath}-shm`;
    if (existsSync(wal)) unlinkSync(wal);
    if (existsSync(shm)) unlinkSync(shm);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
