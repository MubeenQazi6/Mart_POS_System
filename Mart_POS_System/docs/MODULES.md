# MARTPOS — Module Implementation Plan

## Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| 0 | Requirements and architecture | ✅ Complete |
| 1 | Project foundation | ✅ Complete |
| 2 | Database foundation | ✅ Complete |
| 3 | Product & Catalog Management | ✅ Complete |
| 4 | Barcode management and label generation | ✅ Complete |
| 5 | POS / billing | ✅ Complete |
| 6 | Inventory | ✅ Complete |
| 7 | Purchases and suppliers | ✅ Complete |
| 8 | Customers / Khata | ✅ Complete |
| 9 | Returns | ✅ Complete |
| 10 | Expenses and cash management | ✅ Complete |
| 11 | Reports | ✅ Complete |
| 12 | Users / roles / permissions | ✅ Complete |
| 13 | Audit logs | ✅ Complete |
| 14 | Backup / restore | Planned |
| 15 | Printer and hardware integration | Planned |
| 16 | Testing and hardening | Planned |
| 17 | Production build and Windows installer | Planned |

## Current Project Position — 24 August 2026

### Operational and Data-Backed Modules

The project currently has a working Electron desktop shell with React renderer, secure contextBridge preload, typed IPC, main-process repositories, SQLite/Drizzle migrations, authentication, RBAC, and audit logging.

The following business areas are implemented and connected to the application UI:

- Product catalog: categories, brands, units, products, variants, prices, SKUs, and activation state.
- Barcode management: barcode validation, internal EAN-13 generation, label preview, and print-job queue.
- POS/Billing: barcode lookup, cart, discounts, cash/card/credit payments, held bills, receipts, stock OUT movements, and invoice numbering.
- Inventory: stock movement ledger, current stock calculation, manual adjustments, damage/expiry, low-stock alerts, and valuation.
- Purchases and suppliers: purchase orders, received stock, supplier payments, supplier balances, and supplier ledger.
- Customers/Khata: customer records, credit sales, payments, balances, and customer ledger.
- Returns: customer sales returns and supplier purchase returns with quantity checks, historical prices/costs, stock reversal, cash settlement, ledger adjustments, sequential numbers, and audit events.
- Expenses: categories, duplicate protection, generated expense numbers, rupee input conversion to minor units, search, totals, and cash-expense integration.
- Cash management: session opening, opening float, Cash In, Cash Out, cash movement ledger, expected cash, session closing, variance, and session history.
- Dashboard and reports: sales, purchases, profit, expenses, inventory, payment breakdown, payables, receivables, low stock, and offline CSV/Excel/PDF export paths.
- Users and audit: local authentication, role permissions, protected IPC handlers, and audit-log viewing.

### Remaining Project Work

The following roadmap items remain outside the current operational scope:

- Direct thermal printer, cash-drawer hardware, and native USB/serial scanner integration.
- Backup, restore, automated backup scheduling, and backup validation.
- Broader automated hardening: component tests, full Playwright UI coverage, concurrency testing, and performance profiling.
- Final production branding, code signing, installer polish, and clean-machine installer verification.

### Current Verification Position

Focused isolated suites currently cover dashboard/finance and returns behavior:

```bash
npx tsx scripts/test-phase11.ts
npx tsx scripts/test-phase12.ts
npx tsx scripts/test-returns.ts
```

## Phase 13 — POS Operational Excellence and Transaction Controls

### Implemented Functionality

- Invoice search for completed sales from the POS screen.
- Receipt reprint through the existing receipt preview without creating a sale or changing stock.
- Confirmation-protected sale void operation with status cancellation instead of deletion.
- Atomic sale void reversal for stock, cash-session cash, and Khata customer balance where applicable.
- Duplicate void prevention and preservation of the original invoice number.
- Main-process RBAC permissions for `sales.void`, `sales.reprint`, and `sales.discount`.
- Bill discount operations now require the authoritative `sales.discount` permission.
- Hold, resume, and cancel held-bill actions now create audit events.
- Focused verification script: `scripts/test-phase13.ts`.

The application is intended to be tested through the real UI after running `npm run dev` or after rebuilding with `npm run build`. Test databases are temporary and are not used as production data.

---

## Phase 0 — Requirements and Architecture ✅

**Deliverables:**

- Project initialized (Electron + React + TypeScript + Vite + Tailwind)
- Secure Electron architecture (main, preload, renderer)
- Documentation suite
- Minimal application shell
- Build verification

---

## Phase 1 — Project Foundation

**Goals:** Harden the foundation established in Phase 0.

- Add routing (React Router or lightweight alternative)
- Environment configuration pattern
- Error boundary in renderer
- Logging utility in main process
- App icon and window branding
- Verify `better-sqlite3` native module compatibility with Electron
- Add `drizzle-kit` dev dependency and migration folder structure

---

## Phase 2 — Database Foundation

**Goals:** Working SQLite database with migrations.

- Install and configure `better-sqlite3` + Drizzle ORM
- Create initial schema (settings, categories, brands, units, products, product_barcodes, stock_movements)
- Migration runner on app startup
- Database service in main process
- Seed only system defaults (no fake business data)

---

## Phase 3 — Product & Catalog Management ✅

**Goals:** Full product catalog management.

- Sidebar navigation and module layout templates (completed implicitly)
- CRUD for categories, brands, units, products
- Product search and filtering
- Product Variations (SKUs) and multi-barcode support
- Purchase/selling price in minor units
- Minimum stock configuration
- Soft delete (deactivation) of products, variants, and barcodes
- Safe Drizzle database transactions (IPC wrapping)

---

## Phase 4 — Barcode Management and Label Generation ✅

**Goals:** Internal barcode generation and label printing prep.

- 13-digit internal EAN-13 barcode generation domain logic (`29` + 10-digit sequence + check digit)
- Atomic sequence persistence in `settings` table with gap tolerance
- Barcode assignment to product variants
- Offline vector SVG label preview component via `jsbarcode`
- Print job queue table (`barcode_print_jobs`) with status transitions (pending/printed/failed/retry)
- Full integration into Barcode Labels sidebar module and Product Details view

---

## Phase 5 — POS / Billing ✅

**Goals:** Fast cashier checkout workflow.

- Barcode scan input (keyboard-wedge scanner with Enter auto-submit)
- Product lookup by barcode, SKU, name
- Server-side authoritative price fetching (untrusted client prices ignored)
- Cart management (add, remove, +/- quantity, item discounts, bill discount)
- Multi-tender payments (Cash, Card, Split) with quick cash buttons and change calculation
- Hold / Resume / Delete bill with SQLite persistence in `held_bills`
- Sale completion with atomic SQLite database transaction (`sales`, `sale_items`, `sale_payments`, `stock_movements`)
- Sequential invoice numbering `INV-XXXXX` surviving application restarts
- Negative digital stock allowance to prevent blocking physical sales
- Receipt preview and thermal printable invoice rendering

---

## Phase 6 — Hardware Integration & Thermal Printing

**Goals:** Direct ESC/POS printing and hardware integration.

- Direct ESC/POS thermal receipt printing integration (80mm/58mm)
- Physical cash drawer kick pulse
- Barcode scanner hardware communication options (Serial / USB HID)

---

## Phase 7 — Inventory

**Goals:** Transaction-based stock management.

- Stock movement viewer
- Current stock calculation from movements
- Manual adjustments, damage, expiry
- Low stock alerts

---

## Phase 8 — Purchases and Suppliers

**Goals:** Inbound inventory and supplier management.

- Supplier CRUD
- Purchase orders / receiving
- Purchase payments
- Stock increase via purchase movements

---

## Phase 9 — Customers / Khata

**Goals:** Customer management and credit tracking.

- Customer CRUD
- Credit sales (Khata)
- Payment collection
- Balance tracking

---

## Phase 10 — Returns

**Goals:** Sales and purchase returns.

- Sales return workflow with stock reversal
- Purchase return workflow
- Return receipt

---

## Phase 11 — Expenses and Cash Management

**Goals:** Daily cash tracking.

- Expense categories and entries
- Cashier shift open/close
- Cash movement tracking
- Shift reconciliation

---

## Phase 12 — Reports

**Goals:** Business intelligence.

- Daily/monthly sales reports
- Product-wise sales
- Profit margins
- Stock valuation
- Charts via Recharts

### Implemented Functionality

- Dashboard KPIs include sales, invoices, gross profit, expenses, net profit, receivables, payables, inventory value, and low-stock data.
- Reports include sales, purchases, profit, inventory, stock movements, supplier payables, customer Khata, and offline exports.
- Expense categories support listing and creation with duplicate-name protection.
- Expenses use generated `EXP-XXXXX` numbers, date/category/amount/payment method/notes, search, totals, and audit events.
- Cash sessions support opening float, Cash In, Cash Out, closing with counted cash, expected cash, variance, movement ledger, and session history.
- Cash-paid expenses are written to the expense and cash ledgers atomically.
- Customer returns search completed invoices, validate partial/full quantities, restore resalable stock, and process cash or Khata refunds.
- Supplier returns search purchases, validate received quantities, reduce stock, adjust supplier payables, and process settlements.
- Return numbers are sequential: `RET-XXXXX` and `PRET-XXXXX`.
- Return mutations use SQLite transactions and `SALES_RETURN_CREATE` / `PURCHASE_RETURN_CREATE` audit events.

### Verification Scripts

```bash
npx tsx scripts/test-phase11.ts
npx tsx scripts/test-phase12.ts
npx tsx scripts/test-returns.ts
```

---

## Phase 13 — Users / Roles / Permissions

**Goals:** Multi-user access control.

- User authentication (local)
- Role-based permissions
- Permission checks in IPC handlers

---

## Phase 14 — Audit Logs

**Goals:** Full activity trail.

- Automatic audit log creation for critical operations
- Audit log viewer with filters

---

## Phase 15 — Backup / Restore

**Goals:** Data safety.

- Manual backup
- Automatic scheduled backup
- Restore with validation
- Export (products, sales)

---

## Phase 16 — Printer and Hardware Integration

**Goals:** Production hardware support.

- Thermal receipt printer (ESC/POS)
- Barcode label printer
- Cash drawer kick
- USB scanner abstraction

---

## Phase 17 — Testing and Hardening

**Goals:** Production readiness.

- Unit tests for domain logic and money utilities
- Integration tests for database transactions
- E2E smoke tests for critical flows
- Performance profiling for POS

---

## Phase 18 — Production Build and Windows Installer

**Goals:** Client deliverable.

- App icon and branding assets
- Code signing (if certificate available)
- NSIS installer polish
- Installation smoke test on clean Windows machine
