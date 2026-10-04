# MARTPOS — Product Requirements Document

## Overview

**MARTPOS** is a production-quality, fully offline Mart Point of Sale and Inventory Management desktop application for Windows. It is designed for a single mart, single counter, single Windows computer, and single local database — with architecture extensible to multi-counter and multi-branch scenarios in the future.

## Primary Requirement: Offline Operation

MARTPOS must work completely offline with:

- No mandatory internet connection
- No cloud dependency
- No external API dependency for core functionality
- No remote server required
- No MySQL/PostgreSQL server
- Local embedded database (SQLite)
- Local backups
- Local application data storage

The end client installs `MARTPOS-Setup.exe` and uses the application without Node.js, npm, PHP, MySQL, Python, Git, VS Code, or any development environment.

## Target Users

| Role | Primary Tasks |
|------|---------------|
| Cashier | POS billing, barcode scanning, payments, receipts |
| Store Manager | Products, inventory, purchases, reports |
| Owner/Admin | Settings, users, backups, financial oversight |

## Application Modules (Planned)

1. Dashboard
2. POS / Billing
3. Products
4. Categories
5. Brands
6. Units
7. Barcode Management
8. Barcode Label Generation
9. Inventory
10. Purchases
11. Suppliers
12. Customers
13. Customer Khata / Credit
14. Sales Returns
15. Purchase Returns
16. Expenses
17. Cash Management
18. Cashier Shifts
19. Reports
20. Users
21. Roles & Permissions
22. Audit Logs
23. Backup & Restore
24. Application Settings
25. Printer Settings

## Product Management Requirements

Products are dynamically manageable by the user. Categories are database-driven — never hard-coded.

Example category types (user-created):

- Grocery, Confectionery, Beverages, Ice Cream, Dairy, Household, Personal Care, Snacks, Bakery, and any custom category

### Product Capabilities (Future Phases)

- Add, view, search, edit, deactivate products
- Manage categories, brands, units
- Assign barcodes
- Set purchase price, selling price, minimum stock
- Manage stock with full movement history

## Custom Packaging / Internal Barcode Requirement

The mart may buy bulk products and create retail packaging with internally generated barcodes.

**Example:**

| Bulk Product | Retail Packages |
|--------------|-----------------|
| Sugar — 50 KG bag | Sugar 1 KG, Sugar 2 KG, Sugar 5 KG |

Each sellable package receives an internal barcode (e.g. `291000100001`).

**Label contents:**

- Product name
- Packaging/size
- Barcode
- Selling price

**POS workflow:**

```
Barcode Scanner → MARTPOS → Product lookup → Price → Quantity → Cart → Payment → Sale → Stock decrease → Receipt
```

## POS Requirements

The POS must be optimized for cashier speed.

### Primary Workflow

```
Barcode scan → Product found → Add to cart → Scan more → Payment → Complete sale → Stock decrease → Receipt print
```

### Future POS Features

- Barcode scanning (USB keyboard-wedge and abstracted scanner API)
- Product/SKU/name search
- Quantity modification, item removal
- Item discount, bill discount
- Cash, card, credit/khata, split payment
- Hold bill, resume held bill, cancel bill
- Reprint receipt, customer selection
- Sales return

UI must be keyboard-friendly and touch-friendly where useful.

## Inventory Requirements

Inventory is **transaction-based**. A simple `products.stock` field alone is insufficient.

Every stock-changing operation must create a **stock movement record**:

| Movement Type | Description |
|---------------|-------------|
| opening_stock | Initial stock entry |
| purchase | Stock increase from purchase |
| sale | Stock decrease from sale |
| sales_return | Stock increase from customer return |
| purchase_return | Stock decrease returning to supplier |
| damage | Stock write-off |
| expiry | Expired stock removal |
| manual_adjustment | Corrective adjustment |

Financially important operations must use database transactions — no partial sales.

## Money Handling

All monetary values use **integer minor units** (e.g. paisa for PKR). Floating-point arithmetic is prohibited for prices, discounts, totals, payments, balances, profit, and expenses.

## Security Requirements

- No direct Node.js API exposure to renderer
- Context isolation enabled
- Sandboxed renderer
- Typed, allowlisted IPC channels only
- Passwords hashed (never plain text)
- Critical financial records never permanently deleted — use cancellation, reversal, or soft deletion

## Backup Requirements (Future)

- Manual and automatic backup
- Restore with backup history
- Database, product, and sales export
- Data stored in OS user-data directory (not install directory)

## Hardware Requirements (Future)

- USB barcode scanner
- Thermal receipt printer
- Barcode label printer
- Potential cash drawer integration

Hardware access must be abstracted — business logic must not depend on printer-specific APIs.

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Offline | 100% core functionality |
| Startup | < 5 seconds on typical hardware |
| POS scan-to-cart | < 200ms product lookup |
| Data integrity | ACID transactions for financial ops |
| Installer | Single Windows `.exe`, no dev tools required |

## Out of Scope (Phase 0)

POS, inventory, products, billing, barcode generation, reports, database implementation, backup system, hardware integration, and production installer build.

## Development Phases

See [MODULES.md](./MODULES.md) for the full phased implementation plan.
