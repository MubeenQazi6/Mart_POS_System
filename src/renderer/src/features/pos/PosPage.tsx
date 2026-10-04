import React, { useState, useEffect, useRef, useTransition, useMemo, useCallback } from 'react';
import { usePosStore } from '@renderer/stores/posStore';
import { formatMoney, toMinorUnits } from '@shared/utils/money';
import { formatReceiptDateTime } from '@shared/utils/format';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Play,
  RotateCcw,
  CreditCard,
  ShoppingCart,
  Percent,
  Scan,
  X,
  Package,
  PlusCircle,
  History,
  ArrowLeftRight,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { ReceiptPreview } from './ReceiptPreview';
import { HeldBillsModal } from './HeldBillsModal';
import { ReturnExchangeModal } from '../returns/ReturnExchangeModal';
import type { ProductRow, ProductVariantRow } from '@shared/types/catalog';
import type { SaleRow } from '@shared/types/sales';
import { useAuthStore } from '@renderer/stores/authStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { showToast } from '@renderer/components/ui/Toast';

export function PosPage(): React.JSX.Element {
  const {
    items,
    billDiscountMinor,
    heldBills,
    isPaymentModalOpen,
    isHeldBillsModalOpen,
    isReceiptModalOpen,
    completedSale,
    getSubtotalMinor,
    getTotalMinor,
    getItemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setBillDiscount,
    lookupAndAddBarcode,
    loadHeldBills,
    holdCurrentBill,
    openPaymentModal,
    closePaymentModal,
    openHeldBillsModal,
    closeHeldBillsModal,
    closeReceiptModal,
  } = usePosStore();

  const [scanQuery, setScanQuery] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<ProductRow[]>([]);
  const [transactionQuery, setTransactionQuery] = useState('');
  const [transactionResults, setTransactionResults] = useState<SaleRow[]>([]);
  const [reprintSale, setReprintSale] = useState<SaleRow | null>(null);
  const [isTransactionSearching, setIsTransactionSearching] = useState(false);
  const [hasSearchedInvoice, setHasSearchedInvoice] = useState(false);
  const { currentUser, can } = useAuthStore();
  const { settings } = useSettingsStore();
  const [isSearching, startTransition] = useTransition();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Return & Exchange Modal inside POS (Direct action without redirecting)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnActionMode, setReturnActionMode] = useState<'return' | 'exchange'>('return');

  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Manual Add Modal State
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<ProductRow[]>([]);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [manualQuantities, setManualQuantities] = useState<Record<number, number>>({});

  // Full History / Recent Invoices Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearchFilter, setHistorySearchFilter] = useState('');

  // Debounced real-time Invoice Lookup / Reprint search
  useEffect(() => {
    const clean = transactionQuery.trim();
    if (!clean) {
      setTransactionResults([]);
      setHasSearchedInvoice(false);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        if (!window.martpos) return;
        setIsTransactionSearching(true);
        try {
          const response = await window.martpos.sales.search({
            search: clean,
            limit: 20,
          });
          setHasSearchedInvoice(true);
          if (response.success) {
            setTransactionResults(response.data);
          } else {
            setTransactionResults([]);
          }
        } catch {
          setHasSearchedInvoice(true);
          setTransactionResults([]);
        } finally {
          setIsTransactionSearching(false);
        }
      })();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [transactionQuery]);

  // Load initial held bills count & focus barcode input
  useEffect(() => {
    void loadHeldBills();
    scanInputRef.current?.focus();
  }, [loadHeldBills]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // F2: Focus scanner
      if (e.key === 'F2') {
        e.preventDefault();
        scanInputRef.current?.focus();
        scanInputRef.current?.select();
      }
      // F4: Open held bills
      if (e.key === 'F4') {
        e.preventDefault();
        openHeldBillsModal();
      }
      // F6: Toggle discount
      if (e.key === 'F6' && items.length > 0) {
        e.preventDefault();
        setShowDiscountInput(!showDiscountInput);
        if (!showDiscountInput) {
          setDiscountValue('');
        }
      }
      // F8: Clear cart
      if (e.key === 'F8' && items.length > 0 && !isPaymentModalOpen) {
        e.preventDefault();
        if (window.confirm('Are you sure you want to clear the active cart?')) {
          clearCart();
        }
      }
      // F12: Checkout
      if (
        e.key === 'F12' &&
        items.length > 0 &&
        !isPaymentModalOpen &&
        !isReceiptModalOpen &&
        !isManualAddModalOpen &&
        !isHistoryModalOpen
      ) {
        e.preventDefault();
        openPaymentModal();
      }
      // Escape: Close discount input or modals
      if (e.key === 'Escape') {
        if (showDiscountInput) {
          setShowDiscountInput(false);
          setDiscountValue('');
        }
        if (isManualAddModalOpen) setIsManualAddModalOpen(false);
        if (isHistoryModalOpen) setIsHistoryModalOpen(false);
      }
      // Ctrl+P: Reprint last completed sale if receipt preview is not currently open
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (!isReceiptModalOpen && completedSale) {
          e.preventDefault();
          setReprintSale(completedSale);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    items.length,
    isPaymentModalOpen,
    isReceiptModalOpen,
    isManualAddModalOpen,
    isHistoryModalOpen,
    completedSale,
    clearCart,
    openPaymentModal,
    openHeldBillsModal,
    showDiscountInput,
  ]);

  // ─── Catalog Refresh ─────────────────────────────────────────────────────
  // Centralised function so any trigger (query change, post-sale, polling)
  // always fetches fresh stock data from the DB without a full page reload.
  const refreshCatalog = useCallback(
    (query?: string) => {
      if (!window.martpos) return;
      const q = (query ?? scanQuery).trim();
      if (!q) {
        void window.martpos.products.list({ is_active: true }).then((res) => {
          if (res.success) setCatalogProducts(res.data.slice(0, 24));
        });
      } else {
        startTransition(() => {
          void window.martpos?.products.search({ search: q, is_active: true }).then((res) => {
            if (res.success) setCatalogProducts(res.data);
          });
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanQuery],
  );

  // Search catalog when query changes
  useEffect(() => {
    refreshCatalog(scanQuery);
  }, [scanQuery, refreshCatalog]);

  // Refresh catalog after a sale is completed so stock levels update instantly
  useEffect(() => {
    if (completedSale) {
      refreshCatalog();
    }
  }, [completedSale, refreshCatalog]);

  // Background polling — keep stock fresh every 30 s during long sessions
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCatalog();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refreshCatalog]);

  // Manual Add Modal search effect
  useEffect(() => {
    if (!isManualAddModalOpen || !window.martpos) return;
    const query = manualSearchQuery.trim();
    setIsManualSearching(true);
    if (!query) {
      void window.martpos.products.list({ is_active: true }).then((res) => {
        if (res.success) setManualSearchResults(res.data.slice(0, 30));
        setIsManualSearching(false);
      });
      return;
    }

    void window.martpos.products.search({ search: query, is_active: true }).then((res) => {
      if (res.success) setManualSearchResults(res.data);
      setIsManualSearching(false);
    });
  }, [isManualAddModalOpen, manualSearchQuery]);

  // Load Recent Sales for History Modal
  const loadRecentSales = async (): Promise<void> => {
    if (!window.martpos) return;
    setIsLoadingHistory(true);
    try {
      const res = await window.martpos.sales.search({
        status: 'completed',
        limit: 50,
      });
      if (res.success) {
        setRecentSales(res.data);
      }
    } catch (err) {
      console.error('Failed to load recent sales:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openHistoryModal = (): void => {
    setIsHistoryModalOpen(true);
    setHistorySearchFilter('');
    void loadRecentSales();
  };

  // Filtered recent sales for History Modal
  const filteredRecentSales = useMemo(() => {
    const q = historySearchFilter.trim().toLowerCase();
    if (!q) return recentSales;
    return recentSales.filter(
      (s) =>
        s.invoice_number.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)),
    );
  }, [recentSales, historySearchFilter]);

  // Apply discount logic
  const applyDiscount = (): void => {
    const isManager = currentUser?.role === 'store_manager' || currentUser?.role === 'admin';
    if (settings['security.require_admin_discount'] && !isManager) {
      showToast(
        'error',
        'Manager or Admin authorization is required to apply custom bill discounts',
      );
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) {
      showToast('error', 'Please enter a valid discount amount');
      return;
    }

    const subtotal = getSubtotalMinor();
    let discountMinor = 0;

    if (discountType === 'percentage') {
      const percentage = Math.min(value, 100);
      discountMinor = Math.round((subtotal * percentage) / 100);
    } else {
      const fixedAmount = toMinorUnits(value);
      discountMinor = Math.min(fixedAmount, subtotal);
    }

    setBillDiscount(discountMinor);
    setShowDiscountInput(false);
    setDiscountValue('');
    showToast('success', `Discount applied: ${formatMoney(discountMinor)}`);
  };

  const removeDiscount = (): void => {
    setBillDiscount(0);
    setDiscountValue('');
    showToast('info', 'Discount removed');
  };

  // Handle barcode scanning submit (Enter key)
  const handleScannerSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const clean = scanQuery.trim();
    if (!clean) return;

    // 1. Try barcode lookup first
    const added = await lookupAndAddBarcode(clean);
    if (added) {
      setScanQuery('');
      scanInputRef.current?.focus();
      return;
    }

    // 2. If single product match with 1 variant, add it
    if (catalogProducts.length === 1) {
      const prod = catalogProducts[0];
      if (prod && prod.variants && prod.variants.length === 1) {
        const v = prod.variants[0];
        if (v) {
          handleSelectVariant(prod, v);
          setScanQuery('');
          scanInputRef.current?.focus();
        }
      }
    }
  };

  const handleSelectVariant = (
    product: ProductRow,
    variant: ProductVariantRow,
    isManual = false,
    customQuantity = 1000,
  ): void => {
    const currentQuantity = items.find((item) => item.variant_id === variant.id)?.quantity ?? 0;
    const reservedQuantity = items.filter((item) => item.variant_id === variant.id).reduce((sum, item) => sum + item.quantity, 0);
    const effectiveAvailableStock = Math.max(0, (variant.available_stock ?? 0) - reservedQuantity);

    if (!isManual && effectiveAvailableStock <= 0) {
      showToast(
        'error',
        `${product.name} (${variant.variant_name}) is out of stock and cannot be added.`,
      );
      return;
    }
    if (!isManual && currentQuantity + customQuantity > (variant.available_stock ?? 0)) {
      showToast(
        'error',
        `Only ${String(effectiveAvailableStock / 1000)} units are available for ${product.name}.`,
      );
      return;
    }

    addItem({
      variant_id: variant.id,
      product_name: product.name,
      variant_name: variant.variant_name,
      sku: variant.sku,
      selling_price_minor: variant.selling_price_minor,
      available_stock: Math.max(0, variant.available_stock ?? 0),
      barcode: variant.barcodes?.[0]?.barcode,
      is_manual: isManual,
      is_out_of_stock: isManual || ((variant.available_stock ?? 0) <= 0),
      quantity: customQuantity,
    });
    scanInputRef.current?.focus();
  };

  const searchTransactions = async (): Promise<void> => {
    if (!window.martpos || !transactionQuery.trim()) {
      setTransactionResults([]);
      setHasSearchedInvoice(false);
      return;
    }
    setIsTransactionSearching(true);
    try {
      const response = await window.martpos.sales.search({
        search: transactionQuery.trim(),
        limit: 20,
      });
      setHasSearchedInvoice(true);
      if (response.success) setTransactionResults(response.data);
      else setTransactionResults([]);
    } catch {
      setHasSearchedInvoice(true);
      setTransactionResults([]);
    } finally {
      setIsTransactionSearching(false);
    }
  };

  const handleVoidSale = async (sale: SaleRow): Promise<void> => {
    const isManager = currentUser?.role === 'store_manager' || currentUser?.role === 'admin';
    if (settings['security.require_admin_void'] && !isManager) {
      showToast('error', 'Manager or Admin authorization is required to void completed sales');
      return;
    }

    if (
      !window.martpos ||
      !window.confirm(
        `Void completed invoice ${sale.invoice_number}? This will reverse stock and applicable balances.`,
      )
    )
      return;
    const response = await window.martpos.sales.void(sale.id);
    if (response.success) {
      setTransactionResults((current) =>
        current.map((item) => (item.id === sale.id ? response.data : item)),
      );
      setRecentSales((current) =>
        current.map((item) => (item.id === sale.id ? response.data : item)),
      );
      setReprintSale(null);
      showToast('success', `Invoice ${sale.invoice_number} has been voided.`);
    }
  };

  const getDiscountDisplay = (): string => {
    if (billDiscountMinor === 0) return 'No discount';
    const subtotal = getSubtotalMinor();
    const percentage = Math.round((billDiscountMinor / subtotal) * 100);
    return `${formatMoney(billDiscountMinor)} (${String(percentage)}%)`;
  };

  const getStockStatus = (stock: number): { color: string; bgColor: string; label: string } => {
    const units = stock / 1000;
    if (units <= 0)
      return {
        color: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
        label: 'Out of Stock',
      };
    if (units <= 5)
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        label: 'Low Stock',
      };
    if (units <= 20)
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        label: 'Medium Stock',
      };
    return {
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      label: 'In Stock',
    };
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-2 sm:p-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-border bg-white px-5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Point of Sale Terminal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cashier Billing &bull;{' '}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono dark:bg-slate-800">
                F2
              </kbd>{' '}
              Scan &bull;{' '}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono dark:bg-slate-800">
                F4
              </kbd>{' '}
              Holds &bull;{' '}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono dark:bg-slate-800">
                F6
              </kbd>{' '}
              Discount &bull;{' '}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono dark:bg-slate-800">
                F12
              </kbd>{' '}
              Pay
            </p>
          </div>
        </div>

        {/* Top Action Buttons (Manual Add, Returns, Exchanges, Holds, Clear) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Add Button (Fallback when Barcode Scanner fails) */}
          <button
            type="button"
            onClick={() => {
              setIsManualAddModalOpen(true);
            }}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 dark:border-brand-300 dark:bg-brand-600/80 dark:text-white dark:hover:bg-brand-600 transition-colors shadow-2xs"
            title="Search catalog by name/SKU and add directly to cart"
          >
            <PlusCircle className="h-4 w-4 text-white" />
            <span className="text-white">Add Manually</span>
          </button>

          {/* Quick Returns Action directly in POS */}
          <button
            type="button"
            onClick={() => {
              setReturnActionMode('return');
              setIsReturnModalOpen(true);
            }}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 transition-colors shadow-2xs"
            title="Start sales return workflow directly in POS"
          >
            <RotateCcw className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Return</span>
          </button>

          {/* Quick Exchange Action directly in POS */}
          <button
            type="button"
            onClick={() => {
              setReturnActionMode('exchange');
              setIsReturnModalOpen(true);
            }}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors shadow-2xs"
            title="Start item exchange workflow directly in POS"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Exchange</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void holdCurrentBill();
            }}
            disabled={items.length === 0}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
          >
            <PauseCircle className="h-4 w-4" />
            <span>Hold Bill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openHeldBillsModal();
            }}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Held Bills</span>
            {heldBills.length > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {heldBills.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              clearCart();
            }}
            disabled={items.length === 0}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-rose-950/30 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>
      </div>

      {/* Invoice Lookup / Reprint Bar (Available to cashiers, managers, admins) */}
      {can('sales.reprint') && (
        <div className="rounded-xl border border-surface-border bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void searchTransactions();
            }}
          >
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Invoice Lookup / Reprint
              </label>
              <input
                value={transactionQuery}
                onChange={(event) => {
                  setTransactionQuery(event.target.value);
                }}
                placeholder="Search completed invoice number (e.g. INV-00001)..."
                className="pos-input w-full rounded-lg border px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isTransactionSearching}
              className="min-h-11 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isTransactionSearching ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                openHistoryModal();
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <History className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>View Full History</span>
            </button>
            {transactionQuery.trim() !== '' && (
              <button
                type="button"
                onClick={() => {
                  setTransactionQuery('');
                  setTransactionResults([]);
                  setHasSearchedInvoice(false);
                }}
                className="flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </form>

          {/* Record Not Found State */}
          {hasSearchedInvoice &&
            !isTransactionSearching &&
            transactionResults.length === 0 &&
            transactionQuery.trim() !== '' && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    Record Not Found &bull; No sales invoice matching &ldquo;{transactionQuery}
                    &rdquo; was found in the database.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTransactionQuery('');
                    setTransactionResults([]);
                    setHasSearchedInvoice(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

          {/* Quick results if searched */}
          {transactionResults.length > 0 && (
            <div className="mt-3 divide-y divide-slate-100 border border-slate-100 dark:divide-slate-800 dark:border-slate-800 rounded-lg overflow-hidden">
              {transactionResults.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <span className="font-semibold">
                    {sale.invoice_number} &bull; {formatMoney(sale.total_minor)} &bull;{' '}
                    <span
                      className={`uppercase text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        sale.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      onClick={() => {
                        void (async () => {
                          const response = await window.martpos?.sales.reprint(sale.id);
                          if (response?.success) setReprintSale(response.data);
                        })();
                      }}
                    >
                      Reprint Receipt
                    </button>
                    {can('sales.void') && sale.status === 'completed' && (
                      <button
                        type="button"
                        className="font-semibold text-rose-600 hover:underline dark:text-rose-400"
                        onClick={() => {
                          void handleVoidSale(sale);
                        }}
                      >
                        Void
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Workspace (Split Grid) */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden">
        {/* Left Side: Scanner & Product Catalog (5 cols on lg, 6 cols on xl/2xl for balanced spaciousness) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-6 flex flex-col gap-3 overflow-hidden rounded-2xl border border-surface-border bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Scanner Input Bar */}
          <div className="flex-shrink-0">
            <form
              onSubmit={(e) => {
                void handleScannerSubmit(e);
              }}
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Barcode Scanner / Product Search (F2)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Barcode className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanQuery}
                  onChange={(e) => {
                    setScanQuery(e.target.value);
                  }}
                  placeholder="Scan barcode or type product name / SKU..."
                  className="pos-input w-full rounded-xl border-2 border-brand-500/50 py-2.5 pl-10 pr-10 text-sm font-medium focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <Scan className="h-4 w-4" />
                </div>
              </div>
            </form>
          </div>

          {/* Catalog Results Grid - FULLY RESPONSIVE */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {scanQuery ? 'Search Results' : 'Quick Pick Products'}
              </span>
              <div className="flex items-center gap-2">
                {isSearching && <span className="text-xs text-slate-400">Searching...</span>}
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                  Cart: {String(getItemCount())} units
                </span>
              </div>
            </div>

            {catalogProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Search className="h-8 w-8 stroke-[1.5]" />
                <p className="mt-2 text-xs">No matching products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5 sm:gap-3">
                {catalogProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex flex-col rounded-xl border border-surface-border bg-white dark:bg-slate-800/60 dark:border-slate-700 shadow-xs overflow-hidden hover:border-brand-400 dark:hover:border-brand-500 transition-all hover:shadow-sm"
                  >
                    {/* Product Header */}
                    <div className="flex items-center gap-2.5 px-3 py-2 sm:py-2.5 bg-slate-50/90 dark:bg-slate-800/90 border-b border-surface-border dark:border-slate-700/60">
                      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center font-black text-brand-700 dark:text-brand-300 text-xs sm:text-sm shadow-2xs">
                        {prod.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate leading-tight"
                          title={prod.name}
                        >
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                          <span className="truncate font-medium">{prod.category_name ?? 'General'}</span>
                          <span>&bull;</span>
                          <span className="flex-shrink-0">
                            {String(prod.variants?.length ?? 0)} variant{(prod.variants?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variants List */}
                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/40">
                      {prod.variants?.map((variant) => {
                        const reservedQuantity = items
                          .filter((item) => item.variant_id === variant.id)
                          .reduce((sum, item) => sum + item.quantity, 0);
                        const effectiveAvailableStock = Math.max(
                          0,
                          (variant.available_stock ?? 0) - reservedQuantity,
                        );
                        const stockUnits = effectiveAvailableStock / 1000;
                        const stockStatus = getStockStatus(effectiveAvailableStock);
                        const isOutOfStock = effectiveAvailableStock <= 0;

                        return (
                          <div key={variant.id} className="flex items-stretch gap-0 min-w-0">
                            {/* Main clickable area */}
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => { handleSelectVariant(prod, variant); }}
                              className={`group flex flex-1 min-w-0 items-center justify-between gap-2.5 px-3 py-2 text-left transition-all
                                ${ isOutOfStock
                                  ? 'cursor-not-allowed opacity-55'
                                  : 'cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20 active:bg-brand-100 dark:active:bg-brand-900/40'
                                }`}
                            >
                              {/* Left: name + stock */}
                              <div className="flex flex-1 min-w-0 flex-col justify-center">
                                <span
                                  className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors"
                                  title={variant.variant_name}
                                >
                                  {variant.variant_name}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium mt-0.5 leading-tight ${stockStatus.color}`}>
                                  <Package className="h-3 w-3 flex-shrink-0" />
                                  <span>{stockStatus.label}</span>
                                  {stockUnits > 0 && (
                                    <span className="font-bold">&bull; {String(stockUnits)}</span>
                                  )}
                                </span>
                              </div>

                              {/* Right: price badge */}
                              <span className={`flex-shrink-0 text-xs sm:text-[13px] font-black rounded-lg px-2.5 py-1 whitespace-nowrap shadow-2xs transition-all
                                ${ isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                                  : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 group-hover:shadow-xs'
                                }`}>
                                {formatMoney(variant.selling_price_minor)}
                              </span>
                            </button>

                            {/* Manual add button — only for out-of-stock */}
                            {isOutOfStock && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectVariant(prod, variant, true, 1000);
                                  showToast('success', `Added 1x ${prod.name} (${variant.variant_name}) to cart as manual sale`);
                                }}
                                title="Add out-of-stock item as manual sale"
                                className="flex-shrink-0 self-stretch flex items-center px-2.5 text-[10px] sm:text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-l border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:bg-amber-200 transition-colors whitespace-nowrap"
                              >
                                +Manual
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Cart & Checkout Pane (7 cols on lg, 6 cols on xl/2xl for balanced spaciousness) */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-6 flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Cart Table Header */}
          <div className="flex-shrink-0 border-b border-surface-border bg-slate-50/80 px-4 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-5">Item &amp; Variant</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-center"></span>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <ShoppingCart className="h-12 w-12 stroke-[1.2] text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Cart is Empty
                </p>
                <p className="text-xs text-slate-400">
                  Scan barcodes, pick products from left, or click &ldquo;Add Manually&rdquo;.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const lineTotal =
                  Math.round((item.quantity * item.selling_price_minor) / 1000) -
                  item.discount_minor;
                const qtyUnits = item.quantity / 1000;

                return (
                  <div
                    key={item.variant_id}
                    className="grid grid-cols-12 gap-2 items-center py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl text-xs"
                  >
                    {/* Item Details */}
                    <div className="col-span-5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </p>
                        {item.is_manual && (
                          <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Manual Sale
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-brand-600 dark:text-brand-400 truncate">
                          {item.variant_name}
                        </span>
                        {item.sku && <span>&bull; {item.sku}</span>}
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatMoney(item.selling_price_minor)}
                    </div>

                    {/* Quantity Controls */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateQuantity(item.variant_id, Math.max(0, item.quantity - 1000));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-slate-900 dark:text-white">
                        {qtyUnits}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const baseStock = item.base_available_stock ?? item.available_stock ?? 0;
                          // Manual sale items can always increase; normal items capped at baseStock
                          if (!item.is_manual && item.quantity >= baseStock) {
                            showToast(
                              'warning',
                              baseStock > 0
                                ? `Stock limit reached (${String(baseStock / 1000)} units). Click "Add Manual" on product card to add more.`
                                : `Item is out of stock. Click "Add Manual" on product card to add more.`,
                            );
                            return;
                          }
                          updateQuantity(item.variant_id, item.quantity + 1000);
                        }}
                        disabled={!item.is_manual && item.quantity >= (item.base_available_stock ?? item.available_stock ?? 0)}
                        aria-disabled={!item.is_manual && item.quantity >= (item.base_available_stock ?? item.available_stock ?? 0)}
                        title={
                          !item.is_manual && item.quantity >= (item.base_available_stock ?? item.available_stock ?? 0)
                            ? 'Stock limit reached. Click "Add Manual" on product card to add more.'
                            : 'Increase quantity'
                        }
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors ${
                          !item.is_manual && item.quantity >= (item.base_available_stock ?? item.available_stock ?? 0)
                            ? 'opacity-40 cursor-not-allowed text-slate-400'
                            : ''
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white">
                      {formatMoney(lineTotal)}
                      {item.discount_minor > 0 && (
                        <p className="text-[10px] font-normal text-rose-500">
                          -{formatMoney(item.discount_minor)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.variant_id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Bottom Summary & Checkout */}
          <div className="flex-shrink-0 border-t border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 text-xs">
              {/* Left summary details */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Total Items:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {String(getItemCount())} units
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(getSubtotalMinor())}
                  </span>
                </div>
                {billDiscountMinor > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatMoney(billDiscountMinor)}</span>
                  </div>
                )}
              </div>

              {/* Bill Discount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscountInput(!showDiscountInput);
                    }}
                    className="text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    <Percent className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">Discount (F6)</span>
                    {billDiscountMinor > 0 && (
                      <span className="ml-1 text-rose-600 dark:text-rose-400 font-bold">
                        {getDiscountDisplay()}
                      </span>
                    )}
                  </button>
                  {billDiscountMinor > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeDiscount();
                      }}
                      className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {showDiscountInput && (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-2 rounded-lg border border-brand-200 dark:border-brand-800">
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as 'percentage' | 'fixed');
                      }}
                      className="min-h-9 rounded border border-slate-300 bg-white px-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 flex-shrink-0"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">Rs.</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      value={discountValue}
                      onChange={(e) => {
                        setDiscountValue(e.target.value);
                      }}
                      placeholder={discountType === 'percentage' ? '10%' : '50.00'}
                      className="pos-input flex-1 min-w-[60px] rounded-lg border px-2 py-1.5 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        applyDiscount();
                      }}
                      className="min-h-9 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors flex-shrink-0"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiscountInput(false);
                        setDiscountValue('');
                      }}
                      className="min-h-9 rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Grand Total & Checkout Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-border pt-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Grand Total
                </span>
                <p className="text-2xl font-black text-brand-700 dark:text-brand-300">
                  {formatMoney(getTotalMinor())}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openPaymentModal();
                  }}
                  disabled={items.length === 0}
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-brand-300/40 transition-all select-none"
                >
                  <CreditCard className="h-5 w-5" />
                  <span>PAY &bull; F12</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Add Product Modal (When Barcode Scanner Fails) */}
      {isManualAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-2xl border border-surface-border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-4 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  Manual Product Catalog Add
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search by product name or SKU to pick and add items without scanning
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManualAddModalOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-surface-border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={manualSearchQuery}
                  onChange={(e) => {
                    setManualSearchQuery(e.target.value);
                  }}
                  placeholder="Type product name or SKU (e.g. Milk, Rice, OIL-001)..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {isManualSearching ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-brand-500" />
                  Searching product catalog...
                </div>
              ) : manualSearchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No products found matching &ldquo;{manualSearchQuery}&rdquo;
                </div>
              ) : (
                manualSearchResults.map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-surface-border bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          {prod.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {prod.category_name ?? 'General'} &bull;{' '}
                          {String(prod.variants?.length ?? 0)} variants
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {prod.variants?.map((v) => {
                        const reservedQuantity = items
                          .filter((item) => item.variant_id === v.id)
                          .reduce((sum, item) => sum + item.quantity, 0);
                        const effectiveAvailableStock = Math.max(0, (v.available_stock ?? 0) - reservedQuantity);
                        const stockUnits = effectiveAvailableStock / 1000;
                        const isOutOfStock = effectiveAvailableStock <= 0;
                        const selectedQty = Math.max(1, manualQuantities[v.id] ?? 1);
                        const isManualSale = isOutOfStock || selectedQty > stockUnits;

                        return (
                          <div
                            key={v.id}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-2.5 border text-xs transition-colors ${
                              isManualSale
                                ? 'bg-amber-50/60 border-amber-200 text-slate-700 dark:bg-slate-800/40 dark:border-amber-900/60'
                                : 'bg-white border-surface-border dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex-1 min-w-[140px]">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {v.variant_name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {v.sku && <span>SKU: {v.sku}</span>}
                                {isOutOfStock ? (
                                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    Out of Stock (0u)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Stock: {String(stockUnits)}u available
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className={`font-bold ${isManualSale ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`}
                            >
                              {formatMoney(v.selling_price_minor)}
                            </div>

                            {/* Qty & Add Button */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                <button
                                  type="button"
                                  disabled={selectedQty <= 1}
                                  onClick={() => {
                                    setManualQuantities({
                                      ...manualQuantities,
                                      [v.id]: Math.max(1, selectedQty - 1),
                                    });
                                  }}
                                  className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold">
                                  {selectedQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualQuantities({
                                      ...manualQuantities,
                                      [v.id]: selectedQty + 1,
                                    });
                                  }}
                                  className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                title={
                                  isManualSale
                                    ? `Add ${String(selectedQty)}x as manual sale`
                                    : `Add ${String(selectedQty)}x to cart`
                                }
                                onClick={() => {
                                  handleSelectVariant(prod, v, isManualSale, selectedQty * 1000);
                                  showToast(
                                    'success',
                                    `Added ${String(selectedQty)}x ${prod.name} (${v.variant_name}) to cart${isManualSale ? ' as manual sale' : ''}`,
                                  );
                                }}
                                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                                  isManualSale
                                    ? 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
                                    : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
                                }`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{isManualSale ? 'Add Manual' : 'Add'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-surface-border bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/50 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Items added manually will appear in the cart.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsManualAddModalOpen(false);
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Recent Invoices / History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl border border-surface-border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-4 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  Recent Invoices &amp; History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Browse and reprint recent completed sales
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="p-4 border-b border-surface-border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex-shrink-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={historySearchFilter}
                  onChange={(e) => {
                    setHistorySearchFilter(e.target.value);
                  }}
                  placeholder="Filter recent invoices by invoice number or note..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {isLoadingHistory ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-brand-500" />
                  Loading invoices...
                </div>
              ) : filteredRecentSales.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <FileText className="h-8 w-8 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600 mb-2" />
                  No completed invoices found
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 dark:divide-slate-800 dark:border-slate-700 rounded-xl overflow-hidden">
                  {filteredRecentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {sale.invoice_number}
                          </span>
                          <span
                            className={`uppercase text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              sale.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Date: {formatReceiptDateTime(sale.created_at)}
                          {sale.notes ? ` &bull; Note: ${sale.notes}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {formatMoney(sale.total_minor)}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              const response = await window.martpos?.sales.reprint(sale.id);
                              if (response?.success) {
                                setReprintSale(response.data);
                                setIsHistoryModalOpen(false);
                              }
                            })();
                          }}
                          className="flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition-colors"
                        >
                          Reprint
                        </button>

                        {can('sales.void') && sale.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleVoidSale(sale);
                            }}
                            className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-surface-border bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/50 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing recent {String(filteredRecentSales.length)} invoices
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(false);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isPaymentModalOpen && <PaymentModal onClose={closePaymentModal} />}
      {isHeldBillsModalOpen && <HeldBillsModal onClose={closeHeldBillsModal} />}
      {isReceiptModalOpen && completedSale && (
        <ReceiptPreview sale={completedSale} onClose={closeReceiptModal} />
      )}
      {reprintSale && (
        <ReceiptPreview
          sale={reprintSale}
          isReprint
          onClose={() => {
            setReprintSale(null);
          }}
        />
      )}
      {isReturnModalOpen && (
        <ReturnExchangeModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
          }}
          defaultWorkMode="sales"
          defaultActionMode={returnActionMode}
          onComplete={() => {
            // Refresh product catalog stock immediately
            if (window.martpos) {
              void window.martpos.products.list({ is_active: true }).then((res) => {
                if (res.success) setCatalogProducts(res.data.slice(0, 24));
              });
            }
          }}
        />
      )}
    </div>
  );
}
