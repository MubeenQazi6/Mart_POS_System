export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export type NotificationCategory =
  | 'low_stock'
  | 'out_of_stock'
  | 'customer_credit'
  | 'supplier_payable'
  | 'cash_variance'
  | 'license'
  | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  route?: string;
  created_at: string;
  is_read: boolean;
  is_dismissed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilter {
  is_read?: boolean;
  severity?: NotificationSeverity;
  category?: NotificationCategory;
  dismissed?: boolean;
  limit?: number;
}
