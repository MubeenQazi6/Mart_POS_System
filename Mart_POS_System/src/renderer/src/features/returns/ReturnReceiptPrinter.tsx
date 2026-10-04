import React from 'react';
import { formatMoney } from '@shared/utils/money';
import type { ReturnRow, ExchangeRow } from '@shared/types/returns';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { Crown } from 'lucide-react';
import { ReceiptFooter } from '../pos/ReceiptFooter';

// ── Sales Return Receipt ──────────────────────────────────────────────────────

interface SalesReturnReceiptProps {
  returnData: ReturnRow;
  onClose: () => void;
}

export function SalesReturnReceipt({ returnData, onClose }: SalesReturnReceiptProps): React.JSX.Element {
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Kings Mart';
  const storeLogo = settings['store.logo'];
  const storeAddress = settings['store.address'];
  const storePhone = settings['store.phone'];

  const handlePrint = (): void => { window.print(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Modal Header — NOT printed */}
        <div className="no-print flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Return Receipt — {returnData.return_number}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Receipt Surface */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="receipt-print-surface rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-zinc-900 shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-mono text-sm">
            {/* Store Header */}
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">RETURN RECEIPT</p>
              {storeAddress && <p className="text-[10px] text-zinc-400">{storeAddress}</p>}
              {storePhone && <p className="text-[10px] text-zinc-400">Tel: {storePhone}</p>}
            </div>

            {/* Return Metadata */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Return #:</span>
                <span className="font-bold">{returnData.return_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Original Invoice:</span>
                <span className="font-bold">{returnData.source_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date:</span>
                <span>{new Date(returnData.created_at).toLocaleString()}</span>
              </div>
              {returnData.party_name && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Customer/Supplier:</span>
                  <span>{returnData.party_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Reason:</span>
                <span className="text-right max-w-[60%]">{returnData.reason}</span>
              </div>
            </div>

            {/* Returned Items */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between font-bold text-xs pb-2">
                <span>RETURNED ITEM (QTY)</span>
                <span>AMOUNT</span>
              </div>
              <div className="space-y-2 text-xs">
                {returnData.items?.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}</span>
                      <span>{formatMoney(item.amount_minor)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>
                        {(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })} × {formatMoney(item.unit_amount_minor ?? (item.quantity > 0 ? Math.round((item.amount_minor * 1000) / item.quantity) : item.amount_minor))}
                        {item.return_condition && item.return_condition !== 'resalable' && ` [${item.return_condition}]`}
                        {item.sku && ` · SKU: ${item.sku}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Summary */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-base font-bold pt-1">
                <span>REFUND TOTAL:</span>
                <span>{formatMoney(returnData.refund_amount_minor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Settlement:</span>
                <span className="uppercase font-semibold">{returnData.refund_method}</span>
              </div>
            </div>

            <ReceiptFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sales Exchange Receipt ────────────────────────────────────────────────────

interface SalesExchangeReceiptProps {
  exchangeData: ExchangeRow;
  onClose: () => void;
}

export function SalesExchangeReceipt({ exchangeData, onClose }: SalesExchangeReceiptProps): React.JSX.Element {
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Kings Mart';
  const storeLogo = settings['store.logo'];
  const storeAddress = settings['store.address'];
  const storePhone = settings['store.phone'];

  const handlePrint = (): void => { window.print(); };
  const diff = exchangeData.difference_minor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="no-print flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Exchange Receipt — {exchangeData.exchange_number}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Print
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="receipt-print-surface rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-zinc-900 shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-mono text-sm">
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">EXCHANGE RECEIPT</p>
              {storeAddress && <p className="text-[10px] text-zinc-400">{storeAddress}</p>}
              {storePhone && <p className="text-[10px] text-zinc-400">Tel: {storePhone}</p>}
            </div>

            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Exchange #:</span>
                <span className="font-bold">{exchangeData.exchange_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Original Invoice:</span>
                <span className="font-bold">{exchangeData.source_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date:</span>
                <span>{new Date(exchangeData.created_at).toLocaleString()}</span>
              </div>
              {exchangeData.party_name && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Customer:</span>
                  <span>{exchangeData.party_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Reason:</span>
                <span className="text-right max-w-[60%]">{exchangeData.reason}</span>
              </div>
            </div>

            {/* Returned items */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="font-bold text-xs pb-1.5">RETURNED TO STORE:</p>
              {exchangeData.return_items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs space-y-0.5">
                  <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''} ×{(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })}</span>
                  <span>{formatMoney(item.amount_minor)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-xs pt-1">
                <span>Return Value:</span>
                <span>{formatMoney(exchangeData.return_total_minor)}</span>
              </div>
            </div>

            {/* Replacement items */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="font-bold text-xs pb-1.5">REPLACEMENT ITEMS:</p>
              {exchangeData.replacement_items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs space-y-0.5">
                  <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''} ×{(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })}</span>
                  <span>{formatMoney(item.total_amount_minor)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-xs pt-1">
                <span>Replacement Value:</span>
                <span>{formatMoney(exchangeData.replacement_total_minor)}</span>
              </div>
            </div>

            {/* Settlement */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 space-y-1 text-xs">
              {diff === 0 && (
                <div className="text-center font-bold text-emerald-600">✓ EVEN EXCHANGE — NO PAYMENT DUE</div>
              )}
              {diff > 0 && (
                <div className="flex justify-between font-bold">
                  <span>ADDITIONAL PAYMENT (Customer pays):</span>
                  <span>{formatMoney(diff)}</span>
                </div>
              )}
              {diff < 0 && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>REFUND TO CUSTOMER:</span>
                  <span>{formatMoney(Math.abs(diff))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Settlement:</span>
                <span className="uppercase font-semibold">{exchangeData.settlement_method}</span>
              </div>
            </div>

            <ReceiptFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Return Debit Note / Receipt ─────────────────────────────────────

interface SupplierReturnReceiptProps {
  returnData: ReturnRow;
  onClose: () => void;
}

export function SupplierReturnReceipt({ returnData, onClose }: SupplierReturnReceiptProps): React.JSX.Element {
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Kings Mart';
  const storeLogo = settings['store.logo'];
  const storeAddress = settings['store.address'];
  const storePhone = settings['store.phone'];

  const handlePrint = (): void => { window.print(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Modal Header — NOT printed */}
        <div className="no-print flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Supplier Return — {returnData.return_number}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Receipt Surface */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="receipt-print-surface rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-zinc-900 shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 font-mono text-sm">
            {/* Store Header */}
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                SUPPLIER RETURN / DEBIT NOTE
              </p>
              {storeAddress && <p className="text-[10px] text-zinc-400">{storeAddress}</p>}
              {storePhone && <p className="text-[10px] text-zinc-400">Tel: {storePhone}</p>}
            </div>

            {/* Return Metadata */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Debit Note #:</span>
                <span className="font-bold">{returnData.return_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Original PO #:</span>
                <span className="font-bold">{returnData.source_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date:</span>
                <span>{new Date(returnData.created_at).toLocaleString()}</span>
              </div>
              {returnData.party_name && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Supplier:</span>
                  <span className="font-semibold">{returnData.party_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Reason:</span>
                <span className="text-right max-w-[60%]">{returnData.reason}</span>
              </div>
            </div>

            {/* Returned Items */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between font-bold text-xs pb-2">
                <span>RETURNED ITEM (QTY)</span>
                <span>COST / AMOUNT</span>
              </div>
              <div className="space-y-2 text-xs">
                {returnData.items?.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span>
                        {item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}
                      </span>
                      <span>{formatMoney(item.amount_minor)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>
                        {(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })} ×{' '}
                        {formatMoney(item.unit_amount_minor ?? (item.quantity > 0 ? Math.round((item.amount_minor * 1000) / item.quantity) : item.amount_minor))}
                        {item.return_condition && item.return_condition !== 'resalable' && ` [${item.return_condition}]`}
                        {item.sku && ` · SKU: ${item.sku}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund / Credit Summary */}
            <div className="py-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-base font-bold pt-1">
                <span>TOTAL RETURN VALUE:</span>
                <span>{formatMoney(returnData.refund_amount_minor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Settlement Method:</span>
                <span className="uppercase font-semibold">{returnData.refund_method}</span>
              </div>
            </div>

            <ReceiptFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

