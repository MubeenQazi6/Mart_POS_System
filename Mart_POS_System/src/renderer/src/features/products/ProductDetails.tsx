import { useState, useEffect } from 'react';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { useBarcodeStore } from '@renderer/stores/barcodeStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { Badge } from '@renderer/components/ui/Badge';
import { Modal } from '@renderer/components/ui/Modal';
import { LabelPreview } from '@renderer/features/barcodes/LabelPreview';
import { formatMoneyFromMinor, parseMoneyToMinor, formatQuantityFromThousandths } from '@shared/utils/format';
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
    createVariant,
    updateVariant,
    addBarcode,
    deactivateBarcode,
    units,
    loadUnits,
    isLoadingProductDetails,
  } = useCatalogStore();

  const { generateInternalBarcode, createPrintJob } = useBarcodeStore();
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Mart POS';

  useEffect(() => {
    void loadProductDetails(productId);
    void loadUnits();
  }, [productId, loadProductDetails, loadUnits]);

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

  // Edit Variant Prices Modal
  const [editVariant, setEditVariant] = useState<ProductVariantRow | null>(null);
  const [editVarPurchasePrice, setEditVarPurchasePrice] = useState('');
  const [editVarSellingPrice, setEditVarSellingPrice] = useState('');

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

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            onClick={() => {
              setEditName(selectedProduct.name);
              setEditDesc(selectedProduct.description || '');
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
        </div>
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

                      {/* Edit Variant Prices Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditVariant(v);
                          setEditVarPurchasePrice((v.purchase_price_minor / 100).toFixed(2));
                          setEditVarSellingPrice((v.selling_price_minor / 100).toFixed(2));
                        }}
                        title="Edit Variant Prices"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

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

      {/* Modal: Edit Product */}
      <Modal
        isOpen={isEditProductOpen}
        onClose={() => {
          setIsEditProductOpen(false);
        }}
        title="Edit Product Info"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editName.trim()) return;
            void (async () => {
              const ok = await updateProduct({
                id: selectedProduct.id,
                name: editName.trim(),
                description: editDesc.trim() || undefined,
              });
              if (ok) setIsEditProductOpen(false);
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
            onChange={(e) => {
              setEditDesc(e.target.value);
            }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditProductOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Variant Prices */}
      <Modal
        isOpen={Boolean(editVariant)}
        onClose={() => {
          setEditVariant(null);
        }}
        title={`Update Prices — ${selectedProduct.name} (${editVariant?.variant_name ?? ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editVariant) return;
            const pPrice = parseMoneyToMinor(editVarPurchasePrice);
            const sPrice = parseMoneyToMinor(editVarSellingPrice);
            if (pPrice <= 0 || sPrice <= 0) {
              showToast('error', 'Prices must be greater than zero');
              return;
            }
            void (async () => {
              const ok = await updateVariant({
                id: editVariant.id,
                purchase_price_minor: pPrice,
                selling_price_minor: sPrice,
              });
              if (ok) {
                setEditVariant(null);
              }
            })();
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-slate-50 dark:bg-navy-900 rounded-lg border border-surface-border text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Variant:</span> {editVariant?.variant_name}
            {editVariant?.sku ? ` | SKU: ${editVariant.sku}` : ''}
            {editVariant?.unit_abbreviation ? ` | Unit: ${editVariant.unit_abbreviation}` : ''}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Price (Rs.)"
              type="number"
              step="0.01"
              min="0.01"
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
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setEditVariant(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Updated Prices</Button>
          </div>
        </form>
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
