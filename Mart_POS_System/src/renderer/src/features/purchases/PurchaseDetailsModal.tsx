import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Badge } from '@renderer/components/ui/Badge';
import { formatMoney } from '@shared/utils/money';
import { formatQuantityFromThousandths } from '@shared/utils/format';
import type { PurchaseRow } from '@shared/types/purchases';

import { RotateCcw } from 'lucide-react';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseRow | null;
  onReturn?: (purchase: PurchaseRow) => void;
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

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
  onReturn,
}: PurchaseDetailsModalProps): React.JSX.Element | null {
  if (!purchase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order — ${purchase.purchase_number}`}
      description={`Received from ${purchase.supplier_name ?? 'Supplier'} on ${formatDateTime(purchase.created_at)}`}
      size="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Header Details */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div>
            <p className="text-slate-400 font-semibold uppercase">Supplier</p>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{purchase.supplier_name}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase">Supplier Invoice #</p>
            <p className="font-mono font-semibold text-slate-700 text-sm mt-0.5">{purchase.supplier_invoice_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase">Payment Status</p>
            <div className="mt-1">
              <Badge variant={purchase.payment_status === 'paid' ? 'success' : purchase.payment_status === 'partial' ? 'warning' : 'danger'}>
                {purchase.payment_status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Item List */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Product / SKU</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Quantity</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Unit Cost</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchase.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{item.variant_name}{item.sku ? ` (${item.sku})` : ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                    {formatQuantityFromThousandths(item.quantity, item.unit_decimals || 0)} {item.unit_abbreviation ?? ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600">
                    {formatMoney(item.unit_cost_minor)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                    {formatMoney(item.line_total_minor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end">
          <div className="w-72 rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 divide-y divide-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatMoney(purchase.subtotal_minor)}</span>
            </div>
            {purchase.discount_minor > 0 && (
              <div className="flex justify-between text-emerald-700 pt-1">
                <span>Discount</span>
                <span>−{formatMoney(purchase.discount_minor)}</span>
              </div>
            )}
            {purchase.tax_minor > 0 && (
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Tax / Freight</span>
                <span>+{formatMoney(purchase.tax_minor)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5">
              <span>Grand Total</span>
              <span className="text-brand-700">{formatMoney(purchase.total_minor)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid</span>
              <span className="font-semibold text-emerald-700">{formatMoney(purchase.paid_amount_minor)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Outstanding Balance</span>
              <span className={purchase.balance_minor > 0 ? 'text-red-700' : 'text-slate-800'}>
                {formatMoney(purchase.balance_minor)}
              </span>
            </div>
          </div>
        </div>

        {/* Payments Recorded */}
        {purchase.payments && purchase.payments.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <p className="font-bold text-slate-700 uppercase tracking-wide">Payments Recorded</p>
            <div className="divide-y divide-slate-100">
              {purchase.payments.map((p) => (
                <div key={p.id} className="flex justify-between py-1.5">
                  <span className="capitalize text-slate-700 font-medium">{p.payment_method.replace('_', ' ')}</span>
                  <span className="font-semibold text-emerald-700">{formatMoney(p.amount_minor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {purchase.notes && (
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-3 text-slate-700">
            <p className="font-semibold text-amber-900">Notes:</p>
            <p className="mt-0.5">{purchase.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          {onReturn && purchase ? (
            <Button
              type="button"
              variant="outline"
              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-purple-600" />}
              onClick={() => {
                onReturn(purchase);
              }}
            >
              Return to Supplier
            </Button>
          ) : <div />}
          <Button type="button" variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
