import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useSuppliersStore } from '@renderer/stores/suppliersStore';
import { parseMoneyToMinor } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import type { SupplierRow, PurchaseRow } from '@shared/types/purchases';
import { History, DollarSign, FileText } from 'lucide-react';

interface SupplierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierRow | null;
}

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function SupplierLedgerModal({
  isOpen,
  onClose,
  supplier,
}: SupplierLedgerModalProps): React.JSX.Element | null {
  const { ledger, isLoadingLedger, recordPayment } = useSuppliersStore();

  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'other'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payRef, setPayRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Specific purchase allocation
  const [supplierPurchases, setSupplierPurchases] = useState<PurchaseRow[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  const loadSupplierPurchases = useCallback(async (supplierId: number): Promise<void> => {
    if (!window.martpos) return;
    setIsLoadingPurchases(true);
    try {
      const res = await window.martpos.purchases.list({ supplier_id: supplierId, limit: 100 });
      if (res.success) {
        // Sort so unpaid and partial orders appear first
        const sorted = [...res.data].sort((a, b) => {
          const priority = (status: string): number => {
            if (status === 'unpaid') return 1;
            if (status === 'partial') return 2;
            return 3;
          };
          return priority(a.payment_status) - priority(b.payment_status);
        });
        setSupplierPurchases(sorted);
      }
    } finally {
      setIsLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    if (!supplier || !isOpen) {
      setSupplierPurchases([]);
      setSelectedPurchaseId('');
      setIsPaying(false);
      return;
    }
    void loadSupplierPurchases(supplier.id);
  }, [supplier, isOpen, loadSupplierPurchases]);

  const handleSelectPurchase = (purchaseIdStr: string): void => {
    setSelectedPurchaseId(purchaseIdStr);
    if (!purchaseIdStr) return;
    const target = supplierPurchases.find((p) => p.id === Number(purchaseIdStr));
    if (target && target.balance_minor > 0) {
      setPayAmount((target.balance_minor / 100).toString());
      if (!payNotes || payNotes.startsWith('Payment for Purchase')) {
        setPayNotes(`Payment for Purchase ${target.purchase_number}`);
      }
    }
  };

  const handleRecordPayment = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!supplier) return;
    const amountMinor = parseMoneyToMinor(payAmount);
    if (amountMinor <= 0) return;

    setIsSubmitting(true);
    try {
      const ok = await recordPayment({
        supplier_id: supplier.id,
        purchase_id: selectedPurchaseId ? Number(selectedPurchaseId) : undefined,
        amount_minor: amountMinor,
        payment_method: payMethod,
        reference_number: payRef.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      if (ok) {
        setIsPaying(false);
        setPayAmount('');
        setPayNotes('');
        setPayRef('');
        setSelectedPurchaseId('');
        void loadSupplierPurchases(supplier.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPurchase = supplierPurchases.find((p) => p.id === Number(selectedPurchaseId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Ledger & Balance"
      description={
        supplier
          ? `${supplier.name} ${supplier.contact_person ? `(${supplier.contact_person})` : ''}`
          : ''
      }
      size="xl"
    >
      {supplier && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4 dark:bg-slate-800/60 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Current Payable Balance
            </p>
            <p
              className={`text-2xl font-bold ${supplier.current_balance_minor > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
            >
              {formatMoney(supplier.current_balance_minor)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {supplier.current_balance_minor > 0
                ? 'Outstanding amount owed to supplier'
                : 'All supplier dues cleared'}
            </p>
          </div>
          <div>
            <Button
              variant={isPaying ? 'outline' : 'primary'}
              size="sm"
              leftIcon={<DollarSign className="h-4 w-4" />}
              onClick={() => {
                setIsPaying(!isPaying);
              }}
            >
              {isPaying ? 'Cancel Payment' : 'Record Payment'}
            </Button>
          </div>
        </div>
      )}

      {isPaying && supplier && (
        <form
          onSubmit={(e) => {
            void handleRecordPayment(e);
          }}
          className="mb-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3 dark:border-brand-800 dark:bg-navy-800/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider">
              Record Payment to Supplier
            </p>
            {isLoadingPurchases && (
              <span className="text-[11px] text-slate-400">Loading purchase orders...</span>
            )}
          </div>

          {/* Purchase Order Selection */}
          <div className="space-y-1.5">
            <Select
              id="pay-purchase-id"
              label="Apply to Purchase Order (Optional)"
              options={[
                { value: '', label: 'General Payment (Not tied to a specific order)' },
                ...supplierPurchases.map((p) => ({
                  value: String(p.id),
                  label: `${p.purchase_number} — Total: ${formatMoney(p.total_minor)} | Due: ${formatMoney(p.balance_minor)} [${p.payment_status.toUpperCase()}]`,
                })),
              ]}
              value={selectedPurchaseId}
              onChange={(e) => {
                handleSelectPurchase(e.target.value);
              }}
            />

            {selectedPurchase && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white dark:bg-navy-700 p-2.5 text-xs border border-brand-200 dark:border-brand-800">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Order {selectedPurchase.purchase_number}
                  </span>
                  {selectedPurchase.supplier_invoice_number && (
                    <span className="text-slate-400">
                      (Bill #{selectedPurchase.supplier_invoice_number})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    Total: {formatMoney(selectedPurchase.total_minor)}
                  </span>
                  <span className="text-slate-500">
                    Paid: {formatMoney(selectedPurchase.paid_amount_minor)}
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    Due: {formatMoney(selectedPurchase.balance_minor)}
                  </span>
                  <Badge
                    variant={
                      selectedPurchase.payment_status === 'paid'
                        ? 'success'
                        : selectedPurchase.payment_status === 'partial'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {selectedPurchase.payment_status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="pay-amount"
              label="Payment Amount (PKR)"
              type="number"
              required
              step="any"
              placeholder="e.g. 5000"
              value={payAmount}
              onChange={(e) => {
                setPayAmount(e.target.value);
              }}
            />
            <Select
              id="pay-method"
              label="Payment Method"
              required
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="pay-ref"
              label="Reference / Cheque #"
              placeholder="e.g. Cheque #4928"
              value={payRef}
              onChange={(e) => {
                setPayRef(e.target.value);
              }}
            />
            <Input
              id="pay-notes"
              label="Notes (optional)"
              placeholder="e.g. Paid against PO or bill"
              value={payNotes}
              onChange={(e) => {
                setPayNotes(e.target.value);
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPaying(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Submit Payment
            </Button>
          </div>
        </form>
      )}

      {isLoadingLedger ? (
        <LoadingState message="Loading supplier ledger…" />
      ) : ledger.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Transaction History"
          description="No purchase bills or payments recorded for this supplier yet."
        />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">
                  Date / Time
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">
                  Amount
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">
                  Notes / Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {ledger.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/60 transition-colors">
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        row.transaction_type === 'PAYMENT'
                          ? 'success'
                          : row.transaction_type === 'PURCHASE_BILL'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {row.transaction_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    <span
                      className={
                        row.amount_minor > 0
                          ? 'text-red-700 dark:text-red-400 font-semibold'
                          : 'text-emerald-700 dark:text-emerald-400 font-semibold'
                      }
                    >
                      {row.amount_minor > 0
                        ? `+${formatMoney(row.amount_minor)}`
                        : formatMoney(row.amount_minor)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[260px] truncate">
                    {row.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

