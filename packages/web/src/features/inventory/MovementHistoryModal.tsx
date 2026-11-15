import { useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useInventoryStore } from '@renderer/stores/inventoryStore';
import { formatQuantityFromThousandths } from '@shared/utils/format';
import type { StockSummaryRow } from '@shared/types/inventory';
import { History } from 'lucide-react';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: StockSummaryRow | null;
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

function referenceTypeLabel(refType: string | null): string {
  if (!refType) return '—';
  switch (refType) {
    case 'OPENING_STOCK': return 'Opening Stock';
    case 'MANUAL_ADJUSTMENT': return 'Manual Adjustment';
    case 'DAMAGE': return 'Damage';
    case 'EXPIRY': return 'Expiry';
    case 'SALE': return 'Sale';
    case 'MANUAL_SALE': return 'Manual Sale';
    case 'PURCHASE': return 'Purchase';
    case 'RETURN': return 'Return';
    case 'EXCHANGE_OUT': return 'Exchange Out';
    case 'EXCHANGE_IN': return 'Exchange In';
    case 'SALE_RETURN': return 'Sale Return';
    case 'PURCHASE_RETURN': return 'Purchase Return';
    case 'SALE_VOID': return 'Sale Void';
    default: return refType;
  }
}

export function MovementHistoryModal({
  isOpen,
  onClose,
  variant,
}: MovementHistoryModalProps): React.JSX.Element | null {
  const { movements, isLoadingMovements, loadMovements } = useInventoryStore();

  useEffect(() => {
    if (isOpen && variant) {
      void loadMovements({ variant_id: variant.variant_id, limit: 200 });
    }
  }, [isOpen, variant, loadMovements]);

  const decimals = variant?.unit_decimals ?? 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Movement History"
      description={
        variant
          ? `${variant.product_name} — ${variant.variant_name}${variant.sku ? ` (${variant.sku})` : ''}`
          : ''
      }
      size="xl"
    >
      {isLoadingMovements ? (
        <LoadingState message="Loading movement history…" />
      ) : movements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Movement History"
          description="No stock movements recorded for this variant yet."
        />
      ) : (
        <div className="overflow-x-auto w-full -mx-1 sm:mx-0">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date / Time</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reference</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {movements.map((m) => {
                const isManualSale = m.reference_type === 'MANUAL_SALE' || (m.notes && m.notes.toLowerCase().includes('manual sale'));
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={m.direction === 'in' ? 'success' : 'danger'}>
                        {m.direction === 'in' ? '↑ IN' : '↓ OUT'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      {isManualSale ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700">
                          Manual Sale
                        </span>
                      ) : (
                        <span>{referenceTypeLabel(m.reference_type)}</span>
                      )}
                      {m.reference_id != null && (
                        <span className="ml-1 text-slate-400 dark:text-slate-500">#{String(m.reference_id)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                      <span className={m.direction === 'in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                        {m.direction === 'in' ? '+' : '−'}
                        {formatQuantityFromThousandths(m.quantity, decimals)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                      {m.notes ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
