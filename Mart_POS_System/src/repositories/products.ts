import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { products, productVariants, productBarcodes, categories, brands, units, stockMovements } from '../database/schema/index';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';
import type { 
  ProductRow, ProductSearchParams, CreateProductInput, UpdateProductInput,
  ProductVariantRow, CreateVariantInput, UpdateVariantInput,
  BarcodeRow, AddBarcodeInput
} from '@shared/types/catalog';

function handleDbError(error: unknown, entityName: string): never {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw new Error(`A ${entityName} with this unique identifier already exists.`);
  }
  throw error;
}

export function listProducts(params: ProductSearchParams): ProductRow[] {
  const db = getDb();
  const baseQuery = db.select({
    id: products.id,
    name: products.name,
    description: products.description,
    category_id: products.category_id,
    category_name: categories.name,
    brand_id: products.brand_id,
    brand_name: brands.name,
    is_active: products.is_active,
    created_at: products.created_at,
    updated_at: products.updated_at,
    variant_count: sql<number>`count(distinct ${productVariants.id})`.mapWith(Number)
  })
  .from(products)
  .leftJoin(categories, eq(products.category_id, categories.id))
  .leftJoin(brands, eq(products.brand_id, brands.id))
  .leftJoin(productVariants, eq(products.id, productVariants.product_id))
  .leftJoin(productBarcodes, eq(productVariants.id, productBarcodes.variant_id));

  const conditions = [];
  if (params.category_id !== undefined) conditions.push(eq(products.category_id, params.category_id));
  if (params.brand_id !== undefined) conditions.push(eq(products.brand_id, params.brand_id));
  if (params.is_active !== undefined) conditions.push(eq(products.is_active, params.is_active));
  
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(or(
      like(products.name, term),
      like(productVariants.sku, term),
      like(productBarcodes.barcode, term)
    ));
  }

  if (conditions.length > 0) {
    baseQuery.where(and(...conditions));
  }

  const result = baseQuery.groupBy(products.id).orderBy(desc(products.created_at)).all() as ProductRow[];
  
  for (const prod of result) {
    prod.variants = listVariants(prod.id);
    for (const v of prod.variants) {
      v.barcodes = listBarcodes(v.id);
    }
  }

  return result;
}

export function listVariants(productId: number): ProductVariantRow[] {
  const db = getDb();
  const variants = db.select({
    id: productVariants.id,
    product_id: productVariants.product_id,
    variant_name: productVariants.variant_name,
    sku: productVariants.sku,
    unit_id: productVariants.unit_id,
    unit_name: units.name,
    unit_abbreviation: units.abbreviation,
    unit_decimals: units.decimals,
    purchase_price_minor: productVariants.purchase_price_minor,
    selling_price_minor: productVariants.selling_price_minor,
    min_stock_alert: productVariants.min_stock_alert,
    is_active: productVariants.is_active,
    created_at: productVariants.created_at,
    updated_at: productVariants.updated_at,
    available_stock: sql<number>`coalesce((select sum(case when ${stockMovements.movement_type} = 'IN' then ${stockMovements.quantity} else -${stockMovements.quantity} end) from ${stockMovements} where ${stockMovements.variant_id} = ${productVariants.id}), 0)`.mapWith(Number),
  })
  .from(productVariants)
  .leftJoin(units, eq(productVariants.unit_id, units.id))
  .where(eq(productVariants.product_id, productId))
  .all();

  return variants;
}

export function listBarcodes(variantId: number): BarcodeRow[] {
  const db = getDb();
  return db.select().from(productBarcodes).where(eq(productBarcodes.variant_id, variantId)).all();
}

export function getProductById(id: number): ProductRow {
  const db = getDb();
  const product = db.select({
    id: products.id,
    name: products.name,
    description: products.description,
    category_id: products.category_id,
    category_name: categories.name,
    brand_id: products.brand_id,
    brand_name: brands.name,
    is_active: products.is_active,
    created_at: products.created_at,
    updated_at: products.updated_at,
  })
  .from(products)
  .leftJoin(categories, eq(products.category_id, categories.id))
  .leftJoin(brands, eq(products.brand_id, brands.id))
  .where(eq(products.id, id))
  .get();

  if (!product) throw new Error('Product not found');

  const variants = listVariants(product.id);
  for (const v of variants) {
    v.barcodes = listBarcodes(v.id);
  }
  
  return {
    ...product,
    variants,
  };
}

export function createProduct(input: CreateProductInput): ProductRow {
  const prodId = withTransaction((tx) => {
    try {
      const prod = tx.insert(products).values({
        name: input.name,
        description: input.description ?? null,
        category_id: input.category_id,
        brand_id: input.brand_id ?? null,
        is_active: true,
      }).returning({ id: products.id }).get();

      for (const vInput of input.variants) {
        const variant = tx.insert(productVariants).values({
          product_id: prod.id,
          variant_name: vInput.variant_name,
          sku: vInput.sku ?? null,
          unit_id: vInput.unit_id,
          purchase_price_minor: vInput.purchase_price_minor,
          selling_price_minor: vInput.selling_price_minor,
          min_stock_alert: vInput.min_stock_alert ?? 0,
          is_active: true,
        }).returning({ id: productVariants.id }).get();

        if (vInput.barcodes) {
          for (const bInput of vInput.barcodes) {
            tx.insert(productBarcodes).values({
              variant_id: variant.id,
              barcode: bInput.barcode,
              barcode_type: bInput.barcode_type,
              is_primary: bInput.is_primary ?? false,
              is_active: true,
            }).run();
          }
        }
      }
      return prod.id;
    } catch (error) {
      handleDbError(error, 'product or variant');
    }
  });

  return getProductById(prodId);
}

export function updateProduct(input: UpdateProductInput): ProductRow {
  try {
    const db = getDb();
    const result = db.update(products).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category_id !== undefined && { category_id: input.category_id }),
      ...(input.brand_id !== undefined && { brand_id: input.brand_id }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
      updated_at: new Date().toISOString(),
    }).where(eq(products.id, input.id)).returning().get();
    return getProductById(result.id);
  } catch (error) {
    handleDbError(error, 'product');
  }
}

export function createVariant(productId: number, input: CreateVariantInput): ProductVariantRow {
  try {
    const db = getDb();
    const result = db.insert(productVariants).values({
      product_id: productId,
      variant_name: input.variant_name,
      sku: input.sku ?? null,
      unit_id: input.unit_id,
      purchase_price_minor: input.purchase_price_minor,
      selling_price_minor: input.selling_price_minor,
      min_stock_alert: input.min_stock_alert ?? 0,
      is_active: true,
    }).returning().get();
    return db.select({
      id: productVariants.id,
      product_id: productVariants.product_id,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      unit_id: productVariants.unit_id,
      unit_name: units.name,
      unit_abbreviation: units.abbreviation,
      unit_decimals: units.decimals,
      purchase_price_minor: productVariants.purchase_price_minor,
      selling_price_minor: productVariants.selling_price_minor,
      min_stock_alert: productVariants.min_stock_alert,
      is_active: productVariants.is_active,
      created_at: productVariants.created_at,
      updated_at: productVariants.updated_at,
    }).from(productVariants)
      .leftJoin(units, eq(productVariants.unit_id, units.id))
      .where(eq(productVariants.id, result.id)).get() as ProductVariantRow;
  } catch (error) {
    handleDbError(error, 'variant');
  }
}

export function updateVariant(input: UpdateVariantInput): ProductVariantRow {
  try {
    const db = getDb();
    const result = db.update(productVariants).set({
      ...(input.variant_name !== undefined && { variant_name: input.variant_name }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.unit_id !== undefined && { unit_id: input.unit_id }),
      ...(input.purchase_price_minor !== undefined && { purchase_price_minor: input.purchase_price_minor }),
      ...(input.selling_price_minor !== undefined && { selling_price_minor: input.selling_price_minor }),
      ...(input.min_stock_alert !== undefined && { min_stock_alert: input.min_stock_alert }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
      updated_at: new Date().toISOString(),
    }).where(eq(productVariants.id, input.id)).returning().get();
    return db.select({
      id: productVariants.id,
      product_id: productVariants.product_id,
      variant_name: productVariants.variant_name,
      sku: productVariants.sku,
      unit_id: productVariants.unit_id,
      unit_name: units.name,
      unit_abbreviation: units.abbreviation,
      unit_decimals: units.decimals,
      purchase_price_minor: productVariants.purchase_price_minor,
      selling_price_minor: productVariants.selling_price_minor,
      min_stock_alert: productVariants.min_stock_alert,
      is_active: productVariants.is_active,
      created_at: productVariants.created_at,
      updated_at: productVariants.updated_at,
    }).from(productVariants)
      .leftJoin(units, eq(productVariants.unit_id, units.id))
      .where(eq(productVariants.id, result.id)).get() as ProductVariantRow;
  } catch (error) {
    handleDbError(error, 'variant');
  }
}

export function addBarcode(input: AddBarcodeInput): BarcodeRow {
  try {
    const db = getDb();
    const result = db.insert(productBarcodes).values({
      variant_id: input.variant_id,
      barcode: input.barcode,
      barcode_type: input.barcode_type,
      is_primary: input.is_primary ?? false,
      is_active: true,
    }).returning().get();
    return result;
  } catch (error) {
    handleDbError(error, 'barcode');
  }
}

export function deactivateBarcode(id: number): void {
  const db = getDb();
  db.update(productBarcodes).set({ is_active: false }).where(eq(productBarcodes.id, id)).run();
}
