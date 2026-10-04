import type { AppInfo, DBHealth, Result } from '@shared/types/app';
import type {
  CategoryRow, CreateCategoryInput, UpdateCategoryInput,
  BrandRow, CreateBrandInput, UpdateBrandInput,
  UnitRow, CreateUnitInput, UpdateUnitInput,
  ProductRow, CreateProductInput, UpdateProductInput, ProductSearchParams,
  ProductVariantRow, CreateVariantInput, UpdateVariantInput,
  BarcodeRow, AddBarcodeInput,
  PrintJobRow, CreatePrintJobInput, PrintJobSearchParams, PrintJobStatus
} from '@shared/types/catalog';
import type {
  CreateSaleInput,
  SaleRow,
  SaleSearchParams,
  HoldBillInput,
  HeldBillRow,
  PosLookupResult,
} from '@shared/types/sales';
import type {
  CreateMovementInput,
  StockMovementRow,
  StockSummaryRow,
  StockSummaryFilters,
  MovementListParams,
  InventoryKpis,
} from '@shared/types/inventory';
import type {
  SupplierRow,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierSearchParams,
  SupplierTransactionRow,
  RecordSupplierPaymentInput,
  PurchaseRow,
  CreatePurchaseInput,
  PurchaseSearchParams,
  PurchaseKpis,
} from '@shared/types/purchases';
import type {
  CustomerRow,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchParams,
  CustomerTransactionRow,
  RecordCustomerPaymentInput,
  CustomerKpis,
} from '@shared/types/customers';
import type {
  PublicUser,
  LoginInput,
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  ResetPasswordInput,
  AuditLogRow,
  AuditLogFilters,
} from '@shared/types/auth';
import type {
  ReportFilterParams,
  SalesReportData,
  PurchasesReportData,
  InventoryReportData,
  StockMovementReportData,
  SuppliersPayableReportData,
  CustomersKhataReportData,
  ProfitSummaryData,
  ExportReportInput,
  ExportResult,
} from '@shared/types/reports';
import type {
  DashboardKpiInput,
  DashboardKpis,
  DashboardSalesTrendPoint,
  DashboardTopProduct,
  DashboardPaymentBreakdown,
  DashboardLowStockItem,
  DashboardActivityItem,
  DashboardQuery,
} from '@shared/types/dashboard';
import type {
  ExpenseCategoryRow,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseRow,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseReportRow,
  ExpenseSummaryReport,
} from '@shared/types/expenses';
import type {
  CashSessionRow,
  CashMovementRow,
  OpenCashSessionInput,
  CashMovementInput,
  CloseCashSessionInput,
  CashRegisterReport,
} from '@shared/types/cash';
import type {
  CreateSalesReturnInput,
  CreatePurchaseReturnInput,
  CreateSalesExchangeInput,
  CreatePurchaseExchangeInput,
  ReturnRow,
  ExchangeRow,
} from '@shared/types/returns';

/** Public API exposed to the renderer through contextBridge. */
export interface MartposApi {
  app: {
    getInfo: () => Promise<AppInfo>;
    getDbHealth: () => Promise<DBHealth>;
  };
  dashboard: {
    getKpis: (input?: DashboardKpiInput) => Promise<Result<DashboardKpis>>;
    getTrend: (input?: DashboardQuery) => Promise<Result<DashboardSalesTrendPoint[]>>;
    getTopProducts: (input?: DashboardQuery) => Promise<Result<DashboardTopProduct[]>>;
    getPaymentBreakdown: (input?: DashboardQuery) => Promise<Result<DashboardPaymentBreakdown>>;
    getLowStock: () => Promise<Result<DashboardLowStockItem[]>>;
    getActivity: (limit?: number) => Promise<Result<DashboardActivityItem[]>>;
  };
  catalog: {
    listCategories: () => Promise<Result<CategoryRow[]>>;
    createCategory: (input: CreateCategoryInput) => Promise<Result<CategoryRow>>;
    updateCategory: (input: UpdateCategoryInput) => Promise<Result<CategoryRow>>;
    listBrands: () => Promise<Result<BrandRow[]>>;
    createBrand: (input: CreateBrandInput) => Promise<Result<BrandRow>>;
    updateBrand: (input: UpdateBrandInput) => Promise<Result<BrandRow>>;
    listUnits: () => Promise<Result<UnitRow[]>>;
    createUnit: (input: CreateUnitInput) => Promise<Result<UnitRow>>;
    updateUnit: (input: UpdateUnitInput) => Promise<Result<UnitRow>>;
  };
  products: {
    list: (params: ProductSearchParams) => Promise<Result<ProductRow[]>>;
    get: (id: number) => Promise<Result<ProductRow>>;
    create: (input: CreateProductInput) => Promise<Result<ProductRow>>;
    update: (input: UpdateProductInput) => Promise<Result<ProductRow>>;
    search: (params: ProductSearchParams) => Promise<Result<ProductRow[]>>;
  };
  productVariants: {
    list: (productId: number) => Promise<Result<ProductVariantRow[]>>;
    create: (productId: number, input: CreateVariantInput) => Promise<Result<ProductVariantRow>>;
    update: (input: UpdateVariantInput) => Promise<Result<ProductVariantRow>>;
  };
  barcodes: {
    list: (variantId: number) => Promise<Result<BarcodeRow[]>>;
    add: (input: AddBarcodeInput) => Promise<Result<BarcodeRow>>;
    deactivate: (id: number) => Promise<Result<void>>;
    generateInternal: (variantId: number) => Promise<Result<BarcodeRow>>;
    validateEAN13: (barcode: string) => Promise<Result<{ valid: boolean; barcode: string }>>;
  };
  printJobs: {
    list: (params?: PrintJobSearchParams) => Promise<Result<PrintJobRow[]>>;
    create: (input: CreatePrintJobInput) => Promise<Result<PrintJobRow>>;
    updateStatus: (id: number, status: PrintJobStatus) => Promise<Result<PrintJobRow>>;
    retry: (id: number) => Promise<Result<PrintJobRow>>;
    clearPrinted: () => Promise<Result<{ clearedCount: number }>>;
  };
  sales: {
    create: (input: CreateSaleInput) => Promise<Result<SaleRow>>;
    getById: (id: number) => Promise<Result<SaleRow>>;
    search: (params?: SaleSearchParams) => Promise<Result<SaleRow[]>>;
    reprint: (id: number) => Promise<Result<SaleRow>>;
    void: (id: number) => Promise<Result<SaleRow>>;
    listRecent: (limit?: number) => Promise<Result<SaleRow[]>>;
    lookupBarcode: (barcode: string) => Promise<Result<PosLookupResult | null>>;
    holdBill: (input: HoldBillInput) => Promise<Result<HeldBillRow>>;
    getHeldBills: () => Promise<Result<HeldBillRow[]>>;
    resumeHeldBill: (id: number) => Promise<Result<HeldBillRow>>;
    deleteHeldBill: (id: number) => Promise<Result<void>>;
  };
  inventory: {
    adjust: (input: CreateMovementInput) => Promise<Result<StockMovementRow>>;
    listMovements: (params?: MovementListParams) => Promise<Result<StockMovementRow[]>>;
    getKpis: () => Promise<Result<InventoryKpis>>;
    getLowStock: () => Promise<Result<StockSummaryRow[]>>;
    getVariantStock: (variantId: number) => Promise<Result<StockSummaryRow>>;
    listStockSummary: (filters?: StockSummaryFilters) => Promise<Result<StockSummaryRow[]>>;
  };
  suppliers: {
    list: (params?: SupplierSearchParams) => Promise<Result<SupplierRow[]>>;
    getById: (id: number) => Promise<Result<SupplierRow>>;
    create: (input: CreateSupplierInput) => Promise<Result<SupplierRow>>;
    update: (input: UpdateSupplierInput) => Promise<Result<SupplierRow>>;
    getLedger: (supplierId: number) => Promise<Result<SupplierTransactionRow[]>>;
    recordPayment: (input: RecordSupplierPaymentInput) => Promise<Result<void>>;
  };
  purchases: {
    list: (params?: PurchaseSearchParams) => Promise<Result<PurchaseRow[]>>;
    getById: (id: number) => Promise<Result<PurchaseRow>>;
    create: (input: CreatePurchaseInput) => Promise<Result<PurchaseRow>>;
    getKpis: () => Promise<Result<PurchaseKpis>>;
  };
  customers: {
    list: (params?: CustomerSearchParams) => Promise<Result<CustomerRow[]>>;
    getById: (id: number) => Promise<Result<CustomerRow>>;
    lookupPhone: (phone: string) => Promise<Result<CustomerRow | null>>;
    create: (input: CreateCustomerInput) => Promise<Result<CustomerRow>>;
    update: (input: UpdateCustomerInput) => Promise<Result<CustomerRow>>;
    getLedger: (customerId: number) => Promise<Result<CustomerTransactionRow[]>>;
    recordPayment: (input: RecordCustomerPaymentInput) => Promise<Result<void>>;
    getKpis: () => Promise<Result<CustomerKpis>>;
  };
  auth: {
    login: (input: LoginInput) => Promise<Result<PublicUser>>;
    logout: () => Promise<Result<void>>;
    getCurrentUser: () => Promise<Result<PublicUser | null>>;
    changePassword: (input: ChangePasswordInput) => Promise<Result<void>>;
  };
  users: {
    list: () => Promise<Result<PublicUser[]>>;
    getById: (id: number) => Promise<Result<PublicUser>>;
    create: (input: CreateUserInput) => Promise<Result<PublicUser>>;
    update: (input: UpdateUserInput) => Promise<Result<PublicUser>>;
    resetPassword: (input: ResetPasswordInput) => Promise<Result<void>>;
    getPermissions: (userId: number) => Promise<Result<string[]>>;
    updatePermissions: (userId: number, allowedModules: string[]) => Promise<Result<PublicUser>>;
  };
  expenses: {
    listCategories: (search?: string, is_active?: boolean) => Promise<Result<ExpenseCategoryRow[]>>;
    createCategory: (input: CreateExpenseCategoryInput) => Promise<Result<ExpenseCategoryRow>>;
    updateCategory: (input: UpdateExpenseCategoryInput) => Promise<Result<ExpenseCategoryRow>>;
    list: (filters?: ExpenseFilters) => Promise<Result<ExpenseRow[]>>;
    getById: (id: number) => Promise<Result<ExpenseRow>>;
    create: (input: CreateExpenseInput) => Promise<Result<ExpenseRow>>;
    update: (input: UpdateExpenseInput) => Promise<Result<ExpenseRow>>;
    void: (id: number) => Promise<Result<ExpenseRow>>;
    getReport: (filters?: ExpenseFilters) => Promise<Result<ExpenseReportRow[]>>;
    getSummary: (filters?: ExpenseFilters) => Promise<Result<ExpenseSummaryReport>>;
  };
  cash: {
    openSession: (input: OpenCashSessionInput) => Promise<Result<CashSessionRow>>;
    listSessions: () => Promise<Result<CashSessionRow[]>>;
    getCurrent: () => Promise<Result<CashSessionRow | null>>;
    listMovements: (sessionId: number) => Promise<Result<CashMovementRow[]>>;
    cashIn: (input: Omit<CashMovementInput, 'movement_type'>) => Promise<Result<CashMovementRow>>;
    cashOut: (input: Omit<CashMovementInput, 'movement_type'>) => Promise<Result<CashMovementRow>>;
    closeSession: (input: CloseCashSessionInput) => Promise<Result<CashSessionRow>>;
    getReport: (sessionId?: number) => Promise<Result<CashRegisterReport>>;
  };
  returns: {
    searchSales: (search: string) => Promise<Result<ReturnRow[]>>;
    searchPurchases: (search: string) => Promise<Result<ReturnRow[]>>;
    history: (search?: string, date_from?: string, date_to?: string, return_type?: 'sales' | 'purchase') => Promise<Result<ReturnRow[]>>;
    createSales: (input: CreateSalesReturnInput) => Promise<Result<ReturnRow>>;
    createPurchase: (input: CreatePurchaseReturnInput) => Promise<Result<ReturnRow>>;
    createSalesExchange: (input: CreateSalesExchangeInput) => Promise<Result<ExchangeRow>>;
    createPurchaseExchange: (input: CreatePurchaseExchangeInput) => Promise<Result<ExchangeRow>>;
    getSalesById: (id: number) => Promise<Result<ReturnRow>>;
    getPurchaseById: (id: number) => Promise<Result<ReturnRow>>;
    getSalesExchangeById: (id: number) => Promise<Result<ExchangeRow>>;
    getPurchaseExchangeById: (id: number) => Promise<Result<ExchangeRow>>;
  };
  audit: {
    list: (filters?: AuditLogFilters) => Promise<Result<AuditLogRow[]>>;
  };
  reports: {
    getSales: (filters: ReportFilterParams) => Promise<Result<SalesReportData>>;
    getPurchases: (filters: ReportFilterParams) => Promise<Result<PurchasesReportData>>;
    getInventory: (filters: ReportFilterParams) => Promise<Result<InventoryReportData>>;
    getMovements: (filters: ReportFilterParams) => Promise<Result<StockMovementReportData>>;
    getSuppliers: (filters: ReportFilterParams) => Promise<Result<SuppliersPayableReportData>>;
    getCustomers: (filters: ReportFilterParams) => Promise<Result<CustomersKhataReportData>>;
    getProfitSummary: (filters: ReportFilterParams) => Promise<Result<ProfitSummaryData>>;
    export: (input: ExportReportInput) => Promise<Result<ExportResult>>;
  };
  settings: {
    getAll: () => Promise<Result<Record<string, unknown>>>;
    get: <T = unknown>(key: string) => Promise<Result<T>>;
    set: (key: string, value: unknown) => Promise<Result<void>>;
    setMany: (settings: Record<string, unknown>) => Promise<Result<void>>;
  };
  notifications: {
    list: (filter?: import('./notifications').NotificationFilter) => Promise<Result<import('./notifications').AppNotification[]>>;
    getUnreadCount: () => Promise<Result<number>>;
    markAsRead: (id: string) => Promise<Result<void>>;
    markAllAsRead: () => Promise<Result<void>>;
    dismiss: (id: string) => Promise<Result<void>>;
    undismiss: (id: string) => Promise<Result<void>>;
  };
  licensing: {
    getStatus: () => Promise<Result<import('./licensing').LicenseStatus>>;
    getMachineCode: () => Promise<Result<string>>;
    activate: (licenseKeyOrJson: string) => Promise<Result<import('./licensing').ActivationResult>>;
    deactivate: () => Promise<Result<void>>;
  };
  backup: {
    create: (notes?: string) => Promise<Result<import('./backup').BackupMetadata>>;
    list: () => Promise<Result<import('./backup').BackupMetadata[]>>;
    getStats: () => Promise<Result<import('./backup').DatabaseStats>>;
    validate: (filePath: string) => Promise<Result<import('./backup').BackupValidationResult>>;
    restore: (filePath: string) => Promise<Result<import('./backup').RestoreResult>>;
    selectFile: () => Promise<Result<string | null>>;
    downloadDb: () => Promise<Result<string | null>>;
  };
  hardware: {
    getPrinters: () => Promise<Result<import('./hardware').PrinterDeviceInfo[]>>;
    testPrint: (options?: import('./hardware').TestPrintOptions) => Promise<Result<import('./hardware').TestPrintResult>>;
    openDrawer: (printerName?: string) => Promise<Result<{ success: boolean; message: string }>>;
  };
}

declare global {
  interface Window {
    martpos?: MartposApi;
  }
}

export {};

