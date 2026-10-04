import { useState, useEffect } from 'react';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { useBarcodeStore } from '@renderer/stores/barcodeStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { Badge } from '@renderer/components/ui/Badge';
import { Modal } from '@renderer/components/ui/Modal';
import { LabelPreview } from '@renderer/features/barcodes/LabelPreview';
import {
  formatMoneyFromMinor,
  parseMoneyToMinor,
  formatQuantityFromThousandths,
  parseQuantityToThousandths,
} from '@shared/utils/format';
import { showToast } from '@renderer/components/ui/Toast';
import {
  ArrowLeft,
  Plus,
  Barcode as BarcodeIcon,
  Tag,
  Edit2,
  Package,
  Printer,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { ProductVariantRow, BarcodeRow } from '@shared/types/catalog';

interface ProductDetailsProps {
  productId: number;
  onBack: () => void;
}

export function ProductDetails({ productId, onBack }: ProductDetailsProps): React.JSX.Element {
  const {
    selectedProduct,
    loadProductDetails,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    addBarcode,
    deactivateBarcode,
    units,
    loadUnits,
    categories,
    loadCategories,
    brands,
    loadBrands,
    isLoadingProductDetails,
  } = useCatalogStore();

  const { currentUser } = useAuthStore();
  const canManageCatalog = currentUser?.role === 'admin' || currentUser?.role === 'store_manager';

  const { generateInternalBarcode, createPrintJob } = useBarcodeStore();
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Mart POS';

  useEffect(() => {
    void loadProductDetails(productId);
    void loadUnits();
    void loadCategories();
    void loadBrands();
  }, [productId, loadProductDetails, loadUnits, loadCategories, loadBrands]);

  // Modal states
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [isAddBarcodeOpen, setIsAddBarcodeOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Label Preview & Print Queue Modals
  const [previewVariant, setPreviewVariant] = useState<{
    variant: ProductVariantRow;
    barcode: BarcodeRow;
  } | null>(null);
  const [queueModalVariant, setQueueModalVariant] = useState<{
    variant: ProductVariantRow;
    barcode: BarcodeRow;
  } | null>(null);
  const [queueQty, setQueueQty] = useState('10');

  // Edit Product Modal
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editBrandId, setEditBrandId] = useState<number | ''>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Delete Product Modal
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Edit Variant (Complete) Modal
  const [editVariant, setEditVariant] = useState<ProductVariantRow | null>(null);
  const [editVarName, setEditVarName] = useState('');
  const [editVarSku, setEditVarSku] = useState('');
  const [editVarUnitId, setEditVarUnitId] = useState<number | ''>('');
  const [editVarPurchasePrice, setEditVarPurchasePrice] = useState('');
  const [editVarSellingPrice, setEditVarSellingPrice] = useState('');
  const [editVarMinStock, setEditVarMinStock] = useState('0');
  const [editVarIsActive, setEditVarIsActive] = useState(true);
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  // Delete Variant Confirmation Modal
  const [variantToDelete, setVariantToDelete] = useState<ProductVariantRow | null>(null);
  const [isDeletingVariant, setIsDeletingVariant] = useState(false);

  // Add Variant Form
  const [newVarName, setNewVarName] = useState('');
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarUnitId, setNewVarUnitId] = useState<number | ''>('');
  const [newVarPurchasePrice, setNewVarPurchasePrice] = useState('');
  const [newVarSellingPrice, setNewVarSellingPrice] = useState('');

  // Add Barcode Form
  const [newBarcodeVal, setNewBarcodeVal] = useState('');
  const [newBarcodeType, setNewBarcodeType] = useState('EAN13');

  if (isLoadingProductDetails || !selectedProduct) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading product details...</p>
      </div>
    );
  }

  const handleCreateVariant = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (
      !newVarName.trim() ||
      typeof newVarUnitId !== 'number' ||
      !newVarPurchasePrice ||
      !newVarSellingPrice
    )
      return;

    const ok = await createVariant(selectedProduct.id, {
      variant_name: newVarName.trim(),
      sku: newVarSku.trim() || undefined,
      unit_id: newVarUnitId,
      purchase_price_minor: parseMoneyToMinor(newVarPurchasePrice),
      selling_price_minor: parseMoneyToMinor(newVarSellingPrice),
      min_stock_alert: 0,
    });

    if (ok) {
      setIsAddVariantOpen(false);
      setNewVarName('');
      setNewVarSku('');
      setNewVarUnitId('');
      setNewVarPurchasePrice('');
      setNewVarSellingPrice('');
    }
  };

  const handleAddBarcode = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedVariantId || !newBarcodeVal.trim()) return;

    const ok = await addBarcode({
      variant_id: selectedVariantId,
      barcode: newBarcodeVal.trim(),
      barcode_type: newBarcodeType,
      is_primary: false,
    });

    if (ok) {
      setIsAddBarcodeOpen(false);
      setNewBarcodeVal('');
    }
  };

  const handleGenerateInternalBarcode = async (variantId: number): Promise<void> => {
    const res = await generateInternalBarcode(variantId);
    if (res) {
      void loadProductDetails(selectedProduct.id);
    }
  };

  const handleQueueLabels = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!queueModalVariant) return;

    const qty = parseInt(queueQty, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      showToast('error', 'Quantity must be a positive integer');
      return;
    }

    const ok = await createPrintJob({
      variant_id: queueModalVariant.variant.id,
      barcode_id: queueModalVariant.barcode.id,
      quantity: qty,
    });

    if (ok) {
      setQueueModalVariant(null);
      setQueueQty('10');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Products
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {selectedProduct.name}
          </h2>
          <Badge variant={selectedProduct.is_active ? 'success' : 'neutral'}>
            {selectedProduct.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {canManageCatalog && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => {
                setEditName(selectedProduct.name);
                setEditDesc(selectedProduct.description || '');
                setEditCategoryId(selectedProduct.category_id);
                setEditBrandId(selectedProduct.brand_id || '');
                setEditIsActive(selectedProduct.is_active);
                setIsEditProductOpen(true);
              }}
            >
              Edit Product
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void updateProduct({ id: selectedProduct.id, is_active: !selectedProduct.is_active });
              }}
            >
              {selectedProduct.is_active ? 'Deactivate Product' : 'Activate Product'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => {
                setIsDeleteProductOpen(true);
              }}
            >
              Delete Product
            </Button>
          </div>
        )}
      </div>

      {/* Product Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-surface-border bg-white shadow-sm dark:bg-navy-800 dark:border-navy-700">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Category
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
            {selectedProduct.category_name || '—'}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Brand
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
            {selectedProduct.brand_name || '—'}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Variants
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
            {selectedProduct.variants?.length || 0}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Description
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {selectedProduct.description || 'No description'}
          </p>
        </div>
      </div>

      {/* Variants Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sellable Variants & SKUs
            </h3>
          </div>
          <Button
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              setIsAddVariantOpen(true);
            }}
          >
            Add Variant
          </Button>
        </div>

        <div className="rounded-xl border border-surface-border bg-white overflow-hidden shadow-sm dark:bg-navy-800 dark:border-navy-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-navy-700 border-b border-surface-border text-xs text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Variant</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Purchase Price</th>
                <th className="px-4 py-3 font-medium">Selling Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Barcodes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {selectedProduct.variants?.map((v: ProductVariantRow) => {
                const activeBarcodes = v.barcodes?.filter((b) => b.is_active) || [];
                const hasInternalBarcode = activeBarcodes.some(
                  (b) => b.barcode_type === 'INTERNAL',
                );
                const primaryBarcode =
                  activeBarcodes.find((b) => b.is_primary) || activeBarcodes[0] || null;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-700/70">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {v.variant_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {v.sku || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-700 font-mono text-xs">
                        {v.unit_abbreviation || 'PC'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatMoneyFromMinor(v.purchase_price_minor)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {formatMoneyFromMinor(v.selling_price_minor)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          (v.available_stock ?? 0) <= 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {formatQuantityFromThousandths(v.available_stock ?? 0, v.unit_decimals ?? 2)} {v.unit_abbreviation || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {activeBarcodes.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-700"
                          >
                            <BarcodeIcon className="h-3 w-3 text-slate-400" />
                            {b.barcode}
                            <span className="text-[9px] text-slate-400 font-sans">
                              ({b.barcode_type})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                void deactivateBarcode(b.id, v.id);
                              }}
                              className="text-slate-400 hover:text-red-500 ml-0.5"
                              title="Deactivate barcode"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {activeBarcodes.length === 0 && (
                          <span className="text-xs text-slate-400">No barcode</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={v.is_active ? 'success' : 'neutral'}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {/* Generate Internal Barcode (if missing) */}
                      {!hasInternalBarcode && v.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            void handleGenerateInternalBarcode(v.id);
                          }}
                          title="Generate Internal EAN-13 Barcode"
                          className="text-brand-600 hover:text-brand-700"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Preview Label Button */}
                      {primaryBarcode && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPreviewVariant({
                              variant: v,
                              barcode: primaryBarcode,
                            });
                          }}
                          title="Preview Label"
                        >
                          <BarcodeIcon className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                      )}

                      {/* Add to Print Queue Button */}
                      {primaryBarcode && v.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setQueueModalVariant({
                              variant: v,
                              barcode: primaryBarcode,
                            });
                          }}
                          title="Add Labels to Print Queue"
                        >
                          <Printer className="h-3.5 w-3.5 text-brand-600" />
                        </Button>
                      )}

                      {/* Edit Variant (Complete Details) Button - Admin/Manager only */}
                      {canManageCatalog && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditVariant(v);
                            setEditVarName(v.variant_name);
                            setEditVarSku(v.sku || '');
                            setEditVarUnitId(v.unit_id);
                            setEditVarPurchasePrice((v.purchase_price_minor / 100).toFixed(2));
                            setEditVarSellingPrice((v.selling_price_minor / 100).toFixed(2));
                            setEditVarMinStock(
                              v.min_stock_alert > 0 ? (v.min_stock_alert / 1000).toString() : '0'
                            );
                            setEditVarIsActive(v.is_active);
                          }}
                          title="Edit Variant Details"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Delete Variant Button - Admin/Manager only */}
                      {canManageCatalog && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setVariantToDelete(v);
                          }}
                          title="Delete Variant"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setIsAddBarcodeOpen(true);
                        }}
                        title="Add custom barcode"
                      >
                        <Tag className="h-3.5 w-3.5 text-slate-500" />
                      </Button>

                      {canManageCatalog && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            void updateVariant({ id: v.id, is_active: !v.is_active });
                          }}
                          className={
                            v.is_active
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-emerald-600 hover:text-emerald-700'
                          }
                        >
                          {v.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Variant */}
      <Modal
        isOpen={isAddVariantOpen}
        onClose={() => {
          setIsAddVariantOpen(false);
        }}
        title={`Add Variant to ${selectedProduct.name}`}
      >
        <form
          onSubmit={(e) => {
            void handleCreateVariant(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Variant Name"
            placeholder="e.g. 500 ML, 2 KG, Box of 24"
            value={newVarName}
            onChange={(e) => {
              setNewVarName(e.target.value);
            }}
            required
          />
          <Input
            label="SKU"
            placeholder="e.g. COCA-500ML"
            value={newVarSku}
            onChange={(e) => {
              setNewVarSku(e.target.value);
            }}
          />
          <Select
            label="Unit"
            value={newVarUnitId}
            onChange={(e) => {
              setNewVarUnitId(Number(e.target.value));
            }}
            options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))}
            required
            placeholder="Select a unit"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price (Rs.)"
              type="number"
              step="0.01"
              placeholder="e.g. 50.00"
              value={newVarPurchasePrice}
              onChange={(e) => {
                setNewVarPurchasePrice(e.target.value);
              }}
              required
            />
            <Input
              label="Selling Price (Rs.)"
              type="number"
              step="0.01"
              placeholder="e.g. 70.00"
              value={newVarSellingPrice}
              onChange={(e) => {
                setNewVarSellingPrice(e.target.value);
              }}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddVariantOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Add Variant</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Barcode */}
      <Modal
        isOpen={isAddBarcodeOpen}
        onClose={() => {
          setIsAddBarcodeOpen(false);
        }}
        title="Add Barcode to Variant"
      >
        <form
          onSubmit={(e) => {
            void handleAddBarcode(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Barcode Number"
            placeholder="Scan or enter barcode"
            value={newBarcodeVal}
            onChange={(e) => {
              setNewBarcodeVal(e.target.value);
            }}
            required
          />
          <Select
            label="Barcode Type"
            value={newBarcodeType}
            onChange={(e) => {
              setNewBarcodeType(e.target.value);
            }}
            options={[
              { value: 'EAN13', label: 'EAN-13 (Standard Retail)' },
              { value: 'CODE128', label: 'Code 128' },
              { value: 'INTERNAL', label: 'Internal Custom Barcode' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddBarcodeOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Barcode</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Product (Complete) */}
      <Modal
        isOpen={isEditProductOpen}
        onClose={() => {
          if (!isSavingProduct) setIsEditProductOpen(false);
        }}
        title={`Edit Product — ${selectedProduct.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editName.trim()) {
              showToast('error', 'Product name is required');
              return;
            }
            if (!editCategoryId) {
              showToast('error', 'Category is required');
              return;
            }
            void (async () => {
              setIsSavingProduct(true);
              try {
                const ok = await updateProduct({
                  id: selectedProduct.id,
                  name: editName.trim(),
                  description: editDesc.trim() || undefined,
                  category_id: Number(editCategoryId),
                  brand_id: editBrandId ? Number(editBrandId) : null,
                  is_active: editIsActive,
                });
                if (ok) setIsEditProductOpen(false);
              } finally {
                setIsSavingProduct(false);
              }
            })();
          }}
          className="space-y-4"
        >
          <Input
            label="Product Name"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
            }}
            required
          />
          <Input
            label="Description"
            value={editDesc}
            placeholder="Optional description"
            onChange={(e) => {
              setEditDesc(e.target.value);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={editCategoryId}
              onChange={(e) => {
                setEditCategoryId(e.target.value ? Number(e.target.value) : '');
              }}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              required
              placeholder="Select Category"
            />
            <Select
              label="Brand"
              value={editBrandId}
              onChange={(e) => {
                setEditBrandId(e.target.value ? Number(e.target.value) : '');
              }}
              options={[
                { value: '', label: 'None' },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
              placeholder="Select Brand (Optional)"
            />
          </div>
          <Select
            label="Status"
            value={editIsActive ? 'active' : 'inactive'}
            onChange={(e) => {
              setEditIsActive(e.target.value === 'active');
            }}
            options={[
              { value: 'active', label: 'Active (Available for Sale)' },
              { value: 'inactive', label: 'Inactive (Hidden from POS)' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditProductOpen(false);
              }}
              disabled={isSavingProduct}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingProduct}>
              Save Product Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Variant (Complete) */}
      <Modal
        isOpen={Boolean(editVariant)}
        onClose={() => {
          if (!isSavingVariant) setEditVariant(null);
        }}
        title={`Edit Variant — ${selectedProduct.name} (${editVariant?.variant_name ?? ''})`}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editVariant) return;
            if (!editVarName.trim()) {
              showToast('error', 'Variant name is required');
              return;
            }
            if (!editVarUnitId) {
              showToast('error', 'Unit is required');
              return;
            }
            const pPrice = parseMoneyToMinor(editVarPurchasePrice);
            const sPrice = parseMoneyToMinor(editVarSellingPrice);
            if (pPrice < 0 || sPrice <= 0) {
              showToast('error', 'Valid purchase and selling prices are required');
              return;
            }
            const minStockThousandths = parseQuantityToThousandths(editVarMinStock || '0');

            void (async () => {
              setIsSavingVariant(true);
              try {
                const ok = await updateVariant({
                  id: editVariant.id,
                  variant_name: editVarName.trim(),
                  sku: editVarSku.trim() || undefined,
                  unit_id: Number(editVarUnitId),
                  purchase_price_minor: pPrice,
                  selling_price_minor: sPrice,
                  min_stock_alert: minStockThousandths,
                  is_active: editVarIsActive,
                });
                if (ok) {
                  setEditVariant(null);
                }
              } finally {
                setIsSavingVariant(false);
              }
            })();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Variant Name"
              placeholder="e.g. 1 KG, 500 ML, Pack of 6"
              value={editVarName}
              onChange={(e) => {
                setEditVarName(e.target.value);
              }}
              required
            />
            <Input
              label="SKU (Barcode/Item Code)"
              placeholder="e.g. COCA-500ML"
              value={editVarSku}
              onChange={(e) => {
                setEditVarSku(e.target.value);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit of Measure"
              value={editVarUnitId}
              onChange={(e) => {
                setEditVarUnitId(Number(e.target.value));
              }}
              options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))}
              required
              placeholder="Select a unit"
            />
            <Input
              label="Low Stock Alert Level"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 5"
              value={editVarMinStock}
              onChange={(e) => {
                setEditVarMinStock(e.target.value);
              }}
              hint="Alert triggered when stock falls to or below this amount"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price (Rs.)"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 50.00"
              value={editVarPurchasePrice}
              onChange={(e) => {
                setEditVarPurchasePrice(e.target.value);
              }}
              required
            />
            <Input
              label="Selling Price (Rs.)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 70.00"
              value={editVarSellingPrice}
              onChange={(e) => {
                setEditVarSellingPrice(e.target.value);
              }}
              required
            />
          </div>

          <Select
            label="Variant Status"
            value={editVarIsActive ? 'active' : 'inactive'}
            onChange={(e) => {
              setEditVarIsActive(e.target.value === 'active');
            }}
            options={[
              { value: 'active', label: 'Active (Available for Sale)' },
              { value: 'inactive', label: 'Inactive (Hidden from POS)' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setEditVariant(null);
              }}
              disabled={isSavingVariant}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingVariant}>
              Save Variant Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Product Confirmation */}
      <Modal
        isOpen={isDeleteProductOpen}
        onClose={() => {
          if (!isDeletingProduct) setIsDeleteProductOpen(false);
        }}
        title="Delete Product Confirmation"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">
                Are you sure you want to delete &ldquo;{selectedProduct.name}&rdquo;?
              </p>
              <p>
                This will delete the product and all its {selectedProduct.variants?.length || 0} variant(s).
              </p>
              <p className="text-slate-600 dark:text-slate-300 pt-1">
                <strong>Historical Protection:</strong> If this product was ever used in completed sales receipts, purchase orders, returns, or stock adjustments, its historical data and audit trails will remain 100% intact and unaffected. It will simply be removed from active catalog and POS screens.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteProductOpen(false);
              }}
              disabled={isDeletingProduct}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeletingProduct}
              onClick={() => {
                void (async () => {
                  setIsDeletingProduct(true);
                  try {
                    const ok = await deleteProduct(selectedProduct.id);
                    if (ok) {
                      setIsDeleteProductOpen(false);
                      onBack();
                    }
                  } finally {
                    setIsDeletingProduct(false);
                  }
                })();
              }}
            >
              Confirm Delete Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete Variant Confirmation */}
      <Modal
        isOpen={Boolean(variantToDelete)}
        onClose={() => {
          if (!isDeletingVariant) setVariantToDelete(null);
        }}
        title="Delete Variant Confirmation"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">
                Are you sure you want to delete variant &ldquo;{variantToDelete?.variant_name}&rdquo;?
              </p>
              <p>
                SKU: {variantToDelete?.sku || 'None'} | Selling Price: Rs. {variantToDelete ? (variantToDelete.selling_price_minor / 100).toFixed(2) : ''}
              </p>
              <p className="text-slate-600 dark:text-slate-300 pt-1">
                <strong>Historical Protection:</strong> If this variant has past transaction history (receipts, stock logs, returns), all past customer bills and financial reports will remain completely intact. The variant and its barcodes will be safely deactivated and removed from the active catalog.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setVariantToDelete(null);
              }}
              disabled={isDeletingVariant}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeletingVariant}
              onClick={() => {
                if (!variantToDelete) return;
                void (async () => {
                  setIsDeletingVariant(true);
                  try {
                    const ok = await deleteVariant(variantToDelete.id);
                    if (ok) {
                      setVariantToDelete(null);
                    }
                  } finally {
                    setIsDeletingVariant(false);
                  }
                })();
              }}
            >
              Confirm Delete Variant
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Preview Label */}
      {previewVariant && (
        <Modal
          isOpen={Boolean(previewVariant)}
          onClose={() => {
            setPreviewVariant(null);
          }}
          title={`Label Preview — ${selectedProduct.name} (${previewVariant.variant.variant_name})`}
        >
          <div className="flex flex-col items-center justify-center space-y-4 py-3">
            <LabelPreview
              productName={selectedProduct.name}
              variantName={previewVariant.variant.variant_name}
              sellingPriceMinor={previewVariant.variant.selling_price_minor}
              barcode={previewVariant.barcode.barcode}
              barcodeType={previewVariant.barcode.barcode_type}
              storeName={storeName}
            />
            <div className="flex justify-end w-full pt-3 border-t border-surface-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewVariant(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Add to Print Queue */}
      {queueModalVariant && (
        <Modal
          isOpen={Boolean(queueModalVariant)}
          onClose={() => {
            setQueueModalVariant(null);
          }}
          title={`Add Labels to Queue — ${selectedProduct.name} (${queueModalVariant.variant.variant_name})`}
        >
          <form
            onSubmit={(e) => {
              void handleQueueLabels(e);
            }}
            className="space-y-4"
          >
            <div className="flex justify-center py-2">
              <LabelPreview
                productName={selectedProduct.name}
                variantName={queueModalVariant.variant.variant_name}
                sellingPriceMinor={queueModalVariant.variant.selling_price_minor}
                barcode={queueModalVariant.barcode.barcode}
                barcodeType={queueModalVariant.barcode.barcode_type}
                storeName={storeName}
              />
            </div>
            <Input
              label="Number of Labels to Print (Stickers)"
              type="number"
              min="1"
              step="1"
              value={queueQty}
              onChange={(e) => {
                setQueueQty(e.target.value);
              }}
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setQueueModalVariant(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Printer className="h-4 w-4" />}>
                Add to Print Queue
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
