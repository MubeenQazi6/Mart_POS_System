import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useInventoryStore } from '@renderer/stores/inventoryStore';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { formatQuantityFromThousandths } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import type { StockSummaryRow } from '@shared/types/inventory';
import type { BadgeVariant } from '@renderer/components/ui/Badge';
import { AdjustStockModal } from './AdjustStockModal';
import { MovementHistoryModal } from './MovementHistoryModal';
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  AlertTriangle,
  Boxes,
  ClipboardList,
  Plus,
  Undo2,
  Repeat,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  AlertCircle,
  Calendar,
  Package,
} from 'lucide-react';
import { showToast } from '@renderer/components/ui/Toast';

function stockStatusBadge(status: StockSummaryRow['stock_status']): {
  variant: BadgeVariant;
  label: string;
} {
  switch (status) {
    case 'in_stock':
      return { variant: 'success', label: 'In Stock' };
    case 'low_stock':
      return { variant: 'warning', label: 'Low Stock' };
    case 'out_of_stock':
      return { variant: 'danger', label: 'Out of Stock' };
  }
}

// ============================================
// RETURN MODAL COMPONENT
// ============================================
interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: StockSummaryRow | null;
  onSuccess: () => void;
}

type ReturnReason =
  'expired' | 'damaged' | 'defective' | 'wrong_item' | 'customer_return' | 'other';

const returnReasons: { value: ReturnReason; label: string }[] = [
  { value: 'expired', label: 'Expired Product' },
  { value: 'damaged', label: 'Damaged Item' },
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'other', label: 'Other Reason' },
];

function ReturnModal({
  isOpen,
  onClose,
  variant,
  onSuccess,
}: ReturnModalProps): React.JSX.Element | null {
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<ReturnReason>('other');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [returnDate, setReturnDate] = useState<string>(() => new Date().toISOString().split('T')[0] || '');

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setReason('other');
      setNotes('');
      setReturnDate(new Date().toISOString().split('T')[0] || '');
    }
  }, [isOpen]);

  if (!isOpen || !variant) return null;

  const currentStock = variant.current_stock / 1000;
  const decimals = variant.unit_decimals ?? 0;
  const maxQuantity = currentStock;

  const handleSubmit = async (): Promise<void> => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Please enter a valid quantity');
      return;
    }

    if (qty > maxQuantity) {
      showToast('error', `Cannot return more than available stock (${maxQuantity} units)`);
      return;
    }

    if (!reason) {
      showToast('error', 'Please select a return reason');
      return;
    }

    setIsLoading(true);

    try {
      if (!window.martpos) {
        showToast('error', 'MartPOS API not available');
        return;
      }

      const response = await window.martpos.inventory.adjust({
        variant_id: variant.variant_id,
        quantity: Math.round(qty * 1000),
        note: `RETURN: ${reason}${notes ? ` - ${notes}` : ''} | Date: ${returnDate}`,
        source: 'return',
      });

      if (response?.success) {
        showToast(
          'success',
          `Return processed: ${qty} units of ${variant.product_name} (${variant.variant_name})`,
        );
        onSuccess();
        onClose();
      } else {
        showToast('error', response?.error || 'Failed to process return');
      }
    } catch (error) {
      console.error('Return error:', error);
      showToast('error', 'Failed to process return. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getReasonColor = (reasonValue: ReturnReason): string => {
    switch (reasonValue) {
      case 'expired':
        return 'text-rose-600 dark:text-rose-400';
      case 'damaged':
        return 'text-amber-600 dark:text-amber-400';
      case 'defective':
        return 'text-orange-600 dark:text-orange-400';
      case 'wrong_item':
        return 'text-blue-600 dark:text-blue-400';
      case 'customer_return':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Return Stock</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Process returns for expiry, damage, or customer returns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Product
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {variant.product_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Variant
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {variant.variant_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">SKU</span>
              <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {variant.sku || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Current Stock
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatQuantityFromThousandths(variant.current_stock, decimals)} units
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quantity to Return *
              </label>
              <Input
                id="return-quantity"
                type="number"
                min="0.01"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Max: ${maxQuantity}`}
                rightIcon={<Package className="h-4 w-4 text-slate-400" />}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Available: {maxQuantity} units
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Return Date
              </label>
              <Input
                id="return-date"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                rightIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Return Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                {returnReasons.map((r) => (
                  <option key={r.value} value={r.value} className={getReasonColor(r.value)}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details about the return..."
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:hover:border-slate-500 min-h-[80px] resize-y"
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This will remove the returned quantity from inventory. Make sure to verify the
              physical stock before processing.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isLoading}
            className="min-h-11 rounded-lg bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4" />
                Process Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXCHANGE MODAL COMPONENT
// ============================================
interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: StockSummaryRow | null;
  onSuccess: () => void;
}

type ExchangeReason =
  'size_issue' | 'color_issue' | 'defective' | 'wrong_item' | 'customer_preference' | 'other';

const exchangeReasons: { value: ExchangeReason; label: string }[] = [
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'color_issue', label: 'Color Issue' },
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'customer_preference', label: 'Customer Preference' },
  { value: 'other', label: 'Other Reason' },
];

interface ProductVariant {
  id: number;
  variant_name: string;
  sku: string;
  selling_price_minor: number;
}

interface Product {
  id: number;
  name: string;
  variants?: ProductVariant[];
}

interface SelectedExchangeProduct {
  product_id: number;
  product_name: string;
  variant_id: number;
  variant_name: string;
  sku: string;
  price: number;
}

function ExchangeModal({
  isOpen,
  onClose,
  variant,
  onSuccess,
}: ExchangeModalProps): React.JSX.Element | null {
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<ExchangeReason>('other');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeDate, setExchangeDate] = useState<string>(
    new Date().toISOString().split('T')[0] as string,
  );
  const [exchangeProductSearch, setExchangeProductSearch] = useState<string>('');
  const [exchangeProducts, setExchangeProducts] = useState<Product[]>([]);
  const [selectedExchangeProduct, setSelectedExchangeProduct] =
    useState<SelectedExchangeProduct | null>(null);
  const [isSearchingExchange, setIsSearchingExchange] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setReason('other');
      setNotes('');
      setExchangeDate(new Date().toISOString().split('T')[0] as string);
      setExchangeProductSearch('');
      setSelectedExchangeProduct(null);
      setExchangeProducts([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!exchangeProductSearch.trim() || !isOpen) {
      setExchangeProducts([]);
      return;
    }

    const searchProducts = async (): Promise<void> => {
      if (!window.martpos) return;
      setIsSearchingExchange(true);
      try {
        const response = await window.martpos.products.search({
          search: exchangeProductSearch.trim(),
          is_active: true,
        });
        if (response.success) {
          setExchangeProducts(response.data as Product[]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearchingExchange(false);
      }
    };

    const timer = setTimeout(() => {
      void searchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [exchangeProductSearch, isOpen]);

  if (!isOpen || !variant) return null;

  const currentStock = variant.current_stock / 1000;
  const decimals = variant.unit_decimals ?? 0;
  const maxQuantity = currentStock;

  const handleSubmit = async (): Promise<void> => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Please enter a valid quantity');
      return;
    }

    if (qty > maxQuantity) {
      showToast('error', `Cannot exchange more than available stock (${maxQuantity} units)`);
      return;
    }

    if (!reason) {
      showToast('error', 'Please select an exchange reason');
      return;
    }

    if (!selectedExchangeProduct) {
      showToast('error', 'Please select a product to exchange with');
      return;
    }

    setIsLoading(true);

    try {
      if (!window.martpos) {
        showToast('error', 'MartPOS API not available');
        return;
      }

      const removeResponse = await window.martpos.inventory.adjust({
        variant_id: variant.variant_id,
        quantity: Math.round(qty * 1000),
        note: `EXCHANGE OUT: ${reason}${notes ? ` - ${notes}` : ''} | Date: ${exchangeDate} | To: ${selectedExchangeProduct.product_name}`,
        source: 'exchange_out',
      });

      if (!removeResponse?.success) {
        showToast('error', removeResponse?.error || 'Failed to remove stock for exchange');
        return;
      }

      const addResponse = await window.martpos.inventory.adjust({
        variant_id: selectedExchangeProduct.variant_id,
        quantity: Math.round(qty * 1000),
        note: `EXCHANGE IN: ${reason}${notes ? ` - ${notes}` : ''} | Date: ${exchangeDate} | From: ${variant.product_name}`,
        source: 'exchange_in',
      });

      if (addResponse?.success) {
        showToast(
          'success',
          `Exchange processed: ${qty} units from ${variant.product_name} to ${selectedExchangeProduct.product_name}`,
        );
        onSuccess();
        onClose();
      } else {
        showToast('error', addResponse?.error || 'Failed to add stock for exchange');
      }
    } catch (error) {
      console.error('Exchange error:', error);
      showToast('error', 'Failed to process exchange. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExchangeProduct = (product: Product): void => {
    if (product.variants && product.variants.length > 0 && product.variants[0]) {
      const firstVariant = product.variants[0];
      setSelectedExchangeProduct({
        product_id: product.id,
        product_name: product.name,
        variant_id: firstVariant.id,
        variant_name: firstVariant.variant_name,
        sku: firstVariant.sku,
        price: firstVariant.selling_price_minor,
      });
      setExchangeProductSearch(product.name);
      setExchangeProducts([]);
    }
  };

  const getReasonColor = (reasonValue: ExchangeReason): string => {
    switch (reasonValue) {
      case 'size_issue':
        return 'text-blue-600 dark:text-blue-400';
      case 'color_issue':
        return 'text-purple-600 dark:text-purple-400';
      case 'defective':
        return 'text-orange-600 dark:text-orange-400';
      case 'wrong_item':
        return 'text-amber-600 dark:text-amber-400';
      case 'customer_preference':
        return 'text-emerald-600 dark:text-emerald-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Exchange Stock</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exchange with another product variant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Current Product
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {variant.product_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Variant
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {variant.variant_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Available Stock
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatQuantityFromThousandths(variant.current_stock, decimals)} units
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Search Exchange Product *
              </label>
              <div className="relative">
                <Input
                  id="exchange-product-search"
                  value={exchangeProductSearch}
                  onChange={(e) => setExchangeProductSearch(e.target.value)}
                  placeholder="Search product to exchange with..."
                  leftIcon={<Search className="h-4 w-4" />}
                />
                {isSearchingExchange && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                  </div>
                )}
              </div>
              {exchangeProducts.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {exchangeProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectExchangeProduct(product)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.variants?.length || 0} variants available
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedExchangeProduct && (
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    Exchange With
                  </span>
                  <button
                    onClick={() => {
                      setSelectedExchangeProduct(null);
                      setExchangeProductSearch('');
                    }}
                    className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    Change
                  </button>
                </div>
                <div className="mt-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {selectedExchangeProduct.product_name}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {selectedExchangeProduct.variant_name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    SKU: {selectedExchangeProduct.sku || '—'} • Price:{' '}
                    {formatMoney(selectedExchangeProduct.price)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quantity to Exchange *
              </label>
              <Input
                id="exchange-quantity"
                type="number"
                min="0.01"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Max: ${maxQuantity}`}
                rightIcon={<Package className="h-4 w-4 text-slate-400" />}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Available: {maxQuantity} units
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Exchange Date
              </label>
              <Input
                id="exchange-date"
                type="date"
                value={exchangeDate}
                onChange={(e) => setExchangeDate(e.target.value)}
                rightIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Exchange Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ExchangeReason)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                {exchangeReasons.map((r) => (
                  <option key={r.value} value={r.value} className={getReasonColor(r.value)}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details about the exchange..."
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:hover:border-slate-500 min-h-[80px] resize-y"
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 flex items-start gap-2">
            <Repeat className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700 dark:text-purple-300">
              This will deduct stock from the current product and add stock to the selected exchange
              product.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isLoading || !selectedExchangeProduct}
            className="min-h-11 rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Repeat className="h-4 w-4" />
                Process Exchange
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export function StockLevelsPage(): React.JSX.Element {
  const {
    stockSummary,
    isLoadingStockSummary,
    filters,
    setFilters,
    resetFilters,
    loadStockSummary,
    loadKpis,
    kpis,
  } = useInventoryStore();

  const { categories, loadCategories } = useCatalogStore();

  const [selectedVariant, setSelectedVariant] = useState<StockSummaryRow | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    void loadStockSummary();
    void loadKpis();
    void loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput || undefined });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, setFilters]);

  const handleRefresh = useCallback(() => {
    void loadStockSummary();
    void loadKpis();
  }, [loadStockSummary, loadKpis]);

  const handleOpenAdjust = (variant: StockSummaryRow): void => {
    setSelectedVariant(variant);
    setIsAdjustOpen(true);
  };

  const handleOpenHistory = (variant: StockSummaryRow): void => {
    setSelectedVariant(variant);
    setIsHistoryOpen(true);
  };

  const handleOpenReturn = (variant: StockSummaryRow): void => {
    setSelectedVariant(variant);
    setIsReturnOpen(true);
  };

  const handleOpenExchange = (variant: StockSummaryRow): void => {
    setSelectedVariant(variant);
    setIsExchangeOpen(true);
  };

  const handleAdjustClose = (): void => {
    setIsAdjustOpen(false);
    setSelectedVariant(null);
  };

  const handleHistoryClose = (): void => {
    setIsHistoryOpen(false);
    setSelectedVariant(null);
  };

  const handleReturnClose = (): void => {
    setIsReturnOpen(false);
    setSelectedVariant(null);
  };

  const handleExchangeClose = (): void => {
    setIsExchangeOpen(false);
    setSelectedVariant(null);
  };

  const lowStockCount = kpis?.low_stock_count ?? 0;
  const inventoryValue = kpis?.inventory_value_minor ?? 0;
  const totalCostValue = kpis?.total_cost_minor ?? 0;
  const potentialProfit = kpis?.potential_profit_minor ?? 0;

  const profitMargin = totalCostValue > 0 ? (potentialProfit / totalCostValue) * 100 : 0;

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Inventory Management"
        description="Stock levels, movement history, and adjustments — calculated from the stock ledger."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate dark:text-slate-400">
              Low Stock Items
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {String(lowStockCount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate dark:text-slate-400">
              Inventory Value
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {formatMoney(inventoryValue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 flex-shrink-0 dark:bg-blue-900/30 dark:text-blue-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate dark:text-slate-400">
              Total Cost
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {formatMoney(totalCostValue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
              potentialProfit >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {potentialProfit >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate dark:text-slate-400">
              Potential Profit
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-xl font-bold ${
                  potentialProfit >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatMoney(potentialProfit)}
              </p>
              {totalCostValue > 0 && (
                <span
                  className={`text-xs font-semibold ${
                    profitMargin >= 0
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  ({profitMargin >= 0 ? '+' : ''}
                  {profitMargin.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1 min-w-[200px]">
          <Input
            id="inventory-search"
            label="Search"
            placeholder="Product name, SKU, or barcode…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
          />
        </div>

        <div className="w-44">
          <label className="block text-xs font-medium text-slate-700 mb-1.5 dark:text-slate-300">
            Category
          </label>
          <select
            id="inventory-category-filter"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
            value={filters.category_id !== undefined ? String(filters.category_id) : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ category_id: val ? Number(val) : undefined });
            }}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
            <input
              id="inventory-low-stock-filter"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700"
              checked={filters.low_stock_only ?? false}
              onChange={(e) => {
                setFilters({ low_stock_only: e.target.checked || undefined });
              }}
            />
            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
            Low stock only
          </label>
        </div>

        <div className="flex gap-2">
          <Button id="inventory-reset-filters" variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
          <Button
            id="inventory-refresh"
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            isLoading={isLoadingStockSummary}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        {isLoadingStockSummary ? (
          <LoadingState message="Loading stock levels…" />
        ) : stockSummary.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No Products Found"
            description={
              filters.search || filters.category_id || filters.low_stock_only
                ? 'No products match your current filters. Try adjusting the search or filters.'
                : 'No active product variants found. Add products in the Products module to get started.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-700/50 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Min. Alert
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {stockSummary.map((row) => {
                  const { variant, label } = stockStatusBadge(row.stock_status);
                  const decimals = row.unit_decimals ?? 0;
                  return (
                    <tr
                      key={row.variant_id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                        row.stock_status === 'out_of_stock'
                          ? 'bg-red-50/40 dark:bg-red-950/20'
                          : row.stock_status === 'low_stock'
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.product_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.variant_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs dark:text-slate-400">
                        {row.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs dark:text-slate-400">
                        {row.barcode ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.unit_abbreviation ?? row.unit_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatQuantityFromThousandths(row.current_stock, decimals)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {row.min_stock_alert > 0
                          ? formatQuantityFromThousandths(row.min_stock_alert, decimals)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button
                            id={`adjust-stock-${String(row.variant_id)}`}
                            variant="outline"
                            size="sm"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => {
                              handleOpenAdjust(row);
                            }}
                          >
                            Adjust
                          </Button>
                          <Button
                            id={`return-stock-${String(row.variant_id)}`}
                            variant="outline"
                            size="sm"
                            leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                            onClick={() => {
                              handleOpenReturn(row);
                            }}
                            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30"
                          >
                            Return
                          </Button>
                          <Button
                            id={`exchange-stock-${String(row.variant_id)}`}
                            variant="outline"
                            size="sm"
                            leftIcon={<Repeat className="h-3.5 w-3.5" />}
                            onClick={() => {
                              handleOpenExchange(row);
                            }}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
                          >
                            Exchange
                          </Button>
                          <Button
                            id={`view-history-${String(row.variant_id)}`}
                            variant="ghost"
                            size="sm"
                            leftIcon={<ClipboardList className="h-3.5 w-3.5" />}
                            onClick={() => {
                              handleOpenHistory(row);
                            }}
                          >
                            History
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Showing {String(stockSummary.length)} variant{stockSummary.length !== 1 ? 's' : ''}
              {filters.low_stock_only ? ' (low stock only)' : ''}
              {filters.search ? ` matching "${filters.search}"` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AdjustStockModal
        isOpen={isAdjustOpen}
        onClose={handleAdjustClose}
        variant={selectedVariant}
      />
      <MovementHistoryModal
        isOpen={isHistoryOpen}
        onClose={handleHistoryClose}
        variant={selectedVariant}
      />
      <ReturnModal
        isOpen={isReturnOpen}
        onClose={handleReturnClose}
        variant={selectedVariant}
        onSuccess={handleRefresh}
      />
      <ExchangeModal
        isOpen={isExchangeOpen}
        onClose={handleExchangeClose}
        variant={selectedVariant}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
