import { create } from 'zustand';
import type { 
  CategoryRow, BrandRow, UnitRow, ProductRow, ProductSearchParams,
  CreateCategoryInput, UpdateCategoryInput,
  CreateBrandInput, UpdateBrandInput,
  CreateUnitInput, UpdateUnitInput,
  CreateProductInput, UpdateProductInput,
  CreateVariantInput, UpdateVariantInput,
  AddBarcodeInput
} from '@shared/types/catalog';
import { showToast } from '@renderer/components/ui/Toast';

interface CatalogState {
  // Master data
  categories: CategoryRow[];
  brands: BrandRow[];
  units: UnitRow[];
  products: ProductRow[];
  selectedProduct: ProductRow | null;

  // Loading states
  isLoadingCategories: boolean;
  isLoadingBrands: boolean;
  isLoadingUnits: boolean;
  isLoadingProducts: boolean;
  isLoadingProductDetails: boolean;

  // Search & Filter
  searchParams: ProductSearchParams;

  // Actions
  setSearchParams: (params: Partial<ProductSearchParams>) => void;
  loadCategories: () => Promise<void>;
  loadBrands: () => Promise<void>;
  loadUnits: () => Promise<void>;
  loadProducts: () => Promise<void>;
  loadProductDetails: (id: number) => Promise<void>;
  clearSelectedProduct: () => void;

  createCategory: (input: CreateCategoryInput) => Promise<boolean>;
  updateCategory: (input: UpdateCategoryInput) => Promise<boolean>;

  createBrand: (input: CreateBrandInput) => Promise<boolean>;
  updateBrand: (input: UpdateBrandInput) => Promise<boolean>;

  createUnit: (input: CreateUnitInput) => Promise<boolean>;
  updateUnit: (input: UpdateUnitInput) => Promise<boolean>;

  createProduct: (input: CreateProductInput) => Promise<ProductRow | null>;
  updateProduct: (input: UpdateProductInput) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;

  createVariant: (productId: number, input: CreateVariantInput) => Promise<boolean>;
  updateVariant: (input: UpdateVariantInput) => Promise<boolean>;
  deleteVariant: (variantId: number) => Promise<boolean>;

  addBarcode: (input: AddBarcodeInput) => Promise<boolean>;
  deactivateBarcode: (id: number, variantId?: number) => Promise<boolean>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  categories: [],
  brands: [],
  units: [],
  products: [],
  selectedProduct: null,

  isLoadingCategories: false,
  isLoadingBrands: false,
  isLoadingUnits: false,
  isLoadingProducts: false,
  isLoadingProductDetails: false,

  searchParams: {},

  setSearchParams: (params) => {
    set((state) => ({ searchParams: { ...state.searchParams, ...params } }));
    void get().loadProducts();
  },

  loadCategories: async () => {
    if (!window.martpos) return;
    set({ isLoadingCategories: true });
    try {
      const res = await window.martpos.catalog.listCategories();
      if (res.success) {
        set({ categories: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingCategories: false });
    }
  },

  loadBrands: async () => {
    if (!window.martpos) return;
    set({ isLoadingBrands: true });
    try {
      const res = await window.martpos.catalog.listBrands();
      if (res.success) {
        set({ brands: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingBrands: false });
    }
  },

  loadUnits: async () => {
    if (!window.martpos) return;
    set({ isLoadingUnits: true });
    try {
      const res = await window.martpos.catalog.listUnits();
      if (res.success) {
        set({ units: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingUnits: false });
    }
  },

  loadProducts: async () => {
    if (!window.martpos) return;
    set({ isLoadingProducts: true });
    try {
      const res = await window.martpos.products.list(get().searchParams);
      if (res.success) {
        set({ products: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingProducts: false });
    }
  },

  loadProductDetails: async (id: number) => {
    if (!window.martpos) return;
    set({ isLoadingProductDetails: true });
    try {
      const res = await window.martpos.products.get(id);
      if (res.success) {
        set({ selectedProduct: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingProductDetails: false });
    }
  },

  clearSelectedProduct: () => {
    set({ selectedProduct: null });
  },

  createCategory: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.createCategory(input);
    if (res.success) {
      showToast('success', `Category "${res.data.name}" created`);
      void get().loadCategories();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updateCategory: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.updateCategory(input);
    if (res.success) {
      showToast('success', `Category updated`);
      void get().loadCategories();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  createBrand: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.createBrand(input);
    if (res.success) {
      showToast('success', `Brand "${res.data.name}" created`);
      void get().loadBrands();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updateBrand: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.updateBrand(input);
    if (res.success) {
      showToast('success', `Brand updated`);
      void get().loadBrands();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  createUnit: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.createUnit(input);
    if (res.success) {
      showToast('success', `Unit "${res.data.name}" created`);
      void get().loadUnits();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updateUnit: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.catalog.updateUnit(input);
    if (res.success) {
      showToast('success', `Unit updated`);
      void get().loadUnits();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  createProduct: async (input) => {
    if (!window.martpos) return null;
    const res = await window.martpos.products.create(input);
    if (res.success) {
      showToast('success', `Product "${res.data.name}" created`);
      void get().loadProducts();
      return res.data;
    }
    showToast('error', res.error);
    return null;
  },

  updateProduct: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.products.update(input);
    if (res.success) {
      showToast('success', `Product updated`);
      void get().loadProducts();
      if (get().selectedProduct?.id === input.id) {
        void get().loadProductDetails(input.id);
      }
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  deleteProduct: async (id) => {
    if (!window.martpos) return false;
    const res = await window.martpos.products.delete(id);
    if (res.success) {
      showToast('success', 'Product deleted successfully');
      if (get().selectedProduct?.id === id) {
        get().clearSelectedProduct();
      }
      void get().loadProducts();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  createVariant: async (productId, input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.productVariants.create(productId, input);
    if (res.success) {
      showToast('success', `Variant "${res.data.variant_name}" created`);
      void get().loadProductDetails(productId);
      void get().loadProducts();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updateVariant: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.productVariants.update(input);
    if (res.success) {
      showToast('success', `Variant updated`);
      const prod = get().selectedProduct;
      if (prod) void get().loadProductDetails(prod.id);
      void get().loadProducts();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  deleteVariant: async (variantId) => {
    if (!window.martpos) return false;
    const res = await window.martpos.productVariants.delete(variantId);
    if (res.success) {
      showToast('success', 'Variant deleted successfully');
      const prod = get().selectedProduct;
      if (prod) void get().loadProductDetails(prod.id);
      void get().loadProducts();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  addBarcode: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.barcodes.add(input);
    if (res.success) {
      showToast('success', `Barcode "${res.data.barcode}" added`);
      const prod = get().selectedProduct;
      if (prod) void get().loadProductDetails(prod.id);
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  deactivateBarcode: async (id) => {
    if (!window.martpos) return false;
    const res = await window.martpos.barcodes.deactivate(id);
    if (res.success) {
      showToast('info', 'Barcode deactivated');
      const prod = get().selectedProduct;
      if (prod) void get().loadProductDetails(prod.id);
      return true;
    }
    showToast('error', res.error);
    return false;
  },
}));
