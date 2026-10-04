import { useState } from 'react';
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
import type { SupplierRow } from '@shared/types/purchases';
import { History, DollarSign } from 'lucide-react';

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

  const handleRecordPayment = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!supplier) return;
    const amountMinor = parseMoneyToMinor(payAmount);
    if (amountMinor <= 0) return;

    setIsSubmitting(true);
    try {
      const ok = await recordPayment({
        supplier_id: supplier.id,
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              className={`text-2xl font-bold ${supplier.current_balance_minor > 0 ? 'text-red-700' : 'text-slate-800'}`}
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
          className="mb-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3"
        >
          <p className="text-xs font-bold text-brand-900 uppercase tracking-wider">
            Record Payment to Supplier
          </p>
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
              placeholder="e.g. Paid against Invoice #102"
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
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">
                  Date / Time
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">
                  Amount
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ledger.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
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
                          ? 'text-red-700 font-semibold'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {row.amount_minor > 0
                        ? `+${formatMoney(row.amount_minor)}`
                        : formatMoney(row.amount_minor)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate">
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
