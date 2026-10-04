import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { usePurchasesStore } from '@renderer/stores/purchasesStore';
import { useSuppliersStore } from '@renderer/stores/suppliersStore';
import { useInventoryStore } from '@renderer/stores/inventoryStore';
import { parseQuantityToThousandths, parseMoneyToMinor } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import type { PurchaseItemInput, PurchasePaymentInput } from '@shared/types/purchases';
import { Plus, Trash2 } from 'lucide-react';

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemRowState {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  unit_abbreviation: string | null;
  unit_decimals: number;
  quantityStr: string;
  unitCostStr: string;
}

export function CreatePurchaseModal({
  isOpen,
  onClose,
}: CreatePurchaseModalProps): React.JSX.Element | null {
  const { createPurchase } = usePurchasesStore();
  const { suppliers, loadSuppliers } = useSuppliersStore();
  const { stockSummary, loadStockSummary } = useInventoryStore();

  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [items, setItems] = useState<ItemRowState[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [discountStr, setDiscountStr] = useState('');
  const [taxStr, setTaxStr] = useState('');
  const [paidStr, setPaidStr] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'other'>('cash');
  const [updateVariantCost, setUpdateVariantCost] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadSuppliers();
      void loadStockSummary();
      setSupplierId('');
      setSupplierInvoiceNo('');
      setItems([]);
      setSelectedVariantId('');
      setDiscountStr('');
      setTaxStr('');
      setPaidStr('');
      setUpdateVariantCost(false);
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, loadSuppliers, loadStockSummary]);

  const handleAddItem = (): void => {
    if (!selectedVariantId) return;
    const vId = Number(selectedVariantId);
    const existing = stockSummary.find((s) => s.variant_id === vId);
    if (!existing) return;

    if (items.some((i) => i.variant_id === vId)) {
      setErrorMsg('This product variant is already added to the purchase order');
      return;
    }

    setErrorMsg(null);
    setItems((prev) => [
      ...prev,
      {
        variant_id: vId,
        product_name: existing.product_name,
        variant_name: existing.variant_name,
        sku: existing.sku,
        unit_abbreviation: existing.unit_abbreviation,
        unit_decimals: existing.unit_decimals || 0,
        quantityStr: '1',
        unitCostStr: (existing.purchase_price_minor / 100).toString(),
      },
    ]);
    setSelectedVariantId('');
  };

  const handleRemoveItem = (index: number): void => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantityStr' | 'unitCostStr',
    value: string,
  ): void => {
    setItems((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        next[index] = { ...target, [field]: value };
      }
      return next;
    });
  };

  // Calculations
  let subtotalMinor = 0;
  for (const item of items) {
    const qtyThousandths = parseQuantityToThousandths(item.quantityStr);
    const costMinor = parseMoneyToMinor(item.unitCostStr);
    if (qtyThousandths > 0 && costMinor >= 0) {
      subtotalMinor += Math.round((qtyThousandths * costMinor) / 1000);
    }
  }

  const discountMinor = discountStr ? parseMoneyToMinor(discountStr) : 0;
  const taxMinor = taxStr ? parseMoneyToMinor(taxStr) : 0;
  const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor);
  const paidMinor = paidStr ? parseMoneyToMinor(paidStr) : 0;
  const balanceMinor = Math.max(0, totalMinor - paidMinor);

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Please add at least one product item to the purchase order');
      return;
    }

    const payloadItems: PurchaseItemInput[] = [];
    for (const item of items) {
      const qtyThousandths = parseQuantityToThousandths(item.quantityStr);
      const costMinor = parseMoneyToMinor(item.unitCostStr);
      if (qtyThousandths <= 0) {
        setErrorMsg(`Invalid quantity for ${item.product_name} (${item.variant_name})`);
        return;
      }
      if (costMinor < 0) {
        setErrorMsg(`Invalid unit cost for ${item.product_name} (${item.variant_name})`);
        return;
      }
      payloadItems.push({
        variant_id: item.variant_id,
        quantity: qtyThousandths,
        unit_cost_minor: costMinor,
      });
    }

    const payloadPayments: PurchasePaymentInput[] = [];
    if (paidMinor > 0) {
      payloadPayments.push({
        payment_method: payMethod,
        amount_minor: paidMinor,
      });
    }

    setIsSubmitting(true);
    try {
      const res = await createPurchase({
        supplier_id: Number(supplierId),
        supplier_invoice_number: supplierInvoiceNo.trim() || undefined,
        items: payloadItems,
        discount_minor: discountMinor,
        tax_minor: taxMinor,
        payments: payloadPayments,
        update_variant_cost: updateVariantCost,
        notes: notes.trim() || undefined,
      });

      if (res) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierOptions = [
    { value: '', label: '— Select Supplier —' },
    ...suppliers.map((s) => ({
      value: String(s.id),
      label: `${s.name}${s.contact_person ? ` (${s.contact_person})` : ''}`,
    })),
  ];

  const variantOptions = [
    ...stockSummary.map((s) => ({
      value: String(s.variant_id),
      label: `${s.product_name} — ${s.variant_name}${s.sku ? ` (${s.sku})` : ''}`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Receiving Order"
      description="Record supplier inward shipment, update stock ledger, and manage payables."
      size="xl"
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
        noValidate
      >
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="purchase-supplier"
            label="Supplier"
            required
            options={supplierOptions}
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
            }}
          />

          <Input
            id="purchase-supplier-inv"
            label="Supplier Invoice # (Paper Bill)"
            placeholder="e.g. INV-9842"
            value={supplierInvoiceNo}
            onChange={(e) => {
              setSupplierInvoiceNo(e.target.value);
            }}
          />
        </div>

        {/* Variant selection row */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Add Purchase Items
          </label>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                id="purchase-variant-select"
                options={variantOptions}
                value={selectedVariantId}
                onChange={(e) => {
                  setSelectedVariantId(e.target.value);
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleAddItem}
              disabled={!selectedVariantId}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Item list table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No items added yet. Select products above to build the receiving order.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">
                    Product / SKU
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 w-28">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 w-32">
                    Unit Cost (PKR)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">
                    Line Total
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const qty = parseQuantityToThousandths(it.quantityStr);
                  const cost = parseMoneyToMinor(it.unitCostStr);
                  const lineTotal = Math.round((qty * cost) / 1000);
                  return (
                    <tr key={it.variant_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{it.product_name}</p>
                        <p className="text-slate-500 font-mono">
                          {it.variant_name}
                          {it.sku ? ` (${it.sku})` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-center font-semibold text-slate-900"
                          value={it.quantityStr}
                          onChange={(e) => {
                            handleUpdateItem(idx, 'quantityStr', e.target.value);
                          }}
                        />
                        <span className="block text-center text-[10px] text-slate-400 mt-0.5">
                          {it.unit_abbreviation ?? ''}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-right font-semibold text-slate-900"
                          value={it.unitCostStr}
                          onChange={(e) => {
                            handleUpdateItem(idx, 'unitCostStr', e.target.value);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {formatMoney(lineTotal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          onClick={() => {
                            handleRemoveItem(idx);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals & Payments */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="purchase-discount"
                label="Bill Discount (PKR)"
                type="number"
                step="any"
                placeholder="0.00"
                value={discountStr}
                onChange={(e) => {
                  setDiscountStr(e.target.value);
                }}
              />
              <Input
                id="purchase-tax"
                label="Tax / Freight (PKR)"
                type="number"
                step="any"
                placeholder="0.00"
                value={taxStr}
                onChange={(e) => {
                  setTaxStr(e.target.value);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input
                id="purchase-paid"
                label="Amount Paid Now (PKR)"
                type="number"
                step="any"
                placeholder="0.00"
                value={paidStr}
                onChange={(e) => {
                  setPaidStr(e.target.value);
                }}
              />
              <Select
                id="purchase-pay-method"
                label="Payment Method"
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'other', label: 'Other' },
                ]}
                value={payMethod}
                onChange={(e) => {
                  setPayMethod(e.target.value as typeof payMethod);
                }}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded text-brand-600"
                checked={updateVariantCost}
                onChange={(e) => {
                  setUpdateVariantCost(e.target.checked);
                }}
              />
              Update catalog standard purchase price with entered unit costs
            </label>
          </div>

          <div className="flex flex-col justify-between rounded-lg bg-white p-3 border border-slate-200 text-xs">
            <div className="space-y-1.5 divide-y divide-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold">{formatMoney(subtotalMinor)}</span>
              </div>
              {discountMinor > 0 && (
                <div className="flex justify-between text-emerald-700 pt-1">
                  <span>Discount</span>
                  <span>−{formatMoney(discountMinor)}</span>
                </div>
              )}
              {taxMinor > 0 && (
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Tax / Freight</span>
                  <span>+{formatMoney(taxMinor)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5">
                <span>Grand Total</span>
                <span className="text-brand-700">{formatMoney(totalMinor)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Paid Amount</span>
                <span className="font-semibold text-emerald-700">{formatMoney(paidMinor)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span>Payable Balance</span>
                <span className={balanceMinor > 0 ? 'text-red-700' : 'text-slate-800'}>
                  {formatMoney(balanceMinor)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Input
          id="purchase-notes"
          label="Notes / Shipment Details"
          placeholder="Optional notes or supplier remarks…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Purchase Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
