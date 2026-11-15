import React, { useState, useEffect, useMemo } from 'react';
import { usePosStore } from '@renderer/stores/posStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { formatMoney, fromMinorUnits, toMinorUnits } from '@shared/utils/money';
import {
  X,
  CreditCard,
  Banknote,
  Split,
  ArrowRight,
  Loader2,
  BookOpen,
  Search,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import type { PaymentInput } from '@shared/types/sales';
import type { CustomerRow } from '@shared/types/customers';
import { showToast } from '@renderer/components/ui/Toast';

interface PaymentModalProps {
  onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps): React.JSX.Element {
  const { getTotalMinor, completeSale, isProcessingSale } = usePosStore();
  const { settings } = useSettingsStore();
  const totalMinor = getTotalMinor();

  const defaultMethod = settings['pos.default_payment_method'] || 'cash';
  const initialMode = defaultMethod === 'khata' ? 'credit' : defaultMethod;
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'credit' | 'split'>(
    initialMode as any,
  );
  const [cashTenderedInput, setCashTenderedInput] = useState<string>(
    fromMinorUnits(totalMinor).toString(),
  );
  const [cardAmountInput, setCardAmountInput] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Customer selection for Khata (Credit) payments
  const [customersList, setCustomersList] = useState<CustomerRow[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Fetch registered active customers when needed
  useEffect(() => {
    if (!window.martpos) return;
    setIsLoadingCustomers(true);
    window.martpos.customers
      .list({ is_active: true })
      .then((res) => {
        if (res.success) {
          setCustomersList(res.data);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load customers for POS checkout:', err);
      })
      .finally(() => {
        setIsLoadingCustomers(false);
      });
  }, []);

  // Filter customers based on search query (name or phone)
  const filteredCustomers = useMemo(() => {
    const query = customerSearchQuery.trim().toLowerCase();
    if (!query) return customersList.slice(0, 8);
    return customersList
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)),
      )
      .slice(0, 10);
  }, [customersList, customerSearchQuery]);

  // When payment mode changes, reset defaults
  useEffect(() => {
    setValidationError(null);
    if (paymentMode === 'cash') {
      setCashTenderedInput(fromMinorUnits(totalMinor).toString());
      setCardAmountInput('0');
    } else if (paymentMode === 'card') {
      setCardAmountInput(fromMinorUnits(totalMinor).toString());
      setCashTenderedInput('0');
    } else if (paymentMode === 'credit') {
      setCashTenderedInput('0');
      setCardAmountInput('0');
    } else {
      const half = Math.round(totalMinor / 2);
      setCashTenderedInput(fromMinorUnits(half).toString());
      setCardAmountInput(fromMinorUnits(totalMinor - half).toString());
    }
  }, [paymentMode, totalMinor]);

  const parsedCashTenderedMinor = toMinorUnits(parseFloat(cashTenderedInput) || 0);
  const parsedCardAmountMinor = toMinorUnits(parseFloat(cardAmountInput) || 0);

  // Change due calculation for cash payments
  const changeDueMinor =
    paymentMode === 'cash' ? Math.max(0, parsedCashTenderedMinor - totalMinor) : 0;

  const handleQuickAdd = (addRupees: number): void => {
    const current = parseFloat(cashTenderedInput) || 0;
    setCashTenderedInput((current + addRupees).toString());
  };

  const handleExactCash = (): void => {
    setCashTenderedInput(fromMinorUnits(totalMinor).toString());
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setValidationError(null);

    const payments: PaymentInput[] = [];
    let customerIdToPass: number | undefined = undefined;

    if (paymentMode === 'cash') {
      if (parsedCashTenderedMinor < totalMinor) {
        setValidationError(`Tendered cash is less than total due (${formatMoney(totalMinor)})`);
        return;
      }
      payments.push({
        payment_method: 'cash',
        amount_minor: totalMinor,
        tendered_minor: parsedCashTenderedMinor,
      });
    } else if (paymentMode === 'card') {
      if (parsedCardAmountMinor < totalMinor) {
        setValidationError(`Card payment must equal total due (${formatMoney(totalMinor)})`);
        return;
      }
      payments.push({
        payment_method: 'card',
        amount_minor: totalMinor,
        tendered_minor: parsedCardAmountMinor,
      });
    } else if (paymentMode === 'credit') {
      if (!selectedCustomer) {
        setValidationError(
          'Please search and select a registered customer to charge to Khata account.',
        );
        return;
      }

      if (!selectedCustomer.is_active) {
        setValidationError(`Customer "${selectedCustomer.name}" is deactivated.`);
        return;
      }

      // Check credit limit if configured (> 0)
      if (
        selectedCustomer.credit_limit_minor > 0 &&
        selectedCustomer.current_balance_minor + totalMinor > selectedCustomer.credit_limit_minor
      ) {
        setValidationError(
          `Credit limit exceeded for "${selectedCustomer.name}". Current balance: ${formatMoney(
            selectedCustomer.current_balance_minor,
          )}, Sale total: ${formatMoney(totalMinor)}, Limit: ${formatMoney(
            selectedCustomer.credit_limit_minor,
          )}`,
        );
        return;
      }

      payments.push({
        payment_method: 'credit',
        amount_minor: totalMinor,
        tendered_minor: totalMinor,
      });
      customerIdToPass = selectedCustomer.id;
    } else {
      const sum = parsedCashTenderedMinor + parsedCardAmountMinor;
      if (sum < totalMinor) {
        setValidationError(
          `Split payments sum (${formatMoney(sum)}) is less than total due (${formatMoney(totalMinor)})`,
        );
        return;
      }
      const actualCardMinor = Math.min(parsedCardAmountMinor, totalMinor);
      const remainingForCash = Math.max(0, totalMinor - actualCardMinor);
      const actualCashMinor = Math.min(parsedCashTenderedMinor, remainingForCash);

      if (parsedCashTenderedMinor > 0) {
        payments.push({
          payment_method: 'cash',
          amount_minor: actualCashMinor,
          tendered_minor: parsedCashTenderedMinor,
        });
      }
      if (actualCardMinor > 0) {
        payments.push({
          payment_method: 'card',
          amount_minor: actualCardMinor,
          tendered_minor: parsedCardAmountMinor,
        });
      }
    }

    try {
      const result = await completeSale(payments, notes.trim() || undefined, customerIdToPass);
      if (result) {
        onClose();
      }
    } catch (error) {
      console.error('Sale completion error:', error);
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        showToast('error', 'Duplicate invoice number. Retrying...');
        setTimeout(() => {
          void handleSubmit(e);
        }, 500);
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete sale.';
        setValidationError(errorMsg);
        showToast('error', errorMsg);
      }
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-surface-border px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Payment &amp; Checkout
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select payment tender and complete sale
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form - Scrollable Body */}
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Total Due Banner */}
            <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-200 p-4 dark:bg-navy-700 dark:border-brand-700 flex-shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-200">
                TOTAL DUE:
              </span>
              <span className="text-2xl font-black text-brand-700 dark:text-brand-300">
                {formatMoney(totalMinor)}
              </span>
            </div>

            {/* Payment Method Selector (4 options) */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('cash');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    paymentMode === 'cash'
                      ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-300 dark:bg-brand-600/80 dark:text-white shadow-xs ring-2 ring-brand-300/40'
                      : 'border-surface-border bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="h-5 w-5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('card');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    paymentMode === 'card'
                      ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-300 dark:bg-brand-600/80 dark:text-white shadow-xs ring-2 ring-brand-300/40'
                      : 'border-surface-border bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('credit');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    paymentMode === 'credit'
                      ? 'border-amber-600 bg-amber-600 text-white dark:border-amber-300 dark:bg-amber-600/80 dark:text-white shadow-xs ring-2 ring-amber-300/40'
                      : 'border-surface-border bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Khata</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('split');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    paymentMode === 'split'
                      ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-300 dark:bg-brand-600/80 dark:text-white shadow-xs ring-2 ring-brand-300/40'
                      : 'border-surface-border bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Split className="h-5 w-5" />
                  <span>Split</span>
                </button>
              </div>
            </div>

            {/* Cash Payment Mode Inputs */}
            {paymentMode === 'cash' && (
              <div className="space-y-3 flex-shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cash Tendered (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={cashTenderedInput}
                    onChange={(e) => {
                      setCashTenderedInput(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-lg font-bold text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Quick Tender Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleExactCash();
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    Exact ({formatMoney(totalMinor)})
                  </button>
                  {[100, 500, 1000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        handleQuickAdd(val);
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      +{String(val)}
                    </button>
                  ))}
                </div>

                {/* Change Due Display */}
                <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3.5 dark:bg-slate-800/80">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Change Due:
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {formatMoney(changeDueMinor)}
                  </span>
                </div>
              </div>
            )}

            {/* Card Payment Mode */}
            {paymentMode === 'card' && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-center dark:border-brand-700 dark:bg-navy-700 flex-shrink-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Swipe or tap customer card on POS terminal for
                </p>
                <p className="text-2xl font-black text-brand-700 dark:text-brand-300 mt-1">
                  {formatMoney(totalMinor)}
                </p>
              </div>
            )}

            {/* Khata (Credit) Payment Mode */}
            {paymentMode === 'credit' && (
              <div className="space-y-3 flex-shrink-0">
                {!selectedCustomer ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Search &amp; Select Customer (Khata Account) *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                        }}
                        placeholder="Search by customer name or phone number..."
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    {/* Customer Selection List */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850">
                      {isLoadingCustomers ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-1 text-amber-500" />
                          Loading registered customers...
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No matching registered customers found. Please register customer in
                          Customers module first.
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setValidationError(null);
                            }}
                            className="flex w-full items-center justify-between p-2.5 text-left text-xs hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {cust.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                📞 {cust.phone} {cust.address ? `· ${cust.address}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                Balance:
                              </span>
                              <span
                                className={`font-bold ${
                                  cust.current_balance_minor > 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {formatMoney(cust.current_balance_minor)}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected Customer Card */
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50/70 p-4 dark:border-amber-600/70 dark:bg-amber-950/40">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {selectedCustomer.name}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            📞 {selectedCustomer.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                        }}
                        className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 transition-colors"
                      >
                        Change Customer
                      </button>
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-amber-200/80 pt-3 dark:border-amber-800/60 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          Current Khata Balance:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(selectedCustomer.current_balance_minor)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          New Balance After Sale:
                        </span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400">
                          {formatMoney(selectedCustomer.current_balance_minor + totalMinor)}
                        </span>
                      </div>
                      {selectedCustomer.credit_limit_minor > 0 && (
                        <div className="col-span-2 mt-1">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Credit Limit: {formatMoney(selectedCustomer.credit_limit_minor)}
                          </span>
                          {selectedCustomer.current_balance_minor + totalMinor >
                            selectedCustomer.credit_limit_minor && (
                            <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              This sale will exceed the customer&apos;s credit limit!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Split Mode */}
            {paymentMode === 'split' && (
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cash Portion (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashTenderedInput}
                    onChange={(e) => {
                      setCashTenderedInput(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card Portion (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cardAmountInput}
                    onChange={(e) => {
                      setCardAmountInput(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Order Notes */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
                placeholder="e.g., Counter pickup, staff discount, Khata remark"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Error Message */}
            {validationError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 flex-shrink-0 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Footer Actions - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-surface-border bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              disabled={isProcessingSale}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingSale}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold text-white shadow-xs focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors ${
                paymentMode === 'credit'
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 focus:ring-amber-500'
                  : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500'
              }`}
            >
              {isProcessingSale ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {paymentMode === 'credit' ? 'Charge Khata & Finalize' : 'Finalize & Print'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
