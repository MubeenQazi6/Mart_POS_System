import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { MartposApi } from '@shared/types/api';

try {
  const api: MartposApi = {
    app: {
      getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_INFO),
      getDbHealth: () => ipcRenderer.invoke(IPC_CHANNELS.APP.DB_HEALTH),
    },
    dashboard: {
      getKpis: (input) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_KPIS, input),
      getTrend: (input) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_TREND, input),
      getTopProducts: (input) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_TOP_PRODUCTS, input),
      getPaymentBreakdown: (input) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_PAYMENT_BREAKDOWN, input),
      getLowStock: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_LOW_STOCK),
      getActivity: (limit) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_ACTIVITY, limit),
    },
    catalog: {
      listCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.CATEGORIES_LIST),
      createCategory: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.CATEGORY_CREATE, input),
      updateCategory: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.CATEGORY_UPDATE, input),
      listBrands: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.BRANDS_LIST),
      createBrand: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.BRAND_CREATE, input),
      updateBrand: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.BRAND_UPDATE, input),
      listUnits: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.UNITS_LIST),
      createUnit: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.UNIT_CREATE, input),
      updateUnit: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATALOG.UNIT_UPDATE, input),
    },
    products: {
      list: (params) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS.LIST, params),
      get: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS.GET, id),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS.CREATE, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS.UPDATE, input),
      search: (params) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS.SEARCH, params),
    },
    productVariants: {
      list: (productId) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_VARIANTS.LIST, productId),
      create: (productId, input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_VARIANTS.CREATE, productId, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_VARIANTS.UPDATE, input),
    },
    barcodes: {
      list: (variantId) => ipcRenderer.invoke(IPC_CHANNELS.BARCODES.LIST, variantId),
      add: (input) => ipcRenderer.invoke(IPC_CHANNELS.BARCODES.ADD, input),
      deactivate: (id) => ipcRenderer.invoke(IPC_CHANNELS.BARCODES.DEACTIVATE, id),
      generateInternal: (variantId) => ipcRenderer.invoke(IPC_CHANNELS.BARCODES.GENERATE_INTERNAL, variantId),
      validateEAN13: (barcode) => ipcRenderer.invoke(IPC_CHANNELS.BARCODES.VALIDATE_EAN13, barcode),
    },
    printJobs: {
      list: (params) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_JOBS.LIST, params),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_JOBS.CREATE, input),
      updateStatus: (id, status) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_JOBS.UPDATE_STATUS, id, status),
      retry: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_JOBS.RETRY, id),
      clearPrinted: () => ipcRenderer.invoke(IPC_CHANNELS.PRINT_JOBS.CLEAR_PRINTED),
    },
    sales: {
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES.CREATE, input),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES.GET_BY_ID, id),
      search: (params) => ipcRenderer.invoke(IPC_CHANNELS.SALES.SEARCH, params),
      reprint: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES.REPRINT, id),
      void: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES.VOID, id),
      listRecent: (limit) => ipcRenderer.invoke(IPC_CHANNELS.SALES.LIST_RECENT, limit),
      lookupBarcode: (barcode) => ipcRenderer.invoke(IPC_CHANNELS.SALES.LOOKUP_BARCODE, barcode),
      holdBill: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES.HOLD_BILL, input),
      getHeldBills: () => ipcRenderer.invoke(IPC_CHANNELS.SALES.GET_HELD_BILLS),
      resumeHeldBill: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES.RESUME_HELD_BILL, id),
      deleteHeldBill: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES.DELETE_HELD_BILL, id),
    },
    inventory: {
      adjust: (input) => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.ADJUST, input),
      listMovements: (params) => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.LIST_MOVEMENTS, params),
      getKpis: () => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.GET_KPIS),
      getLowStock: () => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.GET_LOW_STOCK),
      getVariantStock: (variantId) => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.GET_VARIANT_STOCK, variantId),
      listStockSummary: (filters) => ipcRenderer.invoke(IPC_CHANNELS.INVENTORY.LIST_STOCK_SUMMARY, filters),
    },
    suppliers: {
      list: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.LIST, params),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.GET_BY_ID, id),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.CREATE, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.UPDATE, input),
      getLedger: (supplierId) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.GET_LEDGER, supplierId),
      recordPayment: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.RECORD_PAYMENT, input),
    },
    purchases: {
      list: (params) => ipcRenderer.invoke(IPC_CHANNELS.PURCHASES.LIST, params),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.PURCHASES.GET_BY_ID, id),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PURCHASES.CREATE, input),
      getKpis: () => ipcRenderer.invoke(IPC_CHANNELS.PURCHASES.GET_KPIS),
    },
    customers: {
      list: (params) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.LIST, params),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.GET_BY_ID, id),
      lookupPhone: (phone) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.LOOKUP_PHONE, phone),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.CREATE, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.UPDATE, input),
      getLedger: (customerId) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.GET_LEDGER, customerId),
      recordPayment: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.RECORD_PAYMENT, input),
      getKpis: () => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.GET_KPIS),
    },
    auth: {
      login: (input) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGIN, input),
      logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGOUT),
      getCurrentUser: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_CURRENT_USER),
      changePassword: (input) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CHANGE_PASSWORD, input),
    },
    users: {
      list: () => ipcRenderer.invoke(IPC_CHANNELS.USERS.LIST),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.USERS.GET_BY_ID, id),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.USERS.CREATE, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.USERS.UPDATE, input),
      resetPassword: (input) => ipcRenderer.invoke(IPC_CHANNELS.USERS.RESET_PASSWORD, input),
      getPermissions: (userId) => ipcRenderer.invoke(IPC_CHANNELS.USERS.GET_PERMISSIONS, userId),
      updatePermissions: (userId, allowedModules) => ipcRenderer.invoke(IPC_CHANNELS.USERS.UPDATE_PERMISSIONS, userId, allowedModules),
    },
    expenses: {
      listCategories: (search, is_active) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES.LIST, search, is_active),
      createCategory: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES.CREATE, input),
      updateCategory: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES.UPDATE, input),
      list: (filters) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.LIST, filters),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.GET_BY_ID, id),
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.CREATE, input),
      update: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.UPDATE, input),
      void: (id) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.VOID, id),
      getReport: (filters) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.GET_REPORT, filters),
      getSummary: (filters) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES.GET_SUMMARY, filters),
    },
    cash: {
      openSession: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH.OPEN_SESSION, input),
      listSessions: () => ipcRenderer.invoke(IPC_CHANNELS.CASH.LIST_SESSIONS),
      getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.CASH.GET_CURRENT),
      listMovements: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.CASH.LIST_MOVEMENTS, sessionId),
      cashIn: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH.CASH_IN, input),
      cashOut: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH.CASH_OUT, input),
      closeSession: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH.CLOSE_SESSION, input),
      getReport: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.CASH.GET_REPORT, sessionId),
    },
    returns: {
      searchSales: (search) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.SEARCH_SALES, search),
      searchPurchases: (search) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.SEARCH_PURCHASES, search),
      history: (search, date_from, date_to, return_type) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.HISTORY, search, date_from, date_to, return_type),
      createSales: (input) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.CREATE_SALES, input),
      createPurchase: (input) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.CREATE_PURCHASE, input),
      createSalesExchange: (input) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.CREATE_SALES_EXCHANGE, input),
      createPurchaseExchange: (input) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.CREATE_PURCHASE_EXCHANGE, input),
      getSalesById: (id) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.GET_SALES_BY_ID, id),
      getPurchaseById: (id) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.GET_PURCHASE_BY_ID, id),
      getSalesExchangeById: (id) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.GET_SALES_EXCHANGE_BY_ID, id),
      getPurchaseExchangeById: (id) => ipcRenderer.invoke(IPC_CHANNELS.RETURNS.GET_PURCHASE_EXCHANGE_BY_ID, id),
    },
    audit: {
      list: (filters) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT.LIST, filters),
    },
    reports: {
      getSales: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_SALES, filters),
      getPurchases: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_PURCHASES, filters),
      getInventory: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_INVENTORY, filters),
      getMovements: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_MOVEMENTS, filters),
      getSuppliers: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_SUPPLIERS, filters),
      getCustomers: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_CUSTOMERS, filters),
      getProfitSummary: (filters) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.GET_PROFIT_SUMMARY, filters),
      export: (input) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS.EXPORT, input),
    },
    settings: {
      getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_ALL),
      get: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),
      set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, key, value),
      setMany: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET_MANY, settings),
    },
    notifications: {
      list: (filter) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.LIST, filter),
      getUnreadCount: () => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.GET_UNREAD_COUNT),
      markAsRead: (id) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.MARK_AS_READ, id),
      markAllAsRead: () => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.MARK_ALL_AS_READ),
      dismiss: (id) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.DISMISS, id),
      undismiss: (id) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATIONS.UNDISMISS, id),
    },
    licensing: {
      getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSING.GET_STATUS),
      getMachineCode: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSING.GET_MACHINE_CODE),
      activate: (keyOrJson) => ipcRenderer.invoke(IPC_CHANNELS.LICENSING.ACTIVATE, keyOrJson),
      deactivate: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSING.DEACTIVATE),
    },
    backup: {
      create: (notes) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.CREATE, notes),
      list: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.LIST),
      getStats: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.GET_STATS),
      validate: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.VALIDATE, filePath),
      restore: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.RESTORE, filePath),
      selectFile: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.SELECT_FILE),
      downloadDb: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP.DOWNLOAD_DB),
    },
    hardware: {
      getPrinters: () => ipcRenderer.invoke(IPC_CHANNELS.HARDWARE.GET_PRINTERS),
      testPrint: (options) => ipcRenderer.invoke(IPC_CHANNELS.HARDWARE.TEST_PRINT, options),
      openDrawer: (printerName) => ipcRenderer.invoke(IPC_CHANNELS.HARDWARE.OPEN_DRAWER, printerName),
    },
  };

  contextBridge.exposeInMainWorld('martpos', api);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[preload] contextBridge exposed window.martpos');
  }
} catch (error) {
  console.error('[preload] Failed to expose secure API:', error);
  throw error;
}
