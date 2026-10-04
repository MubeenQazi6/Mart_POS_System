import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as catalogRepo from '../../../repositories/catalog';
import * as productsRepo from '../../../repositories/products';
import { assertAdminOrManager } from '../utils/authGuard';
import type {
  CreateCategoryInput, UpdateCategoryInput, CategoryRow,
  CreateBrandInput, UpdateBrandInput, BrandRow,
  CreateUnitInput, UpdateUnitInput, UnitRow,
  CreateProductInput, UpdateProductInput, ProductRow, ProductSearchParams,
  CreateVariantInput, UpdateVariantInput, ProductVariantRow,
  AddBarcodeInput, BarcodeRow
} from '@shared/types/catalog';

export function registerCatalogIpcHandlers(): void {
  // --- CATALOG (Categories, Brands, Units) ---

  ipcMain.handle(IPC_CHANNELS.CATALOG.CATEGORIES_LIST, (): Result<CategoryRow[]> => {
    try {
      const data = catalogRepo.listCategories();
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error listing categories', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.CATEGORY_CREATE, (_, input: CreateCategoryInput): Result<CategoryRow> => {
    try {
      if (!input.name) throw new Error('Category name is required');
      const data = catalogRepo.createCategory(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error creating category', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.CATEGORY_UPDATE, (_, input: UpdateCategoryInput): Result<CategoryRow> => {
    try {
      if (!input.id) throw new Error('Category ID is required');
      const data = catalogRepo.updateCategory(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error updating category', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.BRANDS_LIST, (): Result<BrandRow[]> => {
    try {
      const data = catalogRepo.listBrands();
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error listing brands', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.BRAND_CREATE, (_, input: CreateBrandInput): Result<BrandRow> => {
    try {
      if (!input.name) throw new Error('Brand name is required');
      const data = catalogRepo.createBrand(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error creating brand', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.BRAND_UPDATE, (_, input: UpdateBrandInput): Result<BrandRow> => {
    try {
      if (!input.id) throw new Error('Brand ID is required');
      const data = catalogRepo.updateBrand(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error updating brand', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.UNITS_LIST, (): Result<UnitRow[]> => {
    try {
      const data = catalogRepo.listUnits();
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error listing units', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.UNIT_CREATE, (_, input: CreateUnitInput): Result<UnitRow> => {
    try {
      if (!input.name || !input.abbreviation) {
        throw new Error('Name and abbreviation are required');
      }
      const data = catalogRepo.createUnit(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error creating unit', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATALOG.UNIT_UPDATE, (_, input: UpdateUnitInput): Result<UnitRow> => {
    try {
      if (!input.id) throw new Error('Unit ID is required');
      const data = catalogRepo.updateUnit(input);
      return { success: true, data };
    } catch (error) {
      logger.error('catalog', 'Error updating unit', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // --- PRODUCTS ---

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.LIST, (_, params: ProductSearchParams = {}): Result<ProductRow[]> => {
    try {
      const data = productsRepo.listProducts(params);
      return { success: true, data };
    } catch (error) {
      logger.error('products', 'Error listing products', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.SEARCH, (_, params: ProductSearchParams = {}): Result<ProductRow[]> => {
    try {
      const data = productsRepo.listProducts(params);
      return { success: true, data };
    } catch (error) {
      logger.error('products', 'Error searching products', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.GET, (_, id: number): Result<ProductRow> => {
    try {
      if (!id) throw new Error('Product ID is required');
      const data = productsRepo.getProductById(id);
      return { success: true, data };
    } catch (error) {
      logger.error('products', `Error getting product ${id.toString()}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.CREATE, (_, input: CreateProductInput): Result<ProductRow> => {
    try {
      if (!input.name || !input.category_id || input.variants.length === 0) {
        throw new Error('Name, category, and at least one variant are required');
      }
      const data = productsRepo.createProduct(input);
      return { success: true, data };
    } catch (error) {
      logger.error('products', 'Error creating product', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.UPDATE, (_, input: UpdateProductInput): Result<ProductRow> => {
    try {
      // Only admin and store_manager can update products
      assertAdminOrManager();
      if (!input.id) throw new Error('Product ID is required');
      const data = productsRepo.updateProduct(input);
      return { success: true, data };
    } catch (error) {
      logger.error('products', 'Error updating product', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCTS.DELETE, (_, id: number): Result<void> => {
    try {
      // Only admin and store_manager can delete products
      assertAdminOrManager();
      if (!id) throw new Error('Product ID is required');
      productsRepo.deleteProduct(id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('products', `Error deleting product ${String(id)}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // --- PRODUCT VARIANTS ---

  ipcMain.handle(IPC_CHANNELS.PRODUCT_VARIANTS.LIST, (_, productId: number): Result<ProductVariantRow[]> => {
    try {
      if (!productId) throw new Error('Product ID is required');
      const data = productsRepo.listVariants(productId);
      return { success: true, data };
    } catch (error) {
      logger.error('product-variants', 'Error listing variants', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_VARIANTS.CREATE, (_, productId: number, input: CreateVariantInput): Result<ProductVariantRow> => {
    try {
      assertAdminOrManager();
      if (!productId) throw new Error('Product ID is required');
      if (!input.variant_name || !input.unit_id) {
        throw new Error('Variant name and unit are required');
      }
      const data = productsRepo.createVariant(productId, input);
      return { success: true, data };
    } catch (error) {
      logger.error('product-variants', 'Error creating variant', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_VARIANTS.UPDATE, (_, input: UpdateVariantInput): Result<ProductVariantRow> => {
    try {
      // Only admin and store_manager can update variants
      assertAdminOrManager();
      if (!input.id) throw new Error('Variant ID is required');
      const data = productsRepo.updateVariant(input);
      return { success: true, data };
    } catch (error) {
      logger.error('product-variants', 'Error updating variant', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_VARIANTS.DELETE, (_, variantId: number): Result<void> => {
    try {
      // Only admin and store_manager can delete variants
      assertAdminOrManager();
      if (!variantId) throw new Error('Variant ID is required');
      productsRepo.deleteVariant(variantId);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('product-variants', `Error deleting variant ${String(variantId)}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // --- BARCODES ---

  ipcMain.handle(IPC_CHANNELS.BARCODES.LIST, (_, variantId: number): Result<BarcodeRow[]> => {
    try {
      if (!variantId) throw new Error('Variant ID is required');
      const data = productsRepo.listBarcodes(variantId);
      return { success: true, data };
    } catch (error) {
      logger.error('barcodes', 'Error listing barcodes', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BARCODES.ADD, (_, input: AddBarcodeInput): Result<BarcodeRow> => {
    try {
      if (!input.variant_id || !input.barcode || !input.barcode_type) {
        throw new Error('Variant ID, barcode, and type are required');
      }
      const data = productsRepo.addBarcode(input);
      return { success: true, data };
    } catch (error) {
      logger.error('barcodes', 'Error adding barcode', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BARCODES.DEACTIVATE, (_, id: number): Result<void> => {
    try {
      if (!id) throw new Error('Barcode ID is required');
      productsRepo.deactivateBarcode(id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('barcodes', 'Error deactivating barcode', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
