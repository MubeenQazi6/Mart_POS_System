import { getDb } from '../database/client/index';
import { categories, brands, units } from '../database/schema/index';
import { eq, asc } from 'drizzle-orm';
import type { 
  CategoryRow, CreateCategoryInput, UpdateCategoryInput,
  BrandRow, CreateBrandInput, UpdateBrandInput,
  UnitRow, CreateUnitInput, UpdateUnitInput
} from '@shared/types/catalog';

function handleDbError(error: unknown, entityName: string): never {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw new Error(`A ${entityName} with this name already exists.`);
  }
  throw error;
}

export function listCategories(): CategoryRow[] {
  const db = getDb();
  return db.select().from(categories).orderBy(asc(categories.sort_order)).all();
}

export function createCategory(input: CreateCategoryInput): CategoryRow {
  try {
    const db = getDb();
    return db.insert(categories).values({
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    }).returning().get();
  } catch (error) {
    handleDbError(error, 'category');
  }
}

export function updateCategory(input: UpdateCategoryInput): CategoryRow {
  try {
    const db = getDb();
    const result = db.update(categories).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    }).where(eq(categories.id, input.id)).returning().get();
    return result;
  } catch (error) {
    handleDbError(error, 'category');
  }
}

export function listBrands(): BrandRow[] {
  const db = getDb();
  return db.select().from(brands).orderBy(asc(brands.name)).all();
}

export function createBrand(input: CreateBrandInput): BrandRow {
  try {
    const db = getDb();
    return db.insert(brands).values({
      name: input.name,
      is_active: true,
    }).returning().get();
  } catch (error) {
    handleDbError(error, 'brand');
  }
}

export function updateBrand(input: UpdateBrandInput): BrandRow {
  try {
    const db = getDb();
    const result = db.update(brands).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    }).where(eq(brands.id, input.id)).returning().get();
    return result;
  } catch (error) {
    handleDbError(error, 'brand');
  }
}

export function listUnits(): UnitRow[] {
  const db = getDb();
  return db.select().from(units).orderBy(asc(units.name)).all();
}

export function createUnit(input: CreateUnitInput): UnitRow {
  try {
    const db = getDb();
    return db.insert(units).values({
      name: input.name,
      abbreviation: input.abbreviation,
      decimals: input.decimals,
      is_active: true,
    }).returning().get();
  } catch (error) {
    handleDbError(error, 'unit');
  }
}

export function updateUnit(input: UpdateUnitInput): UnitRow {
  try {
    const db = getDb();
    const result = db.update(units).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.abbreviation !== undefined && { abbreviation: input.abbreviation }),
      ...(input.decimals !== undefined && { decimals: input.decimals }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    }).where(eq(units.id, input.id)).returning().get();
    return result;
  } catch (error) {
    handleDbError(error, 'unit');
  }
}
