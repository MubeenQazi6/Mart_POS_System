import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import {
  barcodePrintJobs,
  productVariants,
  productBarcodes,
  products,
  settings,
} from '../database/schema/index';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { generateInternalBarcode, validateEAN13 } from '../domain/barcode';
import type {
  BarcodeRow,
  PrintJobRow,
  CreatePrintJobInput,
  PrintJobSearchParams,
  PrintJobStatus,
} from '@shared/types/catalog';

const SEQUENCE_SETTING_KEY = 'barcode.internal_sequence';

function handleDbError(error: unknown, entityName: string): never {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw new Error(`A ${entityName} with this unique identifier already exists.`);
  }
  throw error;
}

/**
 * Atomically generates and associates a unique internal EAN-13 barcode with a product variant.
 * Persists the sequence counter in the settings table.
 */
export function generateInternalBarcodeForVariant(variantId: number): BarcodeRow {
  return withTransaction((tx) => {
    // 1. Validate variant exists & is active
    const variant = tx
      .select({
        id: productVariants.id,
        is_active: productVariants.is_active,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .get();

    if (!variant) {
      throw new Error(`Variant with ID ${String(variantId)} not found`);
    }
    if (!variant.is_active) {
      throw new Error(`Cannot generate barcode for inactive variant (ID ${String(variantId)})`);
    }

    // 2. Check if variant already has an active INTERNAL barcode
    const existingInternal = tx
      .select()
      .from(productBarcodes)
      .where(
        and(
          eq(productBarcodes.variant_id, variantId),
          eq(productBarcodes.barcode_type, 'INTERNAL'),
          eq(productBarcodes.is_active, true)
        )
      )
      .get();

    if (existingInternal) {
      throw new Error(
        `Variant already has an active internal barcode: ${existingInternal.barcode}`
      );
    }

    // 3. Read & increment sequence from settings
    const currentSetting = tx
      .select()
      .from(settings)
      .where(eq(settings.key, SEQUENCE_SETTING_KEY))
      .get();

    let seq = 0;
    if (currentSetting) {
      const parsed = parseInt(currentSetting.value, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        seq = parsed;
      }
    }

    let candidateBarcode = '';
    let inserted = false;
    let attempts = 0;
    const maxAttempts = 10;
    let finalBarcodeRow: BarcodeRow | null = null;

    while (!inserted && attempts < maxAttempts) {
      attempts++;
      seq++;

      // Save new sequence to settings
      const now = new Date().toISOString();
      if (currentSetting || attempts > 1) {
        tx.update(settings)
          .set({
            value: String(seq),
            updated_at: now,
          })
          .where(eq(settings.key, SEQUENCE_SETTING_KEY))
          .run();
      } else {
        tx.insert(settings)
          .values({
            key: SEQUENCE_SETTING_KEY,
            value: String(seq),
            updated_at: now,
          })
          .run();
      }

      // Generate EAN-13
      candidateBarcode = generateInternalBarcode(seq);

      // Verify uniqueness against product_barcodes
      const conflict = tx
        .select({ id: productBarcodes.id })
        .from(productBarcodes)
        .where(eq(productBarcodes.barcode, candidateBarcode))
        .get();

      if (!conflict) {
        try {
          // If this variant has no primary barcodes, set this one as primary
          const hasPrimary = tx
            .select({ id: productBarcodes.id })
            .from(productBarcodes)
            .where(
              and(
                eq(productBarcodes.variant_id, variantId),
                eq(productBarcodes.is_primary, true),
                eq(productBarcodes.is_active, true)
              )
            )
            .get();

          const result = tx
            .insert(productBarcodes)
            .values({
              variant_id: variantId,
              barcode: candidateBarcode,
              barcode_type: 'INTERNAL',
              is_primary: !hasPrimary,
              is_active: true,
            })
            .returning()
            .get();

          finalBarcodeRow = result;
          inserted = true;
        } catch (err) {
          if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            // Collision occurred, will retry with next sequence
            continue;
          }
          throw err;
        }
      }
    }

    if (!finalBarcodeRow) {
      throw new Error('Failed to generate a unique internal barcode after multiple attempts');
    }

    return finalBarcodeRow;
  });
}

/**
 * Create a new print job for physical barcode label printing.
 */
export function createPrintJob(input: CreatePrintJobInput): PrintJobRow {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('Print quantity must be a positive integer');
  }

  const db = getDb();

  // Validate variant exists and is active
  const variant = db
    .select({ id: productVariants.id, is_active: productVariants.is_active })
    .from(productVariants)
    .where(eq(productVariants.id, input.variant_id))
    .get();

  if (!variant) {
    throw new Error(`Variant with ID ${String(input.variant_id)} not found`);
  }
  if (!variant.is_active) {
    throw new Error(`Cannot create print job for inactive variant (ID ${String(input.variant_id)})`);
  }

  // Validate barcode exists, matches variant, and is active
  const barcode = db
    .select({
      id: productBarcodes.id,
      variant_id: productBarcodes.variant_id,
      is_active: productBarcodes.is_active,
    })
    .from(productBarcodes)
    .where(eq(productBarcodes.id, input.barcode_id))
    .get();

  if (!barcode) {
    throw new Error(`Barcode with ID ${String(input.barcode_id)} not found`);
  }
  if (barcode.variant_id !== input.variant_id) {
    throw new Error(
      `Barcode ID ${String(input.barcode_id)} does not belong to variant ID ${String(input.variant_id)}`
    );
  }
  if (!barcode.is_active) {
    throw new Error(`Cannot create print job for inactive barcode (ID ${String(input.barcode_id)})`);
  }

  try {
    const inserted = db
      .insert(barcodePrintJobs)
      .values({
        variant_id: input.variant_id,
        barcode_id: input.barcode_id,
        quantity: input.quantity,
        status: 'pending',
      })
      .returning()
      .get();

    return getPrintJobById(inserted.id);
  } catch (error) {
    handleDbError(error, 'print job');
  }
}

/**
 * Get a single print job by ID with joined product, variant, and barcode info.
 */
export function getPrintJobById(id: number): PrintJobRow {
  const db = getDb();
  const row = db
    .select({
      id: barcodePrintJobs.id,
      variant_id: barcodePrintJobs.variant_id,
      barcode_id: barcodePrintJobs.barcode_id,
      quantity: barcodePrintJobs.quantity,
      status: barcodePrintJobs.status,
      created_at: barcodePrintJobs.created_at,
      updated_at: barcodePrintJobs.updated_at,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      barcode: productBarcodes.barcode,
      barcode_type: productBarcodes.barcode_type,
      selling_price_minor: productVariants.selling_price_minor,
    })
    .from(barcodePrintJobs)
    .leftJoin(productVariants, eq(barcodePrintJobs.variant_id, productVariants.id))
    .leftJoin(products, eq(productVariants.product_id, products.id))
    .leftJoin(productBarcodes, eq(barcodePrintJobs.barcode_id, productBarcodes.id))
    .where(eq(barcodePrintJobs.id, id))
    .get();

  if (!row) {
    throw new Error(`Print job with ID ${String(id)} not found`);
  }

  return {
    ...row,
    status: row.status as PrintJobStatus,
  };
}

/**
 * List print jobs with optional status filter and search term.
 */
export function listPrintJobs(params: PrintJobSearchParams = {}): PrintJobRow[] {
  const db = getDb();
  const query = db
    .select({
      id: barcodePrintJobs.id,
      variant_id: barcodePrintJobs.variant_id,
      barcode_id: barcodePrintJobs.barcode_id,
      quantity: barcodePrintJobs.quantity,
      status: barcodePrintJobs.status,
      created_at: barcodePrintJobs.created_at,
      updated_at: barcodePrintJobs.updated_at,
      product_id: products.id,
      product_name: products.name,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      barcode: productBarcodes.barcode,
      barcode_type: productBarcodes.barcode_type,
      selling_price_minor: productVariants.selling_price_minor,
    })
    .from(barcodePrintJobs)
    .leftJoin(productVariants, eq(barcodePrintJobs.variant_id, productVariants.id))
    .leftJoin(products, eq(productVariants.product_id, products.id))
    .leftJoin(productBarcodes, eq(barcodePrintJobs.barcode_id, productBarcodes.id));

  const conditions = [];
  if (params.status) {
    conditions.push(eq(barcodePrintJobs.status, params.status));
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, term),
        like(productVariants.variant_name, term),
        like(productVariants.sku, term),
        like(productBarcodes.barcode, term)
      )
    );
  }

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const rows = query.orderBy(desc(barcodePrintJobs.created_at)).all();

  return rows.map((r) => ({
    ...r,
    status: r.status as PrintJobStatus,
  }));
}

/**
 * Update print job status with state transition validation.
 *
 * Allowed transitions:
 *   - pending -> printed
 *   - pending -> failed
 *   - failed -> pending (retry)
 *
 * Disallowed:
 *   - printed -> pending
 *   - printed -> failed
 *   - failed -> printed directly
 */
export function updatePrintJobStatus(id: number, newStatus: PrintJobStatus): PrintJobRow {
  const db = getDb();
  const job = db
    .select()
    .from(barcodePrintJobs)
    .where(eq(barcodePrintJobs.id, id))
    .get();

  if (!job) {
    throw new Error(`Print job with ID ${String(id)} not found`);
  }

  const currentStatus = job.status as PrintJobStatus;

  if (currentStatus === newStatus) {
    return getPrintJobById(id);
  }

  // Validate state transition
  if (currentStatus === 'printed') {
    throw new Error('Cannot change status of an already printed job');
  }

  if (currentStatus === 'failed' && newStatus === 'printed') {
    throw new Error('Cannot mark failed job directly as printed. Retry it first.');
  }

  if (currentStatus === 'pending' && newStatus !== 'printed' && newStatus !== 'failed') {
    throw new Error(`Invalid status transition from pending to ${newStatus}`);
  }

  const now = new Date().toISOString();
  db.update(barcodePrintJobs)
    .set({
      status: newStatus,
      updated_at: now,
    })
    .where(eq(barcodePrintJobs.id, id))
    .run();

  return getPrintJobById(id);
}

/**
 * Retry a failed print job (failed -> pending).
 */
export function retryFailedJob(id: number): PrintJobRow {
  return updatePrintJobStatus(id, 'pending');
}

/**
 * Clear / delete all completed (status = 'printed') jobs.
 */
export function deletePrintedJobs(): number {
  const db = getDb();
  const result = db
    .delete(barcodePrintJobs)
    .where(eq(barcodePrintJobs.status, 'printed'))
    .run();

  return result.changes;
}

/**
 * Helper to validate EAN-13 check digit and format.
 */
export function validateBarcode(barcode: string): boolean {
  return validateEAN13(barcode);
}
