import { useState, useEffect } from 'react';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { Badge } from '@renderer/components/ui/Badge';
import { Modal } from '@renderer/components/ui/Modal';
import { ProductForm } from './ProductForm';
import { ProductDetails } from './ProductDetails';
import { CatalogManager } from '@renderer/features/catalog/CategoryManager';
import { Plus, Search, Package, Layers, ChevronRight } from 'lucide-react';
import type { ProductRow } from '@shared/types/catalog';

export function ProductList(): React.JSX.Element {
  const {
    products,
    categories,
    brands,
    loadProducts,
    loadCategories,
    loadBrands,
    searchParams,
    setSearchParams,
    isLoadingProducts,
    clearSelectedProduct,
  } = useCatalogStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCatalogManagerOpen, setIsCatalogManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);

  useEffect(() => {
    void loadProducts();
    void loadCategories();
    void loadBrands();
  }, [loadProducts, loadCategories, loadBrands]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams({ search: searchTerm || undefined });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, setSearchParams]);

  if (viewingProductId) {
    return (
      <ProductDetails
        productId={viewingProductId}
        onBack={() => {
          setViewingProductId(null);
          clearSelectedProduct();
          void loadProducts();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search product, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <Select
            placeholder="All Categories"
            value={searchParams.category_id ?? ''}
            onChange={(e) => {
              setSearchParams({
                category_id: e.target.value ? Number(e.target.value) : undefined,
              });
            }}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="w-40"
          />

          <Select
            placeholder="All Brands"
            value={searchParams.brand_id ?? ''}
            onChange={(e) => {
              setSearchParams({
                brand_id: e.target.value ? Number(e.target.value) : undefined,
              });
            }}
            options={[
              { value: '', label: 'All Brands' },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
            className="w-36"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="secondary"
            leftIcon={<Layers className="h-4 w-4" />}
            onClick={() => {
              setIsCatalogManagerOpen(true);
            }}
          >
            Manage Catalog
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setIsCreateOpen(true);
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Table */}
      <div className="rounded-xl border border-surface-border bg-white overflow-hidden shadow-sm dark:border-navy-700 dark:bg-navy-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-surface-border text-xs text-slate-500 uppercase tracking-wider dark:bg-navy-700 dark:border-navy-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Product Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Variants</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-navy-700">
            {isLoadingProducts ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                >
                  Loading products from SQLite database...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3 dark:bg-navy-700 dark:text-slate-500">
                      <Package className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      No products found
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm dark:text-slate-400">
                      {searchTerm
                        ? 'No products match your search query.'
                        : 'Get started by creating your first category, brand, and product.'}
                    </p>
                    {!searchTerm && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setIsCatalogManagerOpen(true);
                          }}
                        >
                          Setup Categories & Units
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsCreateOpen(true);
                          }}
                        >
                          Add First Product
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p: ProductRow) => (
                <tr
                  key={p.id}
                  onClick={() => {
                    setViewingProductId(p.id);
                  }}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors dark:hover:bg-navy-700/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs dark:text-slate-500">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium dark:text-slate-300">
                    {p.category_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {p.brand_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800">
                      {p.variant_count ?? 1} {p.variant_count === 1 ? 'Variant' : 'Variants'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? 'success' : 'neutral'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      rightIcon={<ChevronRight className="h-4 w-4" />}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Product */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
        }}
        title="Add New Product & Variants"
        size="lg"
      >
        <ProductForm
          onSuccess={() => {
            setIsCreateOpen(false);
            void loadProducts();
          }}
          onCancel={() => {
            setIsCreateOpen(false);
          }}
        />
      </Modal>

      {/* Modal: Catalog Manager (Categories, Brands, Units) */}
      <Modal
        isOpen={isCatalogManagerOpen}
        onClose={() => {
          setIsCatalogManagerOpen(false);
          void loadCategories();
          void loadBrands();
        }}
        title="Master Catalog Management"
        size="xl"
      >
        <CatalogManager />
      </Modal>
    </div>
  );
}
