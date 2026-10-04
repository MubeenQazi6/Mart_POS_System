import React from 'react';
import { usePosStore } from '@renderer/stores/posStore';
import { X, Play, Trash2, Clock, Inbox, Loader2 } from 'lucide-react';

interface HeldBillsModalProps {
  onClose: () => void;
}

export function HeldBillsModal({ onClose }: HeldBillsModalProps): React.JSX.Element {
  const { heldBills, isLoadingHeldBills, resumeHeldBill, deleteHeldBill } = usePosStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Held Bills Queue</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingHeldBills ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-2 text-xs">Loading held bills...</p>
            </div>
          ) : heldBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Inbox className="h-12 w-12 stroke-[1.2]" />
              <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">No Held Bills</p>
              <p className="text-xs text-zinc-400">You can hold an active cart using the &quot;Hold Bill&quot; button in POS.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldBills.map((bill) => {
                let itemCount = 0;
                try {
                  const data = JSON.parse(bill.cart_data) as { items: unknown[] };
                  itemCount = data.items.length;
                } catch {
                  // ignore
                }

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          Hold #{bill.id}
                        </span>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {bill.notes && (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 italic">
                          &quot;{bill.notes}&quot;
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Held at: {new Date(bill.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void resumeHeldBill(bill.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteHeldBill(bill.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Delete held bill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
