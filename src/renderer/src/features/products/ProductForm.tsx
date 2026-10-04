import { useState, useEffect, useRef } from 'react';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { parseMoneyToMinor, parseQuantityToThousandths } from '@shared/utils/format';
import { ArrowRight, ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import type { CreateProductInput } from '@shared/types/catalog';

interface ProductFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type BarcodeType = 'EAN13' | 'CODE128' | 'INTERNAL';

interface VariantFormData {
  variant_name: string;
  sku: string;
  unit_id: number;
  purchase_price: string;
  selling_price: string;
  min_stock_alert: string;
  barcode: string;
  barcode_type: BarcodeType;
}

function createEmptyVariant(defaultUnitId: number, defaultAlert = '0'): VariantFormData {
  return {
    variant_name: '',
    sku: '',
    unit_id: defaultUnitId,
    purchase_price: '',
    selling_price: '',
    min_stock_alert: defaultAlert,
    barcode: '',
    barcode_type: 'EAN13',
  };
}

export function ProductForm({ onSuccess, onCancel }: ProductFormProps): React.JSX.Element {
  const { categories, brands, units, loadCategories, loadBrands, loadUnits, createProduct } =
    useCatalogStore();
  const { settings } = useSettingsStore();

  const defaultAlertStr = settings['inventory.low_stock_threshold']
    ? (settings['inventory.low_stock_threshold'] / 1000).toString()
    : '5';

  useEffect(() => {
    void loadCategories();
    void loadBrands();
    void loadUnits();
  }, [loadCategories, loadBrands, loadUnits]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Product Basics
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  // Step 2 & 3: Variants
  const [variants, setVariants] = useState<VariantFormData[]>([
    { ...createEmptyVariant(units[0]?.id ?? 1, defaultAlertStr), variant_name: 'Standard' },
  ]);

  // Units load asynchronously after mount, so the very first variant may have
  // been created with a placeholder unit_id. Once units arrive, backfill any
  // variant still sitting on that placeholder with the matching default unit.
  const hasSyncedDefaultUnit = useRef(false);
  useEffect(() => {
    if (hasSyncedDefaultUnit.current || units.length === 0) return;
    hasSyncedDefaultUnit.current = true;
    const defaultUnitName = settings['inventory.default_unit']?.toLowerCase();
    const matchedUnit = units.find(
      (u) =>
        u.name.toLowerCase() === defaultUnitName ||
        u.abbreviation.toLowerCase() === defaultUnitName,
    );
    const targetUnitId = matchedUnit ? matchedUnit.id : (units[0]?.id ?? 1);
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        unit_id: targetUnitId,
        min_stock_alert: v.min_stock_alert === '0' ? defaultAlertStr : v.min_stock_alert,
      })),
    );
  }, [units, settings, defaultAlertStr]);

  const handleAddVariant = (): void => {
    const defaultUnitName = settings['inventory.default_unit']?.toLowerCase();
    const matchedUnit = units.find(
      (u) =>
        u.name.toLowerCase() === defaultUnitName ||
        u.abbreviation.toLowerCase() === defaultUnitName,
    );
    const targetUnitId = matchedUnit ? matchedUnit.id : (units[0]?.id ?? 1);
    setVariants((prev) => [...prev, createEmptyVariant(targetUnitId, defaultAlertStr)]);
  };

  const handleRemoveVariant = (index: number): void => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantField = <K extends keyof VariantFormData>(
    index: number,
    field: K,
    value: VariantFormData[K],
  ): void => {
    setVariants((prev) => {
      const next = [...prev];
      const target = next[index] ?? createEmptyVariant(units[0]?.id ?? 1);
      next[index] = { ...target, [field]: value };
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    if (!productName.trim() || !categoryId) return;
    setIsSubmitting(true);

    try {
      const payload: CreateProductInput = {
        name: productName.trim(),
        description: description.trim() || undefined,
        category_id: typeof categoryId === 'number' ? categoryId : 1,
        brand_id: typeof brandId === 'number' ? brandId : undefined,
        variants: variants.map((v) => ({
          variant_name: v.variant_name.trim() || 'Standard',
          sku: v.sku.trim() || undefined,
          unit_id: v.unit_id,
          purchase_price_minor: parseMoneyToMinor(v.purchase_price),
          selling_price_minor: parseMoneyToMinor(v.selling_price),
          min_stock_alert: parseQuantityToThousandths(v.min_stock_alert),
          barcodes: v.barcode.trim()
            ? [
                {
                  barcode: v.barcode.trim(),
                  barcode_type: v.barcode_type,
                  is_primary: true,
                },
              ]
            : undefined,
        })),
      };

      const result = await createProduct(payload);
      if (result) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            1
          </div>
          <span
            className={`text-xs font-medium ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Product Info
          </span>

          <div className="h-0.5 w-6 bg-slate-200" />

          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            2
          </div>
          <span
            className={`text-xs font-medium ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Variants & Pricing
          </span>

          <div className="h-0.5 w-6 bg-slate-200" />

          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 3 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            3
          </div>
          <span
            className={`text-xs font-medium ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Barcodes & Review
          </span>
        </div>
      </div>

      {/* STEP 1: Basic Information */}
      {step === 1 && (
        <div className="space-y-[0.25rem] max-w-lg mx-auto">
          <Input
            label="Product Name"
            placeholder="e.g. Sugar, Coca Cola, KitKat"
            value={productName}
            onChange={(e) => {
              setProductName(e.target.value);
            }}
            required
            hint="The generic product or master brand name"
          />

          <Select
            label="Category"
            placeholder="Select a category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value ? Number(e.target.value) : '');
            }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          <Select
            label="Brand"
            placeholder="Select a brand (Optional)"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value ? Number(e.target.value) : '');
            }}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />

          <Input
            label="Description"
            placeholder="Optional notes or specification"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              disabled={!productName.trim() || !categoryId}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                setStep(2);
              }}
            >
              Continue to Variants
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Variants & Pricing */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Add all sellable pack sizes or packages (e.g. 1 KG, 500 ML, Pack of 6).
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleAddVariant}
            >
              Add Another Variant
            </Button>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-surface-border bg-slate-50/70 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Variant #{idx + 1}</span>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveVariant(idx);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Remove variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Variant Name"
                    placeholder="e.g. 1 KG, 500 ML, Single"
                    value={v.variant_name}
                    onChange={(e) => {
                      updateVariantField(idx, 'variant_name', e.target.value);
                    }}
                    required
                  />
                  <Input
                    label="SKU"
                    placeholder="e.g. SUGAR-1KG"
                    value={v.sku}
                    onChange={(e) => {
                      updateVariantField(idx, 'sku', e.target.value);
                    }}
                  />
                  <Select
                    label="Unit"
                    value={v.unit_id}
                    onChange={(e) => {
                      updateVariantField(idx, 'unit_id', Number(e.target.value));
                    }}
                    options={units.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.abbreviation})`,
                    }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Purchase Price (Rs.)"
                    placeholder="e.g. 100.00"
                    type="number"
                    step="0.01"
                    value={v.purchase_price}
                    onChange={(e) => {
                      updateVariantField(idx, 'purchase_price', e.target.value);
                    }}
                    required
                  />
                  <Input
                    label="Selling Price (Rs.)"
                    placeholder="e.g. 120.00"
                    type="number"
                    step="0.01"
                    value={v.selling_price}
                    onChange={(e) => {
                      updateVariantField(idx, 'selling_price', e.target.value);
                    }}
                    required
                  />
                  <Input
                    label="Min Stock Alert"
                    placeholder="e.g. 5"
                    type="number"
                    value={v.min_stock_alert}
                    onChange={(e) => {
                      updateVariantField(idx, 'min_stock_alert', e.target.value);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => {
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button
              disabled={variants.some(
                (v) => !v.variant_name.trim() || !v.purchase_price || !v.selling_price,
              )}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                setStep(3);
              }}
            >
              Continue to Barcodes
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Barcodes & Review */}
      {step === 3 && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            Map existing barcode labels or enter internal codes for each variant.
          </p>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-surface-border bg-slate-50/70 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800">
                    {productName} — {v.variant_name || `Variant #${(idx + 1).toString()}`}
                  </span>
                  <span className="text-xs text-slate-500">Rs. {v.selling_price || '0.00'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Barcode Value"
                    placeholder="Scan or enter barcode number"
                    value={v.barcode}
                    onChange={(e) => {
                      updateVariantField(idx, 'barcode', e.target.value);
                    }}
                    hint="e.g. 896400012345 or 291000100001"
                  />
                  <Select
                    label="Barcode Type"
                    value={v.barcode_type}
                    onChange={(e) => {
                      updateVariantField(idx, 'barcode_type', e.target.value as BarcodeType);
                    }}
                    options={[
                      { value: 'EAN13', label: 'EAN-13 (Standard Retail)' },
                      { value: 'CODE128', label: 'Code 128' },
                      { value: 'INTERNAL', label: 'Internal Custom Barcode' },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => {
                setStep(2);
              }}
            >
              Back
            </Button>
            <Button
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4" />}
              onClick={() => {
                void handleSubmit();
              }}
            >
              Create Product ({variants.length} {variants.length === 1 ? 'Variant' : 'Variants'})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
