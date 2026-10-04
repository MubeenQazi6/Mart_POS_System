import React, { useRef, useEffect } from 'react';
import type { SaleRow } from '@shared/types/sales';
import { formatMoney } from '@shared/utils/money';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { showToast } from '@renderer/components/ui/Toast';
import { Printer, X, CheckCircle, Crown } from 'lucide-react';
import { ReceiptFooter } from './ReceiptFooter';

interface ReceiptPreviewProps {
  sale: SaleRow;
  onClose: () => void;
  isReprint?: boolean;
}

export function ReceiptPreview({ sale, onClose, isReprint }: ReceiptPreviewProps): React.JSX.Element {
  const receiptRef = useRef<HTMLDivElement>(null);
  const hasPrintedRef = useRef(false);
  const { settings } = useSettingsStore();

  const storeName = settings['store.name'] || 'Kings Mart';
  const storeLogo = settings['store.logo'];
  const storeAddress = settings['store.address'];
  const storePhone = settings['store.phone'];
  const storeTaxNumber = settings['store.tax_number'];

  const handlePrint = (): void => {
    window.print();
    if (!hasPrintedRef.current) {
      hasPrintedRef.current = true;
      showToast(
        'success',
        isReprint ? `Receipt printed: ${sale.invoice_number}` : `Sale completed: ${sale.invoice_number}`,
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Receipt: {sale.invoice_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            ref={receiptRef}
            className="receipt-print-surface rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-zinc-900 shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-mono text-sm"
          >
            {/* Mart Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              {storeLogo ? (
                <div className="flex justify-center mb-2">
                  <img src={storeLogo} alt={storeName} className="h-10 max-w-[120px] object-contain" />
                </div>
              ) : (
                <div className="flex justify-center mb-1">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
              )}
              <h1 className="text-xl font-bold tracking-tight uppercase">{storeName}</h1>
              {storeAddress && <p className="text-xs text-zinc-500 dark:text-zinc-400">{storeAddress}</p>}
              {storePhone && <p className="text-xs text-zinc-500 dark:text-zinc-400">Tel: {storePhone}</p>}
              {storeTaxNumber && <p className="text-[10px] text-zinc-400 font-mono">Tax/NTN: {storeTaxNumber}</p>}
            </div>

            {/* Invoice Metadata */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Invoice:</span>
                <span className="font-bold">{sale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Date:</span>
                <span>{new Date(sale.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                <span className="uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                  {sale.status}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between font-bold text-xs pb-2">
                <span>ITEM (QTY)</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-2 text-xs">
                {sale.items?.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}</span>
                      <span>{formatMoney(item.line_total_minor)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>
                        {(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })} x {formatMoney(item.unit_price_minor)}
                        {item.discount_minor > 0 && ` (-${formatMoney(item.discount_minor)})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Subtotal:</span>
                <span>{formatMoney(sale.subtotal_minor)}</span>
              </div>
              {sale.discount_minor > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Total Discount:</span>
                  <span>-{formatMoney(sale.discount_minor)}</span>
                </div>
              )}
              {sale.tax_minor > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Tax:</span>
                  <span>{formatMoney(sale.tax_minor)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span>TOTAL:</span>
                <span>{formatMoney(sale.total_minor)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
              <div className="font-semibold text-zinc-500 dark:text-zinc-400 pb-1">PAYMENTS:</div>
              {sale.payments?.map((payment) => {
                const isCash = payment.payment_method.toLowerCase() === 'cash';
                const tendered = payment.tendered_minor ?? (isCash ? payment.amount_minor : undefined);
                const returnAmount =
                  tendered !== undefined && tendered > payment.amount_minor
                    ? tendered - payment.amount_minor
                    : 0;

                return (
                  <div key={payment.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="uppercase">{payment.payment_method}:</span>
                      <span className="font-semibold">{formatMoney(payment.amount_minor)}</span>
                    </div>
                    {isCash && tendered !== undefined && (
                      <>
                        <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                          <span>Paid Amount:</span>
                          <span className="font-medium">{formatMoney(tendered)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>Return Amount:</span>
                          <span>{formatMoney(returnAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <ReceiptFooter />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Printer className="h-4 w-4" />
            Print Receipt (Ctrl+P)
          </button>
        </div>
      </div>
    </div>
  );
}
