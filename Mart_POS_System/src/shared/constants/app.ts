import type { NavSection } from '@shared/types/app';

export const APP_NAME = 'Kings Mart';
export const APP_TAGLINE = 'Offline Mart POS & Inventory Management';

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        phase: 1,
        iconName: 'LayoutDashboard',
        description: 'System metrics and quick overview',
      },
      {
        id: 'pos',
        label: 'POS / Billing',
        path: '/pos',
        phase: 5,
        iconName: 'ShoppingCart',
        description: 'High-speed cashier checkout and billing',
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        id: 'products',
        label: 'Products',
        path: '/products',
        phase: 3,
        iconName: 'Package',
        description: 'Product catalog, pricing, and categories',
      },
      {
        id: 'inventory',
        label: 'Inventory',
        path: '/inventory',
        phase: 7,
        iconName: 'Boxes',
        description: 'Stock tracking and movement ledger',
      },
      {
        id: 'purchases',
        label: 'Purchases',
        path: '/purchases',
        phase: 8,
        iconName: 'Truck',
        description: 'Stock intake and supplier purchase orders',
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        path: '/suppliers',
        phase: 8,
        iconName: 'Building2',
        description: 'Supplier directory and payables',
      },
    ],
  },
  {
    title: 'Customers',
    items: [
      {
        id: 'customers',
        label: 'Customers / Khata',
        path: '/customers',
        phase: 9,
        iconName: 'Users',
        description: 'Customer directory and Khata / credit ledger',
      },
      {
        id: 'returns',
        label: 'Returns',
        path: '/returns',
        phase: 10,
        iconName: 'RotateCcw',
        description: 'Sales and purchase returns management',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        id: 'expenses',
        label: 'Expenses',
        path: '/expenses',
        phase: 11,
        iconName: 'Receipt',
        description: 'Store operating expenses tracking',
      },
      {
        id: 'cash',
        label: 'Cash Management',
        path: '/cash',
        phase: 11,
        iconName: 'Wallet',
        description: 'Cash drawer shifts and reconciliation',
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        phase: 12,
        iconName: 'BarChart3',
        description: 'Sales analytics, profit, and stock valuation',
      },
    ],
  },
  {
    title: 'Tools',
    items: [
      {
        id: 'barcode-labels',
        label: 'Barcode Labels',
        path: '/barcode-labels',
        phase: 4,
        iconName: 'Barcode',
        description: 'Internal barcode generation and label printing',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        phase: 14,
        iconName: 'Bell',
        description: 'System condition warnings and stock alerts',
      },
      {
        id: 'users',
        label: 'Users & Roles',
        path: '/users',
        phase: 13,
        iconName: 'ShieldCheck',
        description: 'Staff accounts and permission management',
      },
      {
        id: 'audit-logs',
        label: 'Audit Trail',
        path: '/audit-logs',
        phase: 14,
        iconName: 'Activity',
        description: 'Security events, logins, and operational trail',
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        phase: 3,
        iconName: 'Settings',
        description: 'Store profile, thermal receipt, backup, and hardware settings',
      },
    ],
  },
];

/** Flat list of all navigation items */
export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/** Legacy alias for backward compatibility */
export const APP_MODULES = ALL_NAV_ITEMS;
