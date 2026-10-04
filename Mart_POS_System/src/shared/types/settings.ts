export interface AppSettings {
  // Store / Business Profile
  'store.name': string;
  'store.logo': string;
  'store.address': string;
  'store.phone': string;
  'store.email': string;
  'store.tax_number': string;
  'store.currency_symbol': string;
  'store.receipt_footer': string;

  // POS
  'pos.invoice_prefix': string;
  'pos.allow_negative_stock': boolean;
  'pos.default_payment_method': 'cash' | 'card' | 'khata';
  'pos.receipt_paper_size': '80mm' | '58mm' | 'A4';
  'pos.auto_print_receipt': boolean;

  // Inventory
  'inventory.low_stock_threshold': number;
  'inventory.enable_low_stock_alerts': boolean;
  'inventory.default_unit': string;

  // Returns
  'returns.policy_text': string;
  'returns.require_original_invoice': boolean;
  'returns.allow_cash_refund': boolean;

  // Security
  'security.session_timeout_minutes': number;
  'security.require_admin_discount': boolean;
  'security.require_admin_void': boolean;

  // Printing
  'printing.receipt_printer_name': string;
  'printing.label_printer_name': string;
  'printing.print_copies': number;

  // Notifications
  'notifications.enable_stock_alerts': boolean;
  'notifications.enable_cash_alerts': boolean;
  'notifications.enable_credit_alerts': boolean;
  'notifications.enable_supplier_alerts': boolean;

  // Appearance & Theme
  'theme.accent': 'emerald' | 'blue' | 'violet' | 'orange' | 'rose' | 'cyan';
  'theme.mode': 'light' | 'dark' | 'system';
}

export type SettingKey = keyof AppSettings;
export type ThemeAccent = AppSettings['theme.accent'];
export type ThemeMode = AppSettings['theme.mode'];

export interface SettingItem<K extends SettingKey = SettingKey> {
  key: K;
  value: AppSettings[K];
  updated_at?: string;
}

export type SettingsMap = Partial<AppSettings>;

export const DEFAULT_SETTINGS: AppSettings = {
  'store.name': 'Mart POS',
  'store.logo': '',
  'store.address': 'Main Commercial Area, Store #1',
  'store.phone': '+92 123 1234567',
  'store.email': 'info@martpos.com',
  'store.tax_number': 'NTN-1234567-8',
  'store.currency_symbol': 'Rs.',
  'store.receipt_footer': 'Thank you for shopping with us! Returns accepted within 7 days with original receipt.',

  'pos.invoice_prefix': 'INV',
  'pos.allow_negative_stock': true,
  'pos.default_payment_method': 'cash',
  'pos.receipt_paper_size': '80mm',
  'pos.auto_print_receipt': false,

  'inventory.low_stock_threshold': 10,
  'inventory.enable_low_stock_alerts': true,
  'inventory.default_unit': 'Piece',

  'returns.policy_text': 'Items can be returned within 7 days in original condition.',
  'returns.require_original_invoice': true,
  'returns.allow_cash_refund': true,

  'security.session_timeout_minutes': 60,
  'security.require_admin_discount': true,
  'security.require_admin_void': true,

  'printing.receipt_printer_name': '',
  'printing.label_printer_name': '',
  'printing.print_copies': 1,

  'notifications.enable_stock_alerts': true,
  'notifications.enable_cash_alerts': true,
  'notifications.enable_credit_alerts': true,
  'notifications.enable_supplier_alerts': true,

  'theme.accent': 'emerald',
  'theme.mode': 'light',
};
