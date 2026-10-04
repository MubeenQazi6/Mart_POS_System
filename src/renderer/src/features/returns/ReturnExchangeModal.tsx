import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { formatMoney } from '@shared/utils/money';
import { showToast } from '@renderer/components/ui/Toast';
import type {
  ReturnRow,
  ReturnCondition,
  ReturnPaymentMethod,
  ExchangeSettlementMethod,
  ExchangeRow,
} from '@shared/types/returns';
import {
  RotateCcw,
  Search,
  AlertCircle,
  Package,
  X,
  ArrowLeftRight,
  Plus,
  Minus,
  Users,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import {
  SalesReturnReceipt,
  SalesExchangeReceipt,
  SupplierReturnReceipt,
} from './ReturnReceiptPrinter';

export type WorkMode = 'sales' | 'purchases';
export type ActionMode = 'return' | 'exchange';

interface ReplacementItem {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  unit_price_minor: number;
  available_stock: number;
  quantity: number; // scaled ×1000
  total: number;
}

export interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkMode?: WorkMode;
  defaultActionMode?: ActionMode;
  initialSourceNumber?: string;
  onComplete?: (result: ReturnRow | ExchangeRow) => void;
}

import { formatReceiptDateTime } from '@shared/utils/format';

function formatDateTime(isoString: string): string {
  return formatReceiptDateTime(isoString);
}

export function ReturnExchangeModal({
  isOpen,
  onClose,
  defaultWorkMode = 'sales',
  defaultActionMode = 'return',
  initialSourceNumber = '',
  onComplete,
}: ReturnExchangeModalProps): React.JSX.Element | null {
  // Mode selection
  const [workMode, setWorkMode] = useState<WorkMode>(defaultWorkMode);
  const [actionMode, setActionMode] = useState<ActionMode>(defaultActionMode);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSourceNumber);
  const [searchResults, setSearchResults] = useState<ReturnRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ReturnRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Return items state
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({}); // source_item_id -> qty scaled ×1000
  const [conditions, setConditions] = useState<Record<number, ReturnCondition>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<ReturnPaymentMethod>('cash');

  // Exchange state
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [settlementMethod, setSettlementMethod] = useState<ExchangeSettlementMethod>('cash');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<
    {
      variant_id: number;
      product_name: string;
      variant_name: string;
      sku: string | null;
      selling_price_minor: number;
      available_stock: number;
    }[]
  >([]);
  const [isCatalogSearching, setIsCatalogSearching] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generated receipt states
  const [receiptReturn, setReceiptReturn] = useState<ReturnRow | null>(null);
  const [receiptExchange, setReceiptExchange] = useState<ExchangeRow | null>(null);

  // Reset when modal opens with new defaults
  useEffect(() => {
    if (isOpen) {
      setWorkMode(defaultWorkMode);
      setActionMode(defaultActionMode);
      setSearchQuery(initialSourceNumber);
      setSelectedSource(null);
      setSearchResults([]);
      setHasSearched(false);
      setErrorMessage(null);
      setReturnQtys({});
      setConditions({});
      setReplacements([]);
      setReason('');
      setRefundMethod('cash');
      setSettlementMethod('cash');
      setCatalogSearch('');
      setCatalogResults([]);
      setReceiptReturn(null);
      setReceiptExchange(null);

      if (initialSourceNumber.trim()) {
        void executeSearch(initialSourceNumber.trim(), defaultWorkMode);
      }
    }
  }, [isOpen, defaultWorkMode, defaultActionMode, initialSourceNumber]);

  // Execute Source Search
  const executeSearch = async (term: string, mode: WorkMode): Promise<void> => {
    if (!window.martpos) return;
    const clean = term.trim();
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setSelectedSource(null);

    try {
      const res =
        mode === 'sales'
          ? await window.martpos.returns.searchSales(clean)
          : await window.martpos.returns.searchPurchases(clean);

      setHasSearched(true);
      if (res.success) {
        setSearchResults(res.data);
        if (res.data.length === 1 && res.data[0]) {
          // Auto-select single exact match
          selectSource(res.data[0]);
        }
      } else {
        setSearchResults([]);
        setErrorMessage(res.error ?? 'Search failed');
      }
    } catch {
      setHasSearched(true);
      setSearchResults([]);
      setErrorMessage('Failed to search records.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced auto-search on input
  useEffect(() => {
    if (!isOpen || selectedSource) return;
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      void executeSearch(clean, workMode);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, workMode, isOpen, selectedSource]);

  const selectSource = (source: ReturnRow): void => {
    setSelectedSource(source);
    setReturnQtys({});
    setConditions({});
    setReplacements([]);
    setErrorMessage(null);
    const hasCust = Boolean(source.customer_id || source.party_name);
    if (!hasCust) {
      if (refundMethod === 'credit') setRefundMethod('cash');
      if (settlementMethod === 'credit') setSettlementMethod('cash');
    }
  };

  const handleClearSelection = (): void => {
    setSelectedSource(null);
    setReturnQtys({});
    setConditions({});
    setReplacements([]);
    setErrorMessage(null);
  };

  // Catalog search for exchange replacement products
  const searchCatalogForReplacement = useCallback(async (term: string): Promise<void> => {
    if (!window.martpos || !term.trim()) {
      setCatalogResults([]);
      return;
    }
    setIsCatalogSearching(true);
    try {
      const res = await window.martpos.products.search({ search: term.trim(), is_active: true });
      if (res.success) {
        const flattened = res.data.flatMap((prod) =>
          (prod.variants ?? []).map((v) => ({
            variant_id: v.id,
            product_name: prod.name,
            variant_name: v.variant_name,
            sku: v.sku,
            selling_price_minor: v.selling_price_minor,
            available_stock: v.available_stock ?? 0,
          })),
        );
        setCatalogResults(flattened);
      }
    } catch {
      /* ignore */
    } finally {
      setIsCatalogSearching(false);
    }
  }, []);

  useEffect(() => {
    if (actionMode !== 'exchange' || !catalogSearch.trim()) {
      setCatalogResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchCatalogForReplacement(catalogSearch);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [catalogSearch, actionMode, searchCatalogForReplacement]);

  const addReplacement = (item: {
    variant_id: number;
    product_name: string;
    variant_name: string;
    sku: string | null;
    selling_price_minor: number;
    available_stock: number;
  }): void => {
    const existing = replacements.find((r) => r.variant_id === item.variant_id);
    if (existing) {
      const nextQuantity = existing.quantity + 1000;
      if (nextQuantity > item.available_stock) {
        showToast(
          'error',
          `Only ${String(item.available_stock / 1000)} units are available for ${item.product_name}.`,
        );
        return;
      }
      setReplacements(
        replacements.map((r) =>
          r.variant_id === item.variant_id
            ? {
                ...r,
                quantity: nextQuantity,
                total: Math.round((nextQuantity * r.unit_price_minor) / 1000),
              }
            : r,
        ),
      );
    } else {
      setReplacements([
        ...replacements,
        {
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
          unit_price_minor: item.selling_price_minor,
          available_stock: Math.max(0, item.available_stock),
          quantity: 1000,
          total: item.selling_price_minor,
        },
      ]);
    }
    setCatalogSearch('');
    setCatalogResults([]);
  };

  const updateReplacementQty = (variantId: number, delta: number): void => {
    setReplacements((prev) =>
      prev
        .map((r) =>
          r.variant_id === variantId
            ? {
                ...r,
                quantity: Math.min(r.available_stock, Math.max(0, r.quantity + delta * 1000)),
                total: Math.round(
                  (Math.min(r.available_stock, Math.max(0, r.quantity + delta * 1000)) *
                    r.unit_price_minor) /
                    1000,
                ),
              }
            : r,
        )
        .filter((r) => r.quantity > 0),
    );
  };

  // Calculations
  const returnTotal = useMemo(() => {
    return Object.entries(returnQtys).reduce((sum, [sid, qty]) => {
      const item = selectedSource?.items?.find((i) => i.source_item_id === Number(sid));
      if (!item || qty <= 0) return sum;
      const unitPrice =
        item.unit_amount_minor ??
        (item.quantity > 0 ? Math.round((item.amount_minor * 1000) / item.quantity) : item.amount_minor);
      return sum + Math.round((qty * unitPrice) / 1000);
    }, 0);
  }, [returnQtys, selectedSource]);

  const replacementTotal = useMemo(() => {
    return replacements.reduce((s, r) => s + r.total, 0);
  }, [replacements]);

  const exchangeDiff = replacementTotal - returnTotal;

  // Submit return
  const handleSubmitReturn = async (): Promise<void> => {
    if (!window.martpos || !selectedSource) return;
    const items = Object.entries(returnQtys)
      .filter(([, q]) => q > 0)
      .map(([sid, quantity]) => ({
        source_item_id: Number(sid),
        quantity,
        return_condition: conditions[Number(sid)] ?? 'resalable',
      }));

    if (!reason.trim()) {
      showToast('error', 'Please enter a return reason');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Select at least one item to return');
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        workMode === 'sales'
          ? await window.martpos.returns.createSales({
              sale_id: selectedSource.source_id,
              items,
              reason: reason.trim(),
              refund_method: refundMethod,
            })
          : await window.martpos.returns.createPurchase({
              purchase_id: selectedSource.source_id,
              items,
              reason: reason.trim(),
              refund_method: refundMethod,
            });

      if (res.success) {
        showToast(
          'success',
          `${res.data.return_number} processed — ${formatMoney(res.data.refund_amount_minor)} refunded`,
        );
        onComplete?.(res.data);
        setReceiptReturn(res.data);
      } else {
        showToast('error', res.error ?? 'Failed to process return');
        setErrorMessage(res.error ?? 'Failed to process return');
      }
    } catch {
      showToast('error', 'Unexpected error processing return');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit exchange
  const handleSubmitExchange = async (): Promise<void> => {
    if (!window.martpos || !selectedSource) return;
    const returnItems = Object.entries(returnQtys)
      .filter(([, q]) => q > 0)
      .map(([sid, quantity]) => ({
        source_item_id: Number(sid),
        quantity,
        return_condition: conditions[Number(sid)] ?? 'resalable',
      }));

    const replacementItems = replacements.map((r) => ({
      variant_id: r.variant_id,
      quantity: r.quantity,
      unit_price_minor: r.unit_price_minor,
    }));

    if (!reason.trim()) {
      showToast('error', 'Please enter an exchange reason');
      return;
    }
    if (returnItems.length === 0) {
      showToast('error', 'Select at least one item to return');
      return;
    }
    if (replacementItems.length === 0) {
      showToast('error', 'Select at least one replacement item');
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        workMode === 'sales'
          ? await window.martpos.returns.createSalesExchange({
              sale_id: selectedSource.source_id,
              return_items: returnItems,
              replacement_items: replacementItems,
              reason: reason.trim(),
              settlement_method: settlementMethod,
            })
          : await window.martpos.returns.createPurchaseExchange({
              purchase_id: selectedSource.source_id,
              return_items: returnItems,
              replacement_items: replacementItems,
              reason: reason.trim(),
              settlement_method:
                settlementMethod === 'even'
                  ? 'even'
                  : settlementMethod === 'cash'
                    ? 'cash'
                    : 'balance_adjustment',
            });

      if (res.success) {
        showToast('success', `${res.data.exchange_number} processed successfully`);
        onComplete?.(res.data);
        setReceiptExchange(res.data);
      } else {
        showToast('error', res.error ?? 'Failed to process exchange');
        setErrorMessage(res.error ?? 'Failed to process exchange');
      }
    } catch {
      showToast('error', 'Unexpected error processing exchange');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
        <div className="flex w-full max-w-4xl max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-surface-border px-6 py-4 dark:border-slate-700 flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {actionMode === 'return' ? (
                  <RotateCcw className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                {workMode === 'sales'
                  ? actionMode === 'return'
                    ? 'Customer Sales Return'
                    : 'Customer Sales Exchange'
                  : actionMode === 'return'
                    ? 'Supplier Purchase Return'
                    : 'Supplier Purchase Exchange'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Process verified transaction against original invoice or purchase order records
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Selector (Sales vs Purchases, Return vs Exchange) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-6 py-3 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 flex-shrink-0">
            {/* Work Mode Toggle */}
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setWorkMode('sales');
                  setSelectedSource(null);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  workMode === 'sales'
                    ? 'bg-brand-600 text-white shadow-xs dark:bg-brand-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Customer Sales
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkMode('purchases');
                  setSelectedSource(null);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  workMode === 'purchases'
                    ? 'bg-brand-600 text-white shadow-xs dark:bg-brand-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                Supplier Purchases
              </button>
            </div>

            {/* Action Mode Toggle */}
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActionMode('return');
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  actionMode === 'return'
                    ? 'bg-rose-600 text-white shadow-xs dark:bg-rose-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMode('exchange');
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  actionMode === 'exchange'
                    ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Exchange
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
            {/* Step 1: Invoice Lookup */}
            <div className="rounded-xl border border-surface-border bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Search className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Step 1 — Find the {workMode === 'sales' ? 'Original Invoice' : 'Purchase Record'}
              </h3>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                  <Input
                    id="return-modal-search"
                    label=""
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    placeholder={
                      workMode === 'sales'
                        ? 'Search invoice number (e.g. INV-00001), customer name or phone...'
                        : 'Search PO number (e.g. PUR-00001), supplier invoice # or name...'
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void executeSearch(searchQuery, workMode);
                      }
                    }}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      void executeSearch(searchQuery, workMode);
                    }}
                    isLoading={isSearching}
                    leftIcon={<Search className="h-4 w-4" />}
                    size="md"
                  >
                    Search
                  </Button>
                  {(searchQuery || selectedSource) && (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setSearchQuery('');
                        handleClearSelection();
                      }}
                      leftIcon={<X className="h-4 w-4" />}
                      className="dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Immediate "Record Not Found" display */}
              {hasSearched &&
                !isSearching &&
                searchResults.length === 0 &&
                searchQuery.trim() !== '' && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <div>
                      <span className="font-bold">Record Not Found</span>
                      <p className="font-normal text-[11px] opacity-90">
                        No matching{' '}
                        {workMode === 'sales'
                          ? 'completed sales invoice'
                          : 'supplier purchase record'}{' '}
                        matching &ldquo;{searchQuery}&rdquo; was found in the database.
                      </p>
                    </div>
                  </div>
                )}

              {/* Search Results List */}
              {searchResults.length > 0 && !selectedSource && (
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800 shadow-xs">
                  <div className="bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider dark:bg-slate-700 dark:text-slate-400">
                    Select a record to proceed ({searchResults.length} found):
                  </div>
                  {searchResults.map((src) => (
                    <button
                      type="button"
                      key={src.source_id}
                      onClick={() => {
                        selectSource(src);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">
                          {src.source_number}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {src.party_name ??
                            (workMode === 'sales' ? 'Walk-in customer' : 'General Supplier')}{' '}
                          &bull; {formatDateTime(src.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatMoney(src.refund_amount_minor)}
                        </span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                          {src.items?.length ?? 0} items
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Record Information & Item Selection */}
            {selectedSource && (
              <div className="rounded-xl border border-surface-border bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60 space-y-4 shadow-xs">
                {/* Source Record Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {selectedSource.source_number}
                        </span>
                        <Badge variant={actionMode === 'return' ? 'danger' : 'warning'}>
                          {actionMode === 'return' ? 'Return' : 'Exchange'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedSource.party_name ??
                          (workMode === 'sales' ? 'Walk-in Customer' : 'General Supplier')}{' '}
                        &bull; {formatDateTime(selectedSource.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    leftIcon={<X className="h-3.5 w-3.5" />}
                    className="dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Change Invoice
                  </Button>
                </div>

                {/* Step 2: Select Items to Return */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Step 2 — Select Items to Return from {selectedSource.source_number}
                  </h4>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2.5">Product & Variant</th>
                          <th className="px-3 py-2.5">SKU</th>
                          <th className="px-3 py-2.5 text-center">Purchased / Sold</th>
                          <th className="px-3 py-2.5 text-center">Returnable</th>
                          <th className="px-3 py-2.5 text-center">Return Qty</th>
                          <th className="px-3 py-2.5">Condition</th>
                          <th className="px-3 py-2.5 text-right">Unit Price</th>
                          <th className="px-3 py-2.5 text-right">Return Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedSource.items?.map((item) => {
                          const maxQty = Math.floor(
                            (item.remaining_quantity ?? item.quantity) / 1000,
                          );
                          const currentRawQty = returnQtys[item.source_item_id] ?? 0;
                          const currentPieces = currentRawQty / 1000;
                          const unitPrice =
                            item.unit_amount_minor ??
                            (item.quantity > 0
                              ? Math.round((item.amount_minor * 1000) / item.quantity)
                              : item.amount_minor);
                          const hasDiscount = Boolean(
                            (item.original_unit_price_minor && item.original_unit_price_minor > unitPrice) ||
                            (item.discount_minor && item.discount_minor > 0),
                          );
                          const subtotal = Math.round((currentRawQty * unitPrice) / 1000);
                          const isDisabled = maxQty <= 0;

                          return (
                            <tr
                              key={item.source_item_id}
                              className={
                                isDisabled
                                  ? 'opacity-40 bg-slate-50/50 dark:bg-slate-800/30'
                                  : currentPieces > 0
                                    ? 'bg-brand-50/30 dark:bg-brand-950/20'
                                    : ''
                              }
                            >
                              <td className="px-3 py-2.5">
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {item.product_name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {item.variant_name}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {item.sku ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                                {(item.quantity / 1000).toLocaleString('en-US', {
                                  maximumFractionDigits: 3,
                                })}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge variant={maxQty > 0 ? 'success' : 'neutral'}>
                                  {maxQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isDisabled || currentPieces <= 0}
                                    onClick={() => {
                                      setReturnQtys((p) => ({
                                        ...p,
                                        [item.source_item_id]: Math.max(
                                          0,
                                          (p[item.source_item_id] ?? 0) - 1000,
                                        ),
                                      }));
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxQty}
                                    step={1}
                                    disabled={isDisabled}
                                    value={currentPieces}
                                    onChange={(e) => {
                                      const v = Math.min(
                                        maxQty,
                                        Math.max(0, Math.floor(Number(e.target.value))),
                                      );
                                      setReturnQtys((p) => ({
                                        ...p,
                                        [item.source_item_id]: v * 1000,
                                      }));
                                    }}
                                    className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-bold dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    disabled={isDisabled || currentPieces >= maxQty}
                                    onClick={() => {
                                      setReturnQtys((p) => ({
                                        ...p,
                                        [item.source_item_id]: Math.min(
                                          maxQty * 1000,
                                          (p[item.source_item_id] ?? 0) + 1000,
                                        ),
                                      }));
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <select
                                  disabled={isDisabled}
                                  value={conditions[item.source_item_id] ?? 'resalable'}
                                  onChange={(e) => {
                                    setConditions((p) => ({
                                      ...p,
                                      [item.source_item_id]: e.target.value as ReturnCondition,
                                    }));
                                  }}
                                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                >
                                  <option value="resalable">Resalable (Restock)</option>
                                  <option value="damaged">Damaged (Do not restock)</option>
                                  <option value="defective">Defective</option>
                                </select>
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                                <div>{formatMoney(unitPrice)}</div>
                                {hasDiscount && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                    {item.original_unit_price_minor && item.original_unit_price_minor > unitPrice && (
                                      <span className="line-through mr-1 text-slate-400">
                                        {formatMoney(item.original_unit_price_minor)}
                                      </span>
                                    )}
                                    <span>(Discounted)</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                                {currentRawQty > 0 ? formatMoney(subtotal) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300"
                          >
                            Total Return Value:
                          </td>
                          <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400 text-sm">
                            {formatMoney(returnTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Step 3: Exchange Replacement Products (If Exchange Mode) */}
                {actionMode === 'exchange' && (
                  <div className="pt-2 border-t border-surface-border dark:border-slate-700">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ArrowLeftRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Step 3 — Pick Replacement Product(s)
                    </h4>

                    {/* Catalog search bar */}
                    <div className="relative mb-2">
                      <Input
                        id="exchange-modal-catalog-search"
                        label=""
                        value={catalogSearch}
                        onChange={(e) => {
                          setCatalogSearch(e.target.value);
                        }}
                        placeholder="Search product catalog by name, variant or SKU to add replacement..."
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                      />
                    </div>

                    {isCatalogSearching && <LoadingState message="Searching catalog products..." />}

                    {/* Replacement Search Results Dropdown */}
                    {catalogResults.length > 0 && (
                      <div className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700 shadow-md">
                        {catalogResults.map((item) => (
                          <button
                            type="button"
                            key={item.variant_id}
                            onClick={() => {
                              addReplacement(item);
                            }}
                            disabled={item.available_stock <= 0}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {item.product_name} &bull; {item.variant_name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.sku ? `SKU: ${item.sku}` : ''} &bull; Stock:{' '}
                                {String(item.available_stock / 1000)}u
                              </p>
                            </div>
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              {formatMoney(item.selling_price_minor)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected Replacements Table */}
                    {replacements.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-amber-200 dark:border-amber-800">
                        <table className="w-full text-xs">
                          <thead className="bg-amber-50 text-left text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                            <tr>
                              <th className="px-3 py-2">Replacement Product</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">Unit Price</th>
                              <th className="px-3 py-2 text-right">Total</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                            {replacements.map((r) => (
                              <tr key={r.variant_id}>
                                <td className="px-3 py-2">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {r.product_name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {r.variant_name}
                                  </p>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateReplacementQty(r.variant_id, -1);
                                      }}
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-8 text-center font-bold">
                                      {r.quantity / 1000}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateReplacementQty(r.variant_id, 1);
                                      }}
                                      disabled={r.quantity >= r.available_stock}
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {formatMoney(r.unit_price_minor)}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-amber-700 dark:text-amber-400">
                                  {formatMoney(r.total)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplacements((prev) =>
                                        prev.filter((p) => p.variant_id !== r.variant_id),
                                      );
                                    }}
                                    className="rounded p-1 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-amber-50/50 dark:bg-amber-950/20 font-bold border-t border-amber-200 dark:border-amber-800">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">
                                Replacement Total:
                              </td>
                              <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-400">
                                {formatMoney(replacementTotal)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-6 text-center text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                        Type above to search and select replacement products for exchange.
                      </div>
                    )}

                    {/* Exchange Difference Calculation Box */}
                    {returnTotal > 0 && replacementTotal > 0 && (
                      <div
                        className={`mt-3 rounded-xl border px-4 py-3 text-xs ${
                          exchangeDiff === 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : exchangeDiff > 0
                              ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                        }`}
                      >
                        <div className="flex justify-between font-bold text-sm">
                          <span>
                            {exchangeDiff === 0
                              ? '✓ Even Exchange — No payment required'
                              : exchangeDiff > 0
                                ? 'Customer pays additional difference:'
                                : 'Store refunds customer difference:'}
                          </span>
                          <span>
                            {exchangeDiff === 0 ? 'Rs 0.00' : formatMoney(Math.abs(exchangeDiff))}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] opacity-80">
                          Return value: {formatMoney(returnTotal)} &bull; Replacement value:{' '}
                          {formatMoney(replacementTotal)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason & Payment / Settlement Section */}
                <div className="pt-2 border-t border-surface-border dark:border-slate-700 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Input
                      id="modal-return-reason"
                      label="Reason / Notes *"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                      }}
                      placeholder="e.g. Wrong size, Defective piece, Customer changed mind..."
                      required
                      className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                    />
                  </div>

                  {actionMode === 'return' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Refund Settlement Method *
                      </label>
                      <select
                        value={refundMethod}
                        onChange={(e) => {
                          setRefundMethod(e.target.value as ReturnPaymentMethod);
                        }}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="cash">Cash (From Cash Drawer)</option>
                        <option value="card">Card / Digital Refund</option>
                        {workMode === 'sales' &&
                          Boolean(selectedSource?.customer_id || selectedSource?.party_name) && (
                            <option value="credit">Khata / Credit Adjustment</option>
                          )}
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Exchange Settlement Method *
                      </label>
                      <select
                        value={settlementMethod}
                        onChange={(e) => {
                          setSettlementMethod(e.target.value as ExchangeSettlementMethod);
                        }}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="even">Even Exchange (No difference)</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        {workMode === 'sales' &&
                          Boolean(selectedSource?.customer_id || selectedSource?.party_name) && (
                            <option value="credit">Khata / Credit</option>
                          )}
                        <option value="balance_adjustment">Ledger Balance Adjustment</option>
                      </select>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    {errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-surface-border bg-slate-50 px-6 py-3.5 dark:border-slate-700 dark:bg-slate-800/60 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </Button>

            {selectedSource && (
              <div className="flex items-center gap-2">
                {actionMode === 'return' ? (
                  <Button
                    onClick={() => {
                      void handleSubmitReturn();
                    }}
                    isLoading={isSubmitting}
                    disabled={returnTotal <= 0 || !reason.trim()}
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    variant="destructive"
                  >
                    Complete Return ({formatMoney(returnTotal)})
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      void handleSubmitExchange();
                    }}
                    isLoading={isSubmitting}
                    disabled={returnTotal <= 0 || replacements.length === 0 || !reason.trim()}
                    leftIcon={<ArrowLeftRight className="h-4 w-4" />}
                    className="!bg-amber-600 !text-white hover:!bg-amber-700 dark:!bg-amber-500 dark:hover:!bg-amber-600"
                  >
                    Complete Exchange
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Popups */}
      {receiptReturn &&
        (workMode === 'sales' ? (
          <SalesReturnReceipt
            returnData={receiptReturn}
            onClose={() => {
              setReceiptReturn(null);
              onClose();
            }}
          />
        ) : (
          <SupplierReturnReceipt
            returnData={receiptReturn}
            onClose={() => {
              setReceiptReturn(null);
              onClose();
            }}
          />
        ))}

      {receiptExchange && (
        <SalesExchangeReceipt
          exchangeData={receiptExchange}
          onClose={() => {
            setReceiptExchange(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
