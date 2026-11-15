import { useState } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Select } from '@renderer/components/ui/Select';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useCustomersStore } from '@renderer/stores/customersStore';
import { parseMoneyToMinor } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import type { CustomerRow } from '@shared/types/customers';
import { History, DollarSign } from 'lucide-react';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
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

export function CustomerLedgerModal({
  isOpen,
  onClose,
  customer,
}: CustomerLedgerModalProps): React.JSX.Element | null {
  const { ledger, isLoadingLedger, recordPayment } = useCustomersStore();

  const [isCollecting, setIsCollecting] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecordPayment = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!customer) return;
    const amountMinor = parseMoneyToMinor(payAmount);
    if (amountMinor <= 0) return;

    setIsSubmitting(true);
    try {
      const ok = await recordPayment({
        customer_id: customer.id,
        amount_minor: amountMinor,
        payment_method: payMethod,
        notes: payNotes.trim() || undefined,
      });
      if (ok) {
        setIsCollecting(false);
        setPayAmount('');
        setPayNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Khata Ledger & Account"
      description={customer ? `${customer.name} (Phone: ${customer.phone})` : ''}
      size="xl"
    >
      {customer && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4 dark:bg-slate-800/60 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Current Khata Receivable Balance
            </p>
            <p
              className={`text-2xl font-bold ${customer.current_balance_minor > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-white'}`}
            >
              {formatMoney(customer.current_balance_minor)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {customer.credit_limit_minor > 0
                ? `Credit limit: ${formatMoney(customer.credit_limit_minor)}`
                : 'No credit limit set'}
            </p>
          </div>
          <div>
            <Button
              variant={isCollecting ? 'outline' : 'primary'}
              size="sm"
              leftIcon={<DollarSign className="h-4 w-4" />}
              onClick={() => {
                setIsCollecting(!isCollecting);
              }}
            >
              {isCollecting ? 'Cancel Collection' : 'Collect Payment'}
            </Button>
          </div>
        </div>
      )}

      {isCollecting && customer && (
        <form
          onSubmit={(e) => {
            void handleRecordPayment(e);
          }}
          className="mb-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3 dark:border-brand-800 dark:bg-brand-950/30"
        >
          <p className="text-xs font-bold text-brand-900 dark:text-brand-200 uppercase tracking-wider">
            Collect Customer Khata Payment
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="cust-pay-amount"
              label="Amount Collected (PKR)"
              type="number"
              required
              step="any"
              placeholder="e.g. 2000"
              value={payAmount}
              onChange={(e) => {
                setPayAmount(e.target.value);
              }}
            />
            <Select
              id="cust-pay-method"
              label="Payment Method"
              required
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
              value={payMethod}
              onChange={(e) => {
                setPayMethod(e.target.value as typeof payMethod);
              }}
            />
          </div>
          <Input
            id="cust-pay-notes"
            label="Remarks / Notes (optional)"
            placeholder="e.g. Received partial cash installment"
            value={payNotes}
            onChange={(e) => {
              setPayNotes(e.target.value);
            }}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCollecting(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Credit Account
            </Button>
          </div>
        </form>
      )}

      {isLoadingLedger ? (
        <LoadingState message="Loading Khata ledger…" />
      ) : ledger.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Transaction History"
          description="No credit sales or payments recorded for this customer yet."
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
                          : row.transaction_type === 'SALE_CREDIT'
                            ? 'warning'
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
                          ? 'text-amber-700 font-semibold'
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
