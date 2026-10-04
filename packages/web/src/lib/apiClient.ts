/**
 * API Client — Web version of window.martpos
 *
 * On Desktop: window.martpos.* → Electron IPC → SQLite
 * On Web:     apiClient.* → fetch('/api/...') → Backend → Supabase/PostgreSQL
 *
 * All stores use this adapter so they work on BOTH platforms.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('martpos_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: (err as { error?: string }).error ?? `HTTP ${res.status}` };
    }

    const data = await res.json() as T;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

// ─── App ──────────────────────────────────────────────────────────────────────
export const appApi = {
  getInfo: () => get<{ name: string; version: string; platform: string }>('/app/info'),
  dbHealth: () => get<{ healthy: boolean }>('/app/db-health'),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    post<{ user: { id: number; username: string; role: string }; token: string }>(
      '/auth/login',
      { username, password },
    ),
  logout: () => post('/auth/logout', {}),
  getCurrentUser: () => get<{ id: number; username: string; role: string } | null>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    post('/auth/change-password', { currentPassword, newPassword }),
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
export const catalogApi = {
  listCategories: () => get('/catalog/categories'),
  createCategory: (input: unknown) => post('/catalog/categories', input),
  updateCategory: (input: unknown) => put(`/catalog/categories`, input),
  listBrands: () => get('/catalog/brands'),
  createBrand: (input: unknown) => post('/catalog/brands', input),
  updateBrand: (input: unknown) => put(`/catalog/brands`, input),
  listUnits: () => get('/catalog/units'),
  createUnit: (input: unknown) => post('/catalog/units', input),
  updateUnit: (input: unknown) => put(`/catalog/units`, input),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/products${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => get(`/products/${id}`),
  create: (input: unknown) => post('/products', input),
  update: (input: unknown) => put(`/products`, input),
  delete: (id: number) => del(`/products/${id}`),
  search: (q: string) => get(`/products/search?q=${encodeURIComponent(q)}`),
};

// ─── Product Variants ─────────────────────────────────────────────────────────
export const productVariantsApi = {
  create: (productId: number, input: unknown) =>
    post(`/products/${productId}/variants`, input),
  update: (input: unknown) => put('/product-variants', input),
  delete: (variantId: number) => del(`/product-variants/${variantId}`),
};

// ─── Barcodes ─────────────────────────────────────────────────────────────────
export const barcodesApi = {
  add: (input: unknown) => post('/barcodes', input),
  deactivate: (id: number) => post(`/barcodes/${id}/deactivate`, {}),
  generateInternal: () => get('/barcodes/generate-internal'),
  validateEan13: (barcode: string) =>
    post('/barcodes/validate-ean13', { barcode }),
};

// ─── Sales / POS ──────────────────────────────────────────────────────────────
export const salesApi = {
  create: (input: unknown) => post('/sales', input),
  getById: (id: number) => get(`/sales/${id}`),
  search: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/sales${qs ? `?${qs}` : ''}`);
  },
  reprint: (id: number) => post(`/sales/${id}/reprint`, {}),
  void: (id: number, reason: string) => post(`/sales/${id}/void`, { reason }),
  listRecent: () => get('/sales/recent'),
  lookupBarcode: (barcode: string) =>
    get(`/sales/lookup-barcode?q=${encodeURIComponent(barcode)}`),
  holdBill: (input: unknown) => post('/sales/hold-bill', input),
  getHeldBills: () => get('/sales/held-bills'),
  resumeHeldBill: (id: number) => post(`/sales/held-bills/${id}/resume`, {}),
  deleteHeldBill: (id: number) => del(`/sales/held-bills/${id}`),
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  adjust: (input: unknown) => post('/inventory/adjust', input),
  listMovements: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/inventory/movements${qs ? `?${qs}` : ''}`);
  },
  getKpis: () => get('/inventory/kpis'),
  getLowStock: () => get('/inventory/low-stock'),
  getVariantStock: (variantId: number) => get(`/inventory/variant/${variantId}`),
  listStockSummary: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/inventory/stock-summary${qs ? `?${qs}` : ''}`);
  },
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: () => get('/suppliers'),
  getById: (id: number) => get(`/suppliers/${id}`),
  create: (input: unknown) => post('/suppliers', input),
  update: (input: unknown) => put('/suppliers', input),
  getLedger: (id: number) => get(`/suppliers/${id}/ledger`),
  recordPayment: (input: unknown) => post('/suppliers/payment', input),
};

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchasesApi = {
  list: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/purchases${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => get(`/purchases/${id}`),
  create: (input: unknown) => post('/purchases', input),
  getKpis: () => get('/purchases/kpis'),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/customers${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => get(`/customers/${id}`),
  lookupPhone: (phone: string) =>
    get(`/customers/lookup?phone=${encodeURIComponent(phone)}`),
  create: (input: unknown) => post('/customers', input),
  update: (input: unknown) => put('/customers', input),
  getLedger: (id: number) => get(`/customers/${id}/ledger`),
  recordPayment: (input: unknown) => post('/customers/payment', input),
  getKpis: () => get('/customers/kpis'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => get('/users'),
  getById: (id: number) => get(`/users/${id}`),
  create: (input: unknown) => post('/users', input),
  update: (input: unknown) => put('/users', input),
  resetPassword: (id: number, newPassword: string) =>
    post(`/users/${id}/reset-password`, { newPassword }),
  getPermissions: (id: number) => get(`/users/${id}/permissions`),
  updatePermissions: (input: unknown) => put('/users/permissions', input),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getKpis: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/dashboard/kpis${qs ? `?${qs}` : ''}`);
  },
  getTrend: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/dashboard/trend${qs ? `?${qs}` : ''}`);
  },
  getTopProducts: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/dashboard/top-products${qs ? `?${qs}` : ''}`);
  },
  getPaymentBreakdown: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/dashboard/payment-breakdown${qs ? `?${qs}` : ''}`);
  },
  getLowStock: () => get('/dashboard/low-stock'),
  getActivity: () => get('/dashboard/activity'),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/expenses${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => get(`/expenses/${id}`),
  create: (input: unknown) => post('/expenses', input),
  update: (input: unknown) => put('/expenses', input),
  void: (id: number) => post(`/expenses/${id}/void`, {}),
  getReport: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/expenses/report${qs ? `?${qs}` : ''}`);
  },
  getSummary: () => get('/expenses/summary'),
  listCategories: () => get('/expense-categories'),
  createCategory: (input: unknown) => post('/expense-categories', input),
  updateCategory: (input: unknown) => put('/expense-categories', input),
};

// ─── Cash ─────────────────────────────────────────────────────────────────────
export const cashApi = {
  openSession: (input: unknown) => post('/cash/sessions', input),
  listSessions: () => get('/cash/sessions'),
  getCurrent: () => get('/cash/sessions/current'),
  listMovements: () => get('/cash/movements'),
  cashIn: (input: unknown) => post('/cash/cash-in', input),
  cashOut: (input: unknown) => post('/cash/cash-out', input),
  closeSession: (input: unknown) => post('/cash/sessions/close', input),
  getReport: (sessionId: number) => get(`/cash/sessions/${sessionId}/report`),
  getShiftReport: () => get('/cash/shift-report'),
};

// ─── Returns ──────────────────────────────────────────────────────────────────
export const returnsApi = {
  searchSales: (q: string) =>
    get(`/returns/sales/search?q=${encodeURIComponent(q)}`),
  history: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/returns${qs ? `?${qs}` : ''}`);
  },
  createSales: (input: unknown) => post('/returns/sales', input),
  createPurchase: (input: unknown) => post('/returns/purchases', input),
  createSalesExchange: (input: unknown) => post('/returns/sales/exchange', input),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  getSales: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/reports/sales${qs ? `?${qs}` : ''}`);
  },
  getPurchases: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/reports/purchases${qs ? `?${qs}` : ''}`);
  },
  getInventory: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/reports/inventory${qs ? `?${qs}` : ''}`);
  },
  getProfitSummary: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/reports/profit-summary${qs ? `?${qs}` : ''}`);
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: () => get('/settings'),
  set: (key: string, value: string) => post('/settings', { key, value }),
  setMany: (entries: Record<string, string>) => post('/settings/bulk', { entries }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => get('/notifications'),
  getUnreadCount: () => get('/notifications/unread-count'),
  markAsRead: (id: number) => post(`/notifications/${id}/read`, {}),
  markAllAsRead: () => post('/notifications/read-all', {}),
  dismiss: (id: number) => post(`/notifications/${id}/dismiss`, {}),
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params: unknown) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get(`/audit${qs ? `?${qs}` : ''}`);
  },
};
