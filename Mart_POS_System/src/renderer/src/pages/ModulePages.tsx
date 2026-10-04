import { useEffect, useMemo, useState } from 'react';
import { ModulePlaceholder } from '@renderer/components/shell/ModulePlaceholder';
import { ProductList } from '@renderer/features/products/ProductList';
import { StockLevelsPage } from '@renderer/features/inventory/StockLevelsPage';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
export { ReturnsPage } from '@renderer/features/returns/ReturnsPage';
import type { ExpenseCategoryRow, ExpenseRow } from '@shared/types/expenses';
import type { CashSessionRow, CashMovementRow } from '@shared/types/cash';
import { formatMoney, toMinorUnits } from '@shared/utils/money';
import { showToast } from '@renderer/components/ui/Toast';
import {
  Receipt,
  Wallet,
  HelpCircle,
  Plus,
  Search,
  Tag,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Printer,
} from 'lucide-react';

export { PosPage } from '@renderer/features/pos/PosPage';

export function ProductsPage(): React.JSX.Element {
  return (
    <div className="">
      <PageHeader
        title="Products & Catalog"
        description="Manage retail products, sellable variants, pricing, and barcode mappings."
      />
      <ProductList />
    </div>
  );
}

export function InventoryPage(): React.JSX.Element {
  return <StockLevelsPage />;
}

export { PurchasesPage } from '@renderer/features/purchases/PurchasesPage';
export { SuppliersPage } from '@renderer/features/suppliers/SuppliersPage';
export { CustomersPage } from '@renderer/features/customers/CustomersPage';

export function ExpensesPage(): React.JSX.Element {
  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState(0);
  const [amountMinor, setAmountMinor] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryRow | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [editingExpense, setEditingExpense] = useState(false);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDescription, setEditExpenseDescription] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!window.martpos) return;
      setIsLoading(true);
      try {
        const [catRes, expRes] = await Promise.all([
          window.martpos.expenses.listCategories(search || undefined),
          window.martpos.expenses.list({
            search: search || undefined,
            category_id: categoryFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            limit: 100,
          }),
        ]);
        if (catRes.success) setCategories(catRes.data);
        if (expRes.success) setExpenses(expRes.data);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [search, categoryFilter, dateFrom, dateTo]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount_minor, 0),
    [expenses],
  );

  const createExpenseEntry = async (): Promise<void> => {
    if (
      !window.martpos ||
      categoryId <= 0 ||
      !Number.isFinite(Number(amountMinor)) ||
      Number(amountMinor) <= 0 ||
      !description.trim() ||
      !expenseDate
    ) {
      setFormMessage('Choose an active category, enter a positive amount, and add a description.');
      return;
    }
    const response = await window.martpos.expenses.create({
      category_id: categoryId,
      amount_minor: toMinorUnits(Number(amountMinor)),
      payment_method: paymentMethod,
      description,
      expense_date: expenseDate,
    });
    if (response.success) {
      setFormMessage('Expense saved.');
      setShowForm(false);
      setAmountMinor('');
      setDescription('');
      const refreshed = await window.martpos.expenses.list({
        search: search || undefined,
        limit: 10,
      });
      if (refreshed.success) setExpenses(refreshed.data);
    } else setFormMessage(response.error);
  };

  const createExpenseCategory = async (): Promise<void> => {
    if (!window.martpos || !categoryName.trim()) {
      setFormMessage('Enter a category name.');
      return;
    }
    const response = await window.martpos.expenses.createCategory({ name: categoryName.trim() });
    if (response.success) {
      setCategories((current) => [response.data, ...current]);
      setCategoryId(response.data.id);
      setCategoryName('');
      setShowCategoryForm(false);
      setFormMessage('Category created.');
    } else setFormMessage(response.error);
  };

  const saveCategory = async (): Promise<void> => {
    if (!window.martpos || !editingCategory || !categoryName.trim()) return;
    const response = await window.martpos.expenses.updateCategory({
      id: editingCategory.id,
      name: categoryName.trim(),
      is_active: editingCategory.is_active,
    });
    if (response.success) {
      setCategories((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setEditingCategory(null);
      setCategoryName('');
      setFormMessage('Category updated.');
    } else setFormMessage(response.error);
  };

  const toggleCategory = async (category: ExpenseCategoryRow): Promise<void> => {
    if (!window.martpos) return;
    const response = await window.martpos.expenses.updateCategory({
      id: category.id,
      is_active: !category.is_active,
    });
    if (response.success)
      setCategories((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
    else setFormMessage(response.error);
  };

  const updateExpenseEntry = async (): Promise<void> => {
    if (
      !window.martpos ||
      !selectedExpense ||
      !Number.isFinite(Number(editExpenseAmount)) ||
      Number(editExpenseAmount) <= 0 ||
      !editExpenseDescription.trim()
    ) {
      setFormMessage('Enter a positive amount and description.');
      return;
    }
    const response = await window.martpos.expenses.update({
      id: selectedExpense.id,
      amount_minor: toMinorUnits(Number(editExpenseAmount)),
      description: editExpenseDescription.trim(),
    });
    if (response.success) {
      setSelectedExpense(response.data);
      setEditingExpense(false);
      setExpenses((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setFormMessage('Expense updated.');
    } else setFormMessage(response.error);
  };

  const voidExpenseEntry = async (): Promise<void> => {
    if (!window.martpos || !selectedExpense) return;
    const response = await window.martpos.expenses.void(selectedExpense.id);
    if (response.success) {
      setSelectedExpense(response.data);
      setExpenses((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setFormMessage('Expense voided.');
    } else setFormMessage(response.error);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Store Expenses"
        description="Daily mart operating expenses, categorization, and expense totals."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
            <Tag className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {String(categories.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Expense Entries</span>
            <Receipt className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {String(expenses.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Amount</span>
            <DollarSign className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-brand-600 dark:text-brand-400">
            {formatMoney(totalExpenses)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-md">
            <Input
              id="expense-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Search expense number or notes"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Tag className="h-4 w-4" />}
              onClick={() => {
                setShowCategoryForm(!showCategoryForm);
              }}
            >
              Category Manager
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setShowForm(!showForm);
              }}
            >
              Add Expense
            </Button>
          </div>
        </div>

        {showCategoryForm && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <Input
              id="expense-category-name"
              label="New Expense Category"
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
              }}
              placeholder="e.g. Electricity, Maintenance"
            />
            <Button
              size="sm"
              onClick={() => {
                void createExpenseCategory();
              }}
            >
              Save Category
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCategoryForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category filter
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(Number(event.target.value));
              }}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={0}>All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="expense-date-from"
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
            }}
          />
          <Input
            id="expense-date-to"
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>{category.name}</span>
              <button
                type="button"
                className="text-brand-600 dark:text-brand-400 hover:underline font-bold text-[11px]"
                onClick={() => {
                  setEditingCategory(category);
                  setCategoryName(category.name);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px]"
                onClick={() => {
                  void toggleCategory(category);
                }}
              >
                {category.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </span>
          ))}
        </div>

        {editingCategory && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 dark:border-brand-800/60 dark:bg-brand-950/20">
            <Input
              id="edit-expense-category"
              label="Edit Category Name"
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                void saveCategory();
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingCategory(null);
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {showForm && (
          <div className="grid gap-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4 md:grid-cols-5 dark:border-brand-800/50 dark:bg-brand-950/20">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(Number(event.target.value));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value={0}>Select category</option>
                {categories
                  .filter((category) => category.is_active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>
            <Input
              id="expense-amount"
              label="Amount (Rs.) *"
              type="number"
              min="0.01"
              step="0.01"
              value={amountMinor}
              onChange={(event) => {
                setAmountMinor(event.target.value);
              }}
            />
            <Input
              id="expense-date"
              label="Date *"
              type="date"
              value={expenseDate}
              onChange={(event) => {
                setExpenseDate(event.target.value);
              }}
            />
            <Input
              id="expense-description"
              label="Description *"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment method
              </label>
              <select
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value);
                }}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-5 flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  void createExpenseEntry();
                }}
              >
                Save Expense
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {formMessage && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300" role="status">
            {formMessage}
          </p>
        )}

        {isLoading ? (
          <div className="mt-4">
            <LoadingState message="Loading expenses" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Add the first operating expense to track cash flow and business cost."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-surface-border dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="data-table-header">
                <tr>
                  <th className="px-4 py-3">Expense #</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <button
                        type="button"
                        className="text-brand-600 dark:text-brand-400 hover:underline font-mono"
                        onClick={() => {
                          setSelectedExpense(item);
                        }}
                      >
                        {item.expense_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.category_name ?? 'Uncategorized'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{item.expense_date}</td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                      {item.payment_method}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                      {formatMoney(item.amount_minor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedExpense && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4 text-xs dark:border-brand-800/60 dark:bg-brand-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {selectedExpense.expense_number}
              </strong>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedExpense.status === 'VOIDED'}
                  onClick={() => {
                    setEditingExpense(true);
                    setEditExpenseAmount(String(selectedExpense.amount_minor / 100));
                    setEditExpenseDescription(selectedExpense.description ?? '');
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedExpense.status === 'VOIDED'}
                  onClick={() => {
                    void voidExpenseEntry();
                  }}
                >
                  Void
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedExpense(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {selectedExpense.category_name ?? 'Uncategorized'} · {selectedExpense.expense_date} ·{' '}
              {selectedExpense.payment_method} · {formatMoney(selectedExpense.amount_minor)} ·{' '}
              {selectedExpense.status}
            </p>
            <p className="text-slate-500">
              {selectedExpense.description ?? 'No description'} · Created{' '}
              {new Date(selectedExpense.created_at).toLocaleString()}
            </p>
            {editingExpense && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-brand-200 pt-3 dark:border-brand-800">
                <Input
                  id="edit-expense-amount"
                  label="Amount (Rs.)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editExpenseAmount}
                  onChange={(event) => {
                    setEditExpenseAmount(event.target.value);
                  }}
                />
                <Input
                  id="edit-expense-description"
                  label="Description"
                  value={editExpenseDescription}
                  onChange={(event) => {
                    setEditExpenseDescription(event.target.value);
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    void updateExpenseEntry();
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingExpense(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CashPage(): React.JSX.Element {
  const [session, setSession] = useState<CashSessionRow | null>(null);
  const [sessionHistory, setSessionHistory] = useState<CashSessionRow[]>([]);
  const [movements, setMovements] = useState<CashMovementRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [cashAction, setCashAction] = useState<'open' | 'in' | 'out' | 'close' | null>(null);
  const [cashMessage, setCashMessage] = useState<string | null>(null);

  // Calculate cash in/out totals
  const cashStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let netCash = 0;

    movements.forEach((movement) => {
      if (movement.movement_type === 'CASH_IN') {
        totalIn += movement.amount_minor;
        netCash += movement.amount_minor;
      } else if (movement.movement_type === 'CASH_OUT') {
        totalOut += movement.amount_minor;
        netCash -= movement.amount_minor;
      }
    });

    return {
      totalIn,
      totalOut,
      netCash,
      currentBalance: session ? session.opening_cash_minor + netCash : 0,
    };
  }, [movements, session]);

  const refreshCash = async (): Promise<void> => {
    if (!window.martpos) return;
    const [currentRes, historyRes] = await Promise.all([
      window.martpos.cash.getCurrent(),
      window.martpos.cash.listSessions(),
    ]);
    if (historyRes.success) setSessionHistory(historyRes.data);
    if (currentRes.success && currentRes.data) {
      setSession(currentRes.data);
      const movementRes = await window.martpos.cash.listMovements(currentRes.data.id);
      if (movementRes.success) setMovements(movementRes.data);
    } else {
      setSession(null);
      setMovements([]);
    }
  };

  const saveCashAction = async (): Promise<void> => {
    if (
      !window.martpos ||
      !Number.isFinite(Number(cashAmount)) ||
      Number(cashAmount) < 0 ||
      (cashAction !== 'open' && Number(cashAmount) === 0)
    ) {
      setCashMessage('Enter a valid amount in rupees.');
      return;
    }
    const amount = toMinorUnits(Number(cashAmount));
    let response;
    if (cashAction === 'open')
      response = await window.martpos.cash.openSession({ opening_cash_minor: amount });
    else if (cashAction === 'in' && session)
      response = await window.martpos.cash.cashIn({
        session_id: session.id,
        amount_minor: amount,
        description: cashNote,
      });
    else if (cashAction === 'out' && session)
      response = await window.martpos.cash.cashOut({
        session_id: session.id,
        amount_minor: amount,
        description: cashNote,
      });
    else if (cashAction === 'close' && session)
      response = await window.martpos.cash.closeSession({
        session_id: session.id,
        actual_cash_minor: amount,
        notes: cashNote,
      });

    if (response?.success) {
      setCashMessage('Cash operation saved.');
      setCashAction(null);
      setCashAmount('');
      setCashNote('');
      await refreshCash();
    } else if (response) setCashMessage(response.error);
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!window.martpos) return;
      setIsLoading(true);
      try {
        const [currentRes, historyRes] = await Promise.all([
          window.martpos.cash.getCurrent(),
          window.martpos.cash.listSessions(),
        ]);
        if (historyRes.success) setSessionHistory(historyRes.data);
        if (currentRes.success && currentRes.data) {
          setSession(currentRes.data);
          const movementRes = await window.martpos.cash.listMovements(currentRes.data.id);
          if (movementRes.success) setMovements(movementRes.data);
        } else {
          setSession(null);
          setMovements([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async (): Promise<void> => {
    if (!window.martpos) return;
    setIsExporting(true);
    try {
      const summaryLines = [
        { label: 'Drawer Status', value: session ? 'Shift Open' : 'No Active Shift' },
        { label: 'Opening Float', value: formatMoney(session ? session.opening_cash_minor : 0) },
        { label: 'Cash In (Active)', value: formatMoney(cashStats.totalIn) },
        { label: 'Cash Out (Active)', value: formatMoney(cashStats.totalOut) },
        { label: 'Current Balance', value: formatMoney(cashStats.currentBalance) },
        { label: 'Net Cash Flow', value: formatMoney(cashStats.netCash) },
      ];

      const headers = [
        'Business Date',
        'Opened At',
        'Closed At',
        'Opening Float',
        'Expected Cash',
        'Actual Cash',
        'Status',
      ];

      const rows = sessionHistory.map((s) => [
        s.business_date,
        new Date(s.opened_at).toLocaleString('en-PK'),
        s.closed_at ? new Date(s.closed_at).toLocaleString('en-PK') : '—',
        formatMoney(s.opening_cash_minor),
        formatMoney(s.expected_cash_minor),
        s.actual_cash_minor !== null ? formatMoney(s.actual_cash_minor) : '—',
        s.status,
      ]);

      const res = await window.martpos.reports.export({
        report_type: 'cash_management',
        format: 'pdf',
        title: 'Cash_Management_and_Shifts',
        headers,
        rows,
        summaryLines,
      });

      if (res.success && !res.data.canceled) {
        showToast('success', `Cash & Shifts PDF exported to ${res.data.filePath ?? 'file'}`);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 cash-print-surface">
      <PageHeader
        title="Cash Management & Shifts"
        description="Cash drawer opening, shift cash movements, and reconciliation."
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={isExporting}
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => {
              void handleExportPdf();
            }}
          >
            {isExporting ? 'Generating PDF...' : 'Print / Export PDF'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Drawer Status</span>
            <Wallet className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={session ? 'success' : 'neutral'} className="text-xs">
              {session ? 'Shift Open' : 'No Active Shift'}
            </Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Opening Float</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {session ? formatMoney(session.opening_cash_minor) : formatMoney(0)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Cash In</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatMoney(cashStats.totalIn)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Out</span>
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatMoney(cashStats.totalOut)}
          </p>
        </div>
      </div>

      {/* Additional stats row for current balance and net cash */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Current Balance</span>
            <DollarSign className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-brand-600 dark:text-brand-400">
            {formatMoney(cashStats.currentBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Opening: {session ? formatMoney(session.opening_cash_minor) : formatMoney(0)} + Net
            Cash: {formatMoney(cashStats.netCash)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Net Cash Flow</span>
            {cashStats.netCash >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
            )}
          </div>
          <p
            className={`mt-3 text-2xl font-black ${cashStats.netCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {formatMoney(cashStats.netCash)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <Calendar className="h-4 w-4 text-brand-600" />
            <span>Active Shift Cash Movements</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setCashAction(session ? 'in' : 'open');
              }}
            >
              {session ? 'Cash In' : 'Open Shift Float'}
            </Button>
            {session && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCashAction('out');
                  }}
                >
                  Cash Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCashAction('close');
                  }}
                >
                  Close Shift
                </Button>
              </>
            )}
          </div>
        </div>

        {cashAction && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-800/60 dark:bg-brand-950/20">
            <Input
              id="cash-amount"
              label={cashAction === 'close' ? 'Counted Closing Cash (Rs.) *' : 'Amount (Rs.) *'}
              type="number"
              min="0"
              step="0.01"
              value={cashAmount}
              onChange={(event) => {
                setCashAmount(event.target.value);
              }}
            />
            <Input
              id="cash-note"
              label="Reason / Shift Notes"
              value={cashNote}
              onChange={(event) => {
                setCashNote(event.target.value);
              }}
              placeholder="e.g. Petty cash, daily closing count"
            />
            <Button
              size="sm"
              onClick={() => {
                void saveCashAction();
              }}
            >
              Save Operation
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCashAction(null);
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {cashMessage && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300" role="status">
            {cashMessage}
          </p>
        )}

        {isLoading ? (
          <div className="py-4">
            <LoadingState message="Loading cash ledger" />
          </div>
        ) : movements.length === 0 ? (
          <div className="py-4">
            <EmptyState
              icon={Wallet}
              title="No cash movements recorded"
              description="Open a cash session and record drawer activity to track shift cash balance."
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="data-table-header">
                <tr>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {entry.movement_type}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {entry.description ?? 'Cash movement'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                      {formatMoney(entry.amount_minor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Past Shift Sessions History
        </h2>
        {sessionHistory.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            No historical cash sessions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="data-table-header">
                <tr>
                  <th className="px-4 py-3">Business date</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessionHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold font-mono text-slate-900 dark:text-white">
                      {item.business_date}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(item.opened_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {item.closed_at ? new Date(item.closed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(item.opening_cash_minor)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(item.expected_cash_minor)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {item.actual_cash_minor === null ? '—' : formatMoney(item.actual_cash_minor)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === 'OPEN' ? 'success' : 'neutral'}>
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export { ReportsPage } from '@renderer/features/reports/ReportsPage';
export { BarcodeLabelsPage } from '@renderer/features/barcodes/BarcodeLabelsPage';
export { UsersPage } from '@renderer/features/users/UsersPage';
export { AuditLogsPage } from '@renderer/features/audit/AuditLogsPage';
export { SettingsPage } from '@renderer/features/settings/SettingsPage';
export { NotificationsPage } from '@renderer/features/notifications/NotificationsPage';

export function NotFoundPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      title="Page Not Found"
      description="The requested page route does not exist."
      phase={1}
      icon={HelpCircle}
      plannedFeatures={['Please navigate using the sidebar menu on the left.']}
    />
  );
}
