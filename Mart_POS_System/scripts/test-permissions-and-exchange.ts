import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import {
  createUser,
  updateUserPermissions,
  getUserById,
} from '../src/repositories/users';
import { getUserAllowedModules } from '../src/repositories/auth';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createMovement, getVariantStock } from '../src/repositories/inventory';
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
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-perm-exchange-${Date.now()}.db`);
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
  console.log('=== Permissions Revoke-All & Atomic Inventory Exchange Test Suite ===\n');
  setup();

  try {
    console.log('--- 1. Users & Roles: Permissions ---');

    const cashier = createUser({
      username: 'perm_test_cashier',
      password: 'testpass123',
      full_name: 'Permission Test Cashier',
      role: 'cashier',
    });

    // 1.1 Brand-new user, never customized -> should get role defaults
    const defaultModules = getUserAllowedModules(cashier.id, cashier.role);
    assert(defaultModules.length > 0, '1.1 New user with no custom permissions falls back to role defaults (non-empty)');

    const freshUser = getUserById(cashier.id);
    assert((freshUser.allowed_modules ?? []).length === defaultModules.length, '1.2 getUserById reflects the same role-default set');

    // 1.2 Admin grants a specific, non-empty custom set
    updateUserPermissions(cashier.id, ['pos', 'products']);
    const customModules = getUserAllowedModules(cashier.id, cashier.role);
    assert(
      customModules.length === 2 && customModules.includes('pos') && customModules.includes('products'),
      '1.3 Custom 2-module grant is respected exactly',
    );

    // 1.3 THE BUG FIX: Admin clicks "Revoke All" -> saves an EMPTY array
    updateUserPermissions(cashier.id, []);
    const revokedModules = getUserAllowedModules(cashier.id, cashier.role);
    assert(
      revokedModules.length === 0,
      '1.4 CRITICAL: "Revoke All" (empty permission set) results in ZERO modules, not role defaults',
    );

    const revokedUser = getUserById(cashier.id);
    assert(
      (revokedUser.allowed_modules ?? []).length === 0,
      '1.5 getUserById also reflects zero modules after revoke-all (UI consistency)',
    );

    // 1.4 Admin grants access again after a revoke-all -> should work normally
    updateUserPermissions(cashier.id, ['pos']);
    const regrantedModules = getUserAllowedModules(cashier.id, cashier.role);
    assert(
      regrantedModules.length === 1 && regrantedModules.includes('pos'),
      '1.6 Re-granting after a revoke-all works correctly',
    );

    console.log('\n--- 2. Inventory: Atomic Exchange Stock ---');

    const category = createCategory({ name: 'Exchange Test Category' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const productA = createProduct({
      name: 'Exchange Source Product',
      category_id: category.id,
      variants: [{ variant_name: 'Standard', unit_id: unit.id, purchase_price_minor: 10000, selling_price_minor: 15000, sku: 'EXA-1' }],
    });
    const productB = createProduct({
      name: 'Exchange Target Product',
      category_id: category.id,
      variants: [{ variant_name: 'Standard', unit_id: unit.id, purchase_price_minor: 8000, selling_price_minor: 12000, sku: 'EXB-1' }],
    });
    const variantA = productA.variants?.[0];
    const variantB = productB.variants?.[0];
    if (!variantA || !variantB) throw new Error('Fixture variants missing');

    // Stock product A with 10 units, product B starts at 0
    createMovement({
      variant_id: variantA.id,
      adjustment_type: 'opening_stock',
      direction: 'in',
      quantity: 10000,
      source: 'opening_stock',
      notes: 'Opening stock for exchange test',
    });

    // 2.1 Successful atomic exchange: 3 units A -> B
    const result = exchangeVariantStock({
      source_variant_id: variantA.id,
      target_variant_id: variantB.id,
      quantity: 3000,
      reason: 'Test exchange',
      notes: 'automated test',
    });
    assert(result.out_movement.movement_type === 'OUT', '2.1 Out movement recorded on source variant');
    assert(result.in_movement.movement_type === 'IN', '2.2 In movement recorded on target variant');
    assert(result.in_movement.reference_id === result.out_movement.id, '2.3 In movement links back to its paired Out movement');

    const stockAAfter = getVariantStock(variantA.id);
    const stockBAfter = getVariantStock(variantB.id);
    assert(stockAAfter.current_stock === 7000, '2.4 Source variant stock correctly decreased to 7 units');
    assert(stockBAfter.current_stock === 3000, '2.5 Target variant stock correctly increased to 3 units');

    // 2.2 THE BUG FIX: attempting to exchange MORE than available must fail
    // and leave BOTH variants' stock completely untouched (atomicity).
    let atomicityError: Error | null = null;
    try {
      exchangeVariantStock({
        source_variant_id: variantA.id,
        target_variant_id: variantB.id,
        quantity: 999000, // way more than the 7 units remaining
        reason: 'Should fail',
      });
    } catch (err) {
      atomicityError = err instanceof Error ? err : new Error(String(err));
    }
    assert(atomicityError !== null, '2.6 Over-quantity exchange throws an error instead of silently partially applying');

    const stockAAfterFailedAttempt = getVariantStock(variantA.id);
    const stockBAfterFailedAttempt = getVariantStock(variantB.id);
    assert(
      stockAAfterFailedAttempt.current_stock === 7000,
      '2.7 ATOMICITY: source variant stock unchanged after failed exchange (no partial deduction)',
    );
    assert(
      stockBAfterFailedAttempt.current_stock === 3000,
      '2.8 ATOMICITY: target variant stock unchanged after failed exchange (no phantom addition)',
    );

    // 2.3 Self-exchange should be rejected outright
    let selfExchangeError: Error | null = null;
    try {
      exchangeVariantStock({
        source_variant_id: variantA.id,
        target_variant_id: variantA.id,
        quantity: 1000,
        reason: 'Should fail',
      });
    } catch (err) {
      selfExchangeError = err instanceof Error ? err : new Error(String(err));
    }
    assert(selfExchangeError !== null, '2.9 Exchanging a variant with itself is rejected');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Permissions & Exchange Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('='.repeat(60));
  } finally {
    cleanup();
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
