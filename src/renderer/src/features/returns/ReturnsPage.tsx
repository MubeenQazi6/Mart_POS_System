import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { Badge } from '@renderer/components/ui/Badge';
import { formatMoney } from '@shared/utils/money';
import { showToast } from '@renderer/components/ui/Toast';
import { useSettingsStore } from '@renderer/stores/settingsStore';
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
  RefreshCw,
  FileText,
  AlertCircle,
  Package,
  DollarSign,
  Users,
  Truck,
  X,
  ArrowLeftRight,
  Plus,
  Minus,
  Printer,
} from 'lucide-react';
import {
  SalesReturnReceipt,
  SalesExchangeReceipt,
  SupplierReturnReceipt,
} from './ReturnReceiptPrinter';

type WorkMode = 'sales' | 'purchases';
type ActionMode = 'return' | 'exchange';

import { formatReceiptDateTime } from '@shared/utils/format';

function formatDateTime(isoString: string): string {
  return formatReceiptDateTime(isoString);
}

// ─── Product search for replacement items in exchange ─────────────────────────
interface ReplacementItem {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  unit_price_minor: number;
  quantity: number; // scaled ×1000
  total: number;
}

interface CatalogReplacementVariant {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  selling_price_minor: number;
  available_stock: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function ReturnsPage(): React.JSX.Element {
  const { settings } = useSettingsStore();
  const allowCashRefund = settings['returns.allow_cash_refund'] ?? true;

  // ── Mode ──
  const [workMode, setWorkMode] = useState<WorkMode>('sales');
  const [actionMode, setActionMode] = useState<ActionMode>('return');

  // ── Source search ──
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ReturnRow[]>([]);
  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ── Return form state ──
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});     // source_item_id → qty (scaled ×1000)
  const [conditions, setConditions] = useState<Record<number, ReturnCondition>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<ReturnPaymentMethod>(allowCashRefund ? 'cash' : 'card');

  // ── Exchange replacement items ──
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [settlementMethod, setSettlementMethod] = useState<ExchangeSettlementMethod>('cash');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogReplacementVariant[]>([]);
  const [isCatalogSearching, setIsCatalogSearching] = useState(false);

  // ── History ──
  const [history, setHistory] = useState<ReturnRow[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'sales' | 'purchase'>('all');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ── Detail / receipt ──
  const [detail, setDetail] = useState<ReturnRow | null>(null);
  const [receiptReturn, setReceiptReturn] = useState<ReturnRow | null>(null);
  const [receiptExchange, setReceiptExchange] = useState<ExchangeRow | null>(null);

  // ── Stats ──
  const [stats, setStats] = useState({ totalReturns: 0, totalRefundAmount: 0 });

  // ─── Load history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (): Promise<void> => {
    if (!window.martpos) return;
    setIsHistoryLoading(true);
    try {
      const res = await window.martpos.returns.history(
        historySearch || undefined,
        historyFrom || undefined,
        historyTo || undefined,
        historyType === 'all' ? undefined : historyType,
      );
      if (res.success) {
        setHistory(res.data);
        setStats({
          totalReturns: res.data.length,
          totalRefundAmount: res.data.reduce((s, r) => s + r.refund_amount_minor, 0),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historySearch, historyFrom, historyTo, historyType]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  // ─── Search for source invoice/purchase ────────────────────────────────────
  const searchSources = async (): Promise<void> => {
    if (!window.martpos) return;
    if (!search.trim()) { setMessage('Enter an invoice or purchase number to search'); return; }
    setIsLoading(true);
    setMessage(null);
    setResults([]);
    setSelected(null);
    try {
      const res = workMode === 'sales'
        ? await window.martpos.returns.searchSales(search)
        : await window.martpos.returns.searchPurchases(search);
      if (res.success) {
        setResults(res.data);
        if (res.data.length === 0) {
          setMessage(`Record Not Found — No matching ${workMode === 'sales' ? 'sales invoice' : 'supplier purchase record'} found.`);
        }
      } else {
        setMessage(res.error ?? 'Search failed');
      }
    } catch {
      setMessage('Search error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const selectSource = (source: ReturnRow): void => {
    setSelected(source);
    setReturnQtys({});
    setConditions({});
    setReplacements([]);
    setMessage(null);
  };

  const resetWorkflow = (): void => {
    setSearch('');
    setResults([]);
    setSelected(null);
    setReturnQtys({});
    setConditions({});
    setReplacements([]);
    setReason('');
    setMessage(null);
    setCatalogSearch('');
    setCatalogResults([]);
  };

  // Search product catalog for replacements
  const searchCatalogForReplacement = useCallback(async (term: string): Promise<void> => {
    if (!window.martpos || !term.trim()) { setCatalogResults([]); return; }
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
    } catch { /* ignore */ } finally {
      setIsCatalogSearching(false);
    }
  }, []);

  useEffect(() => {
    if (catalogSearch.trim().length >= 1) {
      const t = setTimeout(() => { void searchCatalogForReplacement(catalogSearch); }, 300);
      return () => { clearTimeout(t); };
    } else {
      setCatalogResults([]);
    }
  }, [catalogSearch, searchCatalogForReplacement]);

  const addReplacement = (item: CatalogReplacementVariant, unitPrice: number): void => {
    const existing = replacements.find((r) => r.variant_id === item.variant_id);
    if (existing) {
      setReplacements(replacements.map((r) =>
        r.variant_id === item.variant_id
          ? { ...r, quantity: r.quantity + 1000, total: Math.round(((r.quantity + 1000) * r.unit_price_minor) / 1000) }
          : r,
      ));
    } else {
      setReplacements([...replacements, {
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
        unit_price_minor: unitPrice,
        quantity: 1000,
        total: unitPrice,
      }]);
    }
  };

  const updateReplacementQty = (variantId: number, delta: number): void => {
    setReplacements((prev) => prev
      .map((r) => r.variant_id === variantId
        ? { ...r, quantity: Math.max(0, r.quantity + delta * 1000), total: Math.round((Math.max(0, r.quantity + delta * 1000) * r.unit_price_minor) / 1000) }
        : r)
      .filter((r) => r.quantity > 0),
    );
  };

  // ─── Computed values ───────────────────────────────────────────────────────
  const returnTotal = Object.entries(returnQtys).reduce((sum, [sid, qty]) => {
    const item = selected?.items?.find((i) => i.source_item_id === Number(sid));
    if (!item || qty <= 0) return sum;
    const unitPrice =
      item.unit_amount_minor ??
      (item.quantity > 0 ? Math.round((item.amount_minor * 1000) / item.quantity) : item.amount_minor);
    return sum + Math.round((qty * unitPrice) / 1000);
  }, 0);

  const replacementTotal = replacements.reduce((s, r) => s + r.total, 0);
  const exchangeDiff = replacementTotal - returnTotal;

  // ─── Submit return ─────────────────────────────────────────────────────────
  const submitReturn = async (): Promise<void> => {
    if (!window.martpos || !selected) return;
    const items = Object.entries(returnQtys)
      .filter(([, q]) => q > 0)
      .map(([sid, quantity]) => ({
        source_item_id: Number(sid),
        quantity,
        return_condition: conditions[Number(sid)] ?? 'resalable',
      }));
    if (!reason.trim()) { setMessage('Please enter a return reason'); return; }
    if (items.length === 0) { setMessage('Select at least one item to return'); return; }

    setIsLoading(true);
    try {
      const res = workMode === 'sales'
        ? await window.martpos.returns.createSales({ sale_id: selected.source_id, items, reason, refund_method: refundMethod })
        : await window.martpos.returns.createPurchase({ purchase_id: selected.source_id, items, reason, refund_method: refundMethod });

      if (res.success) {
        showToast('success', `${res.data.return_number} processed — ${formatMoney(res.data.refund_amount_minor)} refunded`);
        setReceiptReturn(res.data);
        resetWorkflow();
        void loadHistory();
      } else {
        showToast('error', res.error ?? 'Failed to process return');
        setMessage(res.error ?? 'Failed to process return');
      }
    } catch {
      showToast('error', 'Unexpected error processing return');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Submit exchange ───────────────────────────────────────────────────────
  const submitExchange = async (): Promise<void> => {
    if (!window.martpos || !selected) return;
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

    if (!reason.trim()) { setMessage('Please enter an exchange reason'); return; }
    if (returnItems.length === 0) { setMessage('Select at least one item to return'); return; }
    if (replacementItems.length === 0) { setMessage('Select at least one replacement item'); return; }

    setIsLoading(true);
    try {
      const res = workMode === 'sales'
        ? await window.martpos.returns.createSalesExchange({
            sale_id: selected.source_id,
            return_items: returnItems,
            replacement_items: replacementItems,
            reason,
            settlement_method: settlementMethod,
          })
        : await window.martpos.returns.createPurchaseExchange({
            purchase_id: selected.source_id,
            return_items: returnItems,
            replacement_items: replacementItems,
            reason,
            settlement_method: settlementMethod === 'even' ? 'even' : settlementMethod === 'cash' ? 'cash' : 'balance_adjustment',
          });

      if (res.success) {
        showToast('success', `${res.data.exchange_number} processed successfully`);
        setReceiptExchange(res.data);
        resetWorkflow();
        void loadHistory();
      } else {
        showToast('error', res.error ?? 'Failed to process exchange');
        setMessage(res.error ?? 'Failed to process exchange');
      }
    } catch {
      showToast('error', 'Unexpected error processing exchange');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── View detail ──────────────────────────────────────────────────────────
  const viewDetail = async (item: ReturnRow): Promise<void> => {
    if (!window.martpos) return;
    try {
      if (item.record_type === 'exchange') {
        const res = item.return_type === 'sales'
          ? await window.martpos.returns.getSalesExchangeById(item.id)
          : await window.martpos.returns.getPurchaseExchangeById(item.id);
        if (res.success) setReceiptExchange(res.data);
      } else {
        const res = item.return_type === 'sales'
          ? await window.martpos.returns.getSalesById(item.id)
          : await window.martpos.returns.getPurchaseById(item.id);
        if (res.success) setDetail(res.data);
      }
    } catch {
      showToast('error', 'Failed to load details');
    }
  };

  // ─── Mode switch helper ──────────────────────────────────────────────────
  const switchWorkMode = (mode: WorkMode): void => {
    setWorkMode(mode);
    resetWorkflow();
  };
  const switchActionMode = (mode: ActionMode): void => {
    setActionMode(mode);
    setSelected(null);
    setReturnQtys({});
    setConditions({});
    setReplacements([]);
    setMessage(null);
    setResults([]);
    setSearch('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Returns & Exchanges"
        description="Process controlled returns and exchanges against completed invoices and purchase records."
      />

      {/* Top stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-1.5 text-sm">
          <Package className="h-4 w-4 text-slate-500" />
          <span className="text-slate-500">Total Records:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{stats.totalReturns}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="h-4 w-4 text-slate-500" />
          <span className="text-slate-500">Total Refunds:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(stats.totalRefundAmount)}</span>
        </div>
      </div>

      {/* Work mode + action mode toggle */}
      <div className="flex flex-wrap gap-2">
        {/* Customer vs Supplier */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { switchWorkMode('sales'); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${workMode === 'sales' ? 'bg-brand-500 text-navy-800 shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            <Users className="h-4 w-4" />
            Customer Sales
          </button>
          <button
            type="button"
            onClick={() => { switchWorkMode('purchases'); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${workMode === 'purchases' ? 'bg-brand-500 text-navy-800 shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            <Truck className="h-4 w-4" />
            Supplier Purchases
          </button>
        </div>

        {/* Return vs Exchange */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { switchActionMode('return'); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${actionMode === 'return' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            <RotateCcw className="h-4 w-4" />
            Return
          </button>
          <button
            type="button"
            onClick={() => { switchActionMode('exchange'); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${actionMode === 'exchange' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Exchange
          </button>
        </div>
      </div>

      {/* Policy terms banner */}
      {settings['returns.policy_text'] && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Store Return Policy: </span>
            <span>{settings['returns.policy_text']}</span>
          </div>
        </div>
      )}

      {/* Source search panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Step 1 — Find the {workMode === 'sales' ? 'Original Invoice' : 'Purchase Record'}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="return-source-search"
              label={workMode === 'sales' ? 'Invoice number' : 'Purchase number or supplier name'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              placeholder={workMode === 'sales' ? 'e.g. INV-00001' : 'e.g. PO-00001 or supplier name'}
              onKeyDown={(e) => { if (e.key === 'Enter') { void searchSources(); } }}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { void searchSources(); }} isLoading={isLoading} leftIcon={<Search className="h-4 w-4" />}>
              Search
            </Button>
            {(search || selected) && (
              <Button variant="ghost" onClick={resetWorkflow} leftIcon={<X className="h-4 w-4" />}>Clear</Button>
            )}
          </div>
        </div>

        {/* Search results */}
        {results.length > 0 && !selected && (
          <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {results.map((src) => (
              <button
                type="button"
                key={src.source_id}
                onClick={() => { selectSource(src); }}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{src.source_number}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {src.party_name ?? 'Walk-in customer'} · {formatDateTime(src.created_at)}
                  </p>
                </div>
                <Badge variant="success">{formatMoney(src.refund_amount_minor)}</Badge>
              </button>
            ))}
          </div>
        )}

        {message && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}
      </div>

      {/* ── Return / Exchange form ────────────────────────────────────────────── */}
      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{selected.source_number}</h2>
                <Badge variant={actionMode === 'return' ? 'danger' : 'warning'}>
                  {actionMode === 'return' ? 'Return' : 'Exchange'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.party_name ?? 'Walk-in customer'} · {formatDateTime(selected.created_at)}
              </p>
            </div>
            <button type="button" onClick={() => { setSelected(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Step 2: Select items to return ─────────────────────────────── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 2 — Select Items to Return
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Product / Variant</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-center">Sold</th>
                  <th className="px-4 py-2.5 text-center">Returnable</th>
                  <th className="px-4 py-2.5 text-center">Return Qty</th>
                  <th className="px-4 py-2.5">Condition</th>
                  <th className="px-4 py-2.5 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {selected.items?.map((item) => {
                  const maxQty = Math.floor((item.remaining_quantity ?? item.quantity) / 1000);
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
                    <tr key={item.source_item_id} className={isDisabled ? 'opacity-40' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{item.product_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_name}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                        {(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={maxQty > 0 ? 'success' : 'neutral'}>
                          {maxQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={isDisabled || currentPieces <= 0}
                            onClick={() => {
                              setReturnQtys((p) => ({ ...p, [item.source_item_id]: Math.max(0, (p[item.source_item_id] ?? 0) - 1000) }));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700"
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
                              const v = Math.min(maxQty, Math.max(0, Math.floor(Number(e.target.value))));
                              setReturnQtys((p) => ({ ...p, [item.source_item_id]: v * 1000 }));
                            }}
                            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            disabled={isDisabled || currentPieces >= maxQty}
                            onClick={() => {
                              setReturnQtys((p) => ({ ...p, [item.source_item_id]: Math.min(maxQty * 1000, (p[item.source_item_id] ?? 0) + 1000) }));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isDisabled}
                          value={conditions[item.source_item_id] ?? 'resalable'}
                          onChange={(e) => { setConditions((p) => ({ ...p, [item.source_item_id]: e.target.value as ReturnCondition })); }}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                          <option value="resalable">Resalable</option>
                          <option value="damaged">Damaged</option>
                          <option value="defective">Defective</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
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
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {currentRawQty > 0 ? formatMoney(subtotal) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <td colSpan={7} className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                    Return Value:
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                    {formatMoney(returnTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Exchange: replacement items ────────────────────────────────── */}
          {actionMode === 'exchange' && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Step 3 — Select Replacement Item(s)
              </h3>

              {/* Catalog search */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <Input
                    id="exchange-catalog-search"
                    label="Search products by name / SKU / invoice"
                    value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); }}
                    placeholder="Type product name or SKU…"
                  />
                </div>
              </div>

              {isCatalogSearching && <LoadingState message="Searching catalog…" />}

              {/* Catalog results */}
              {catalogResults.length > 0 && (
                <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {catalogResults.map((item) => (
                    <button
                      type="button"
                      key={item.variant_id}
                      onClick={() => { addReplacement(item, item.selling_price_minor); setCatalogSearch(''); setCatalogResults([]); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.product_name} — {item.variant_name}</p>
                        <p className="text-xs text-slate-500">{item.sku ? `SKU: ${item.sku}` : ''} &bull; Stock: {String(item.available_stock / 1000)}u</p>
                      </div>
                      <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{formatMoney(item.selling_price_minor)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected replacements table */}
              {replacements.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 text-left text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <tr>
                        <th className="px-4 py-2.5">Replacement Product</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Unit Price</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 dark:divide-amber-900/40">
                      {replacements.map((r) => (
                        <tr key={r.variant_id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{r.product_name} — {r.variant_name}</p>
                            {r.sku && <p className="text-xs text-slate-500">{r.sku}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => { updateReplacementQty(r.variant_id, -1); }} className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"><Minus className="h-3 w-3" /></button>
                              <span className="w-10 text-center text-sm font-medium">{r.quantity / 1000}</span>
                              <button type="button" onClick={() => { updateReplacementQty(r.variant_id, 1); }} className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatMoney(r.unit_price_minor)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => { setReplacements((prev) => prev.filter((p) => p.variant_id !== r.variant_id)); }} className="rounded p-1 text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-amber-50 dark:bg-amber-950/20">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Replacement Total:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-amber-700 dark:text-amber-400">{formatMoney(replacementTotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 py-8 text-center text-sm text-amber-600 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                  Search for products above to add replacement items
                </div>
              )}

              {/* Exchange difference summary */}
              {returnTotal > 0 && replacementTotal > 0 && (
                <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                  exchangeDiff === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : exchangeDiff > 0 ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                }`}>
                  <div className="flex justify-between font-bold text-base">
                    <span>{exchangeDiff === 0 ? '✓ Even exchange' : exchangeDiff > 0 ? 'Customer pays additional:' : 'Store refunds customer:'}</span>
                    <span>{exchangeDiff === 0 ? 'No payment required' : formatMoney(Math.abs(exchangeDiff))}</span>
                  </div>
                  <div className="mt-0.5 text-xs opacity-75">
                    Return value {formatMoney(returnTotal)} → Replacement value {formatMoney(replacementTotal)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reason + payment method ───────────────────────────────────── */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Input
                id="return-reason"
                label="Reason *"
                value={reason}
                onChange={(e) => { setReason(e.target.value); }}
                placeholder="Enter reason for return/exchange"
                required
              />
            </div>

            {actionMode === 'return' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Refund Method *</label>
                <select
                  value={refundMethod}
                  onChange={(e) => { setRefundMethod(e.target.value as ReturnPaymentMethod); }}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="cash" disabled={!allowCashRefund}>
                    Cash {!allowCashRefund ? '(Disallowed by Policy)' : ''}
                  </option>
                  <option value="card">Card</option>
                  {workMode === 'sales' && <option value="credit">Khata / Credit</option>}
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Settlement Method *</label>
                <select
                  value={settlementMethod}
                  onChange={(e) => { setSettlementMethod(e.target.value as ExchangeSettlementMethod); }}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="even">Even — No Payment</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  {workMode === 'sales' && <option value="credit">Khata / Credit</option>}
                  <option value="balance_adjustment">Balance Adjustment</option>
                </select>
              </div>
            )}

            <div className="flex items-end gap-2">
              {actionMode === 'return' ? (
                <Button
                  onClick={() => { void submitReturn(); }}
                  isLoading={isLoading}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  className="flex-1"
                  variant="destructive"
                >
                  Process Return
                </Button>
              ) : (
                <Button
                  onClick={() => { void submitExchange(); }}
                  isLoading={isLoading}
                  leftIcon={<ArrowLeftRight className="h-4 w-4" />}
                  className="flex-1 !bg-amber-500 !text-white hover:!bg-amber-600"
                >
                  Process Exchange
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── History section ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Return & Exchange History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">All processed customer and supplier transactions</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => { void loadHistory(); }} isLoading={isHistoryLoading}>
            Refresh
          </Button>
        </div>

        {/* History filters */}
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex-1 min-w-[160px]">
            <Input
              id="history-search"
              label="Search"
              value={historySearch}
              onChange={(e) => { setHistorySearch(e.target.value); }}
              placeholder="Return#, invoice#, reason…"
            />
          </div>
          <div className="w-36">
            <Input id="history-from" label="From" type="date" value={historyFrom} onChange={(e) => { setHistoryFrom(e.target.value); }} />
          </div>
          <div className="w-36">
            <Input id="history-to" label="To" type="date" value={historyTo} onChange={(e) => { setHistoryTo(e.target.value); }} />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Source Type</label>
            <select
              value={historyType}
              onChange={(e) => { setHistoryType(e.target.value as typeof historyType); }}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="sales">Customer Sales</option>
              <option value="purchase">Supplier Purchases</option>
            </select>
          </div>
        </div>

        {isHistoryLoading ? (
          <LoadingState message="Loading history…" />
        ) : history.length === 0 ? (
          <EmptyState icon={FileText} title="No records found" description="Returns and exchanges will appear here once processed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="data-table-header">
                <tr>
                  <th className="px-4 py-2.5">Number</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Party</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={`${item.record_type ?? 'return'}-${item.id}`} className="data-table-row">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">{item.return_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.record_type === 'exchange'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {item.record_type === 'exchange' ? <ArrowLeftRight className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        {item.record_type === 'exchange' ? 'Exchange' : 'Return'}
                        {' / '}
                        {item.return_type === 'sales' ? 'Sales' : 'Purchase'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.source_number}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.party_name ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 uppercase text-xs">{item.refund_method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(item.refund_amount_minor)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => { void viewDetail(item); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              {history.length} records · Total: {formatMoney(stats.totalRefundAmount)}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail modal (return) ─────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{detail.return_number}</h2>
                <p className="text-xs text-slate-500">{detail.source_number} · {detail.party_name ?? 'Walk-in customer'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setReceiptReturn(detail); setDetail(null); }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </button>
                <button type="button" onClick={() => { setDetail(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-500">Return Date</p><p className="font-medium">{formatDateTime(detail.created_at)}</p></div>
                <div><p className="text-xs text-slate-500">Settlement Method</p><p className="font-medium capitalize">{detail.refund_method}</p></div>
                <div className="col-span-2"><p className="text-xs text-slate-500">Reason</p><p className="font-medium">{detail.reason}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Total Refund</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(detail.refund_amount_minor)}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Returned Items</p>
                <div className="space-y-2">
                  {detail.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.product_name} / {item.variant_name}</p>
                        <p className="text-xs text-slate-500">Qty: {(item.quantity / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })} · {item.return_condition ?? 'resalable'}{item.sku ? ` · ${item.sku}` : ''}</p>
                      </div>
                      <p className="font-semibold">{formatMoney(item.amount_minor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <Button onClick={() => { setDetail(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt modals ──────────────────────────────────────────────────── */}
      {receiptReturn && (
        receiptReturn.return_type === 'purchase' || workMode === 'purchases' ? (
          <SupplierReturnReceipt returnData={receiptReturn} onClose={() => { setReceiptReturn(null); }} />
        ) : (
          <SalesReturnReceipt returnData={receiptReturn} onClose={() => { setReceiptReturn(null); }} />
        )
      )}
      {receiptExchange && (
        <SalesExchangeReceipt exchangeData={receiptExchange} onClose={() => { setReceiptExchange(null); }} />
      )}
    </div>
  );
}
