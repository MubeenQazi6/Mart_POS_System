// Input types for create/update operations
export interface CreateCategoryInput { name: string; description?: string; sort_order?: number; }
export interface UpdateCategoryInput { id: number; name?: string; description?: string; sort_order?: number; is_active?: boolean; }
export interface CreateBrandInput { name: string; }
export interface UpdateBrandInput { id: number; name?: string; is_active?: boolean; }
export interface CreateUnitInput { name: string; abbreviation: string; decimals: number; }
export interface UpdateUnitInput { id: number; name?: string; abbreviation?: string; decimals?: number; is_active?: boolean; }

// Product input types
export interface CreateVariantInput {
  variant_name: string;
  sku?: string;
  unit_id: number;
  purchase_price_minor: number;
  selling_price_minor: number;
  min_stock_alert?: number;
}
export interface CreateBarcodeInput {
  barcode: string;
  barcode_type: string;
  is_primary?: boolean;
}
export interface CreateProductInput {
  name: string;
  description?: string;
  category_id: number;
  brand_id?: number;
  variants: Array<CreateVariantInput & { barcodes?: CreateBarcodeInput[] }>;
}
export interface UpdateProductInput {
  id: number;
  name?: string;
  description?: string;
  category_id?: number;
  brand_id?: number | null;
  is_active?: boolean;
}
export interface UpdateVariantInput {
  id: number;
  variant_name?: string;
  sku?: string;
  unit_id?: number;
  purchase_price_minor?: number;
  selling_price_minor?: number;
  min_stock_alert?: number;
  is_active?: boolean;
}
export interface AddBarcodeInput {
  variant_id: number;
  barcode: string;
  barcode_type: string;
  is_primary?: boolean;
}

// Output/view types
export interface CategoryRow { id: number; name: string; description: string | null; sort_order: number; is_active: boolean; }
export interface BrandRow { id: number; name: string; is_active: boolean; }
export interface UnitRow { id: number; name: string; abbreviation: string; decimals: number; is_active: boolean; }
export interface BarcodeRow { id: number; variant_id: number; barcode: string; barcode_type: string; is_primary: boolean; is_active: boolean; created_at: string; }

export interface ProductVariantRow {
  id: number;
  product_id: number;
  variant_name: string;
  sku: string | null;
  unit_id: number;
  unit_name?: string | null;
  unit_abbreviation?: string | null;
  unit_decimals?: number | null;
  purchase_price_minor: number;
  selling_price_minor: number;
  min_stock_alert: number;
  available_stock?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  barcodes?: BarcodeRow[];
}

export interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  category_id: number;
  category_name?: string | null;
  brand_id: number | null;
  brand_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariantRow[];
  variant_count?: number;
}

export interface ProductSearchParams {
  search?: string;
  category_id?: number;
  brand_id?: number;
  is_active?: boolean;
}

// Print Job types
export type PrintJobStatus = 'pending' | 'printed' | 'failed';

export interface PrintJobRow {
  id: number;
  variant_id: number;
  barcode_id: number;
  quantity: number;
  status: PrintJobStatus;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  product_id?: number | null;
  product_name?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  barcode?: string | null;
  barcode_type?: string | null;
  selling_price_minor?: number | null;
}

export interface CreatePrintJobInput {
  variant_id: number;
  barcode_id: number;
  quantity: number;
}

export interface PrintJobSearchParams {
  status?: PrintJobStatus;
  search?: string;
}

