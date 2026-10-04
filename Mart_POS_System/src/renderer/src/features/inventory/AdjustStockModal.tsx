import { useState, useCallback } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { useInventoryStore } from '@renderer/stores/inventoryStore';
import {
  parseQuantityToThousandths,
  formatQuantityFromThousandths,
} from '@shared/utils/format';
import type { StockSummaryRow, AdjustmentType, MovementDirection } from '@shared/types/inventory';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: StockSummaryRow | null;
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: 'opening_stock', label: 'Opening Stock' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
];

const DIRECTION_OPTIONS = [
  { value: 'in', label: 'Stock In (+)' },
  { value: 'out', label: 'Stock Out (−)' },
];

interface FormState {
  adjustment_type: AdjustmentType;
  direction: MovementDirection;
  quantity: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  adjustment_type: 'opening_stock',
  direction: 'in',
  quantity: '',
  notes: '',
};

function getRequiresNotes(type: AdjustmentType): boolean {
  return type === 'manual_adjustment' || type === 'damage' || type === 'expiry';
}

function getRequiresDirection(type: AdjustmentType): boolean {
  return type === 'manual_adjustment';
}

export function AdjustStockModal({
  isOpen,
  onClose,
  variant,
}: AdjustStockModalProps): React.JSX.Element | null {
  const { createAdjustment } = useInventoryStore();
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setErrors({});
    onClose();
  }, [onClose]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    const qtyThousandths = parseQuantityToThousandths(form.quantity);
    if (!form.quantity.trim() || qtyThousandths <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (getRequiresNotes(form.adjustment_type) && !form.notes.trim()) {
      newErrors.notes = 'Notes are required for this adjustment type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!variant || !validate()) return;

    setIsSubmitting(true);
    try {
      const quantityThousandths = parseQuantityToThousandths(form.quantity);
      const success = await createAdjustment({
        variant_id: variant.variant_id,
        adjustment_type: form.adjustment_type,
        direction: getRequiresDirection(form.adjustment_type) ? form.direction : undefined,
        quantity: quantityThousandths,
        notes: form.notes.trim() || undefined,
      });
      if (success) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const decimals = variant?.unit_decimals ?? 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Stock Adjustment"
      description={
        variant
          ? `${variant.product_name} — ${variant.variant_name}${variant.sku ? ` (${variant.sku})` : ''}`
          : ''
      }
      size="sm"
    >
      {variant && (
        <div className="mb-4 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Current Stock</span>
            <span className="font-semibold text-slate-800">
              {formatQuantityFromThousandths(variant.current_stock, decimals)}{' '}
              {variant.unit_abbreviation ?? ''}
            </span>
          </div>
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Select
          id="adjust-type"
          label="Adjustment Type"
          required
          options={ADJUSTMENT_TYPE_OPTIONS}
          value={form.adjustment_type}
          onChange={(e) => { setField('adjustment_type', e.target.value as AdjustmentType); }}
        />

        {getRequiresDirection(form.adjustment_type) && (
          <Select
            id="adjust-direction"
            label="Direction"
            required
            options={DIRECTION_OPTIONS}
            value={form.direction}
            onChange={(e) => { setField('direction', e.target.value as MovementDirection); }}
            error={errors.direction}
          />
        )}

        <Input
          id="adjust-quantity"
          label="Quantity"
          type="number"
          required
          min="0.001"
          step="any"
          placeholder={`e.g. 10${decimals > 0 ? '.5' : ''}`}
          value={form.quantity}
          onChange={(e) => { setField('quantity', e.target.value); }}
          error={errors.quantity}
          hint={
            form.quantity && parseQuantityToThousandths(form.quantity) > 0
              ? `= ${formatQuantityFromThousandths(parseQuantityToThousandths(form.quantity), decimals)} ${variant?.unit_abbreviation ?? ''}`
              : undefined
          }
        />

        <Input
          id="adjust-notes"
          label={getRequiresNotes(form.adjustment_type) ? 'Notes' : 'Notes (optional)'}
          type="text"
          required={getRequiresNotes(form.adjustment_type)}
          placeholder={
            form.adjustment_type === 'manual_adjustment'
              ? 'Reason for adjustment…'
              : form.adjustment_type === 'damage'
                ? 'Describe the damage…'
                : form.adjustment_type === 'expiry'
                  ? 'Describe expiry details…'
                  : 'Optional notes…'
          }
          value={form.notes}
          onChange={(e) => { setField('notes', e.target.value); }}
          error={errors.notes}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
