# MARTPOS — Database Design

> **Status:** Implemented schema reference. Migrations through `0008_sale_cost_snapshot.sql` are applied by the startup migration runner.

## Design Principles

1. **Normalized** — Third normal form where practical; denormalize only for proven performance needs
2. **Transaction-based inventory** — Stock derived from `stock_movements`, not a lone counter field
3. **Integer money** — All monetary columns stored as `INTEGER` minor units
4. **Soft deletion** — Critical records use `is_active` / `deleted_at`, never hard delete
5. **Audit trail** — Financial and stock operations logged in `audit_logs`
6. **Foreign keys enforced** — SQLite `PRAGMA foreign_keys = ON`
7. **Timestamps** — `created_at`, `updated_at` on all mutable entities

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `sale_items` |
| Columns | snake_case | `purchase_price_minor` |
| Primary keys | `id` (INTEGER AUTOINCREMENT) | `id` |
| Foreign keys | `{entity}_id` | `product_id` |
| Money columns | `*_minor` suffix | `selling_price_minor` |
| Booleans | `is_*` prefix | `is_active` |
| Indexes | `idx_{table}_{columns}` | `idx_products_category_id` |

## Money Columns

All prices, amounts, totals, balances, discounts stored as `INTEGER` (minor units). Never use `REAL` or `FLOAT`.

## Entity Relationship Overview

```
users ──< sales                    products ──< product_barcodes
roles ──< users                    products ──> categories
permissions ──< role_permissions   products ──> brands
                                   products ──> units

sales ──< sale_items ──> products
sales ──< sale_payments
sales ──> customers (optional)

purchases ──< purchase_items ──> products
purchases ──< purchase_payments
purchases ──> suppliers

stock_movements ──> products

customers ──< customer_transactions
suppliers ──< supplier_transactions

returns ──< return_items
expenses ──> expense_categories
cash_sessions ──< cash_movements
held_bills (JSON cart snapshot)
barcode_print_jobs ──> product_variants
barcode_print_jobs ──> product_barcodes
audit_logs (polymorphic reference)
settings (key-value)
```

## Phase 2 Initial Tables

Phase 2 will implement foundation tables first:

1. `settings`
2. `categories`
3. `brands`
4. `units`
5. `products`
6. `product_barcodes`
7. `stock_movements`

Remaining tables added as their feature phases begin.

## Table Definitions (Planned)

### users

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| username | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt/argon2 |
| full_name | TEXT | |
| role_id | INTEGER FK → roles | |
| is_active | INTEGER (bool) | |
| created_at | TEXT | |
| updated_at | TEXT | |

### roles / permissions / role_permissions

Standard RBAC. Permissions are granular strings (e.g. `products.create`, `sales.refund`).

### categories

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT UNIQUE | User-defined, not hard-coded |
| description | TEXT NULL | |
| sort_order | INTEGER | Display ordering |
| is_active | INTEGER | Soft delete |

### brands

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT UNIQUE | |
| is_active | INTEGER | |

### units

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT | e.g. "KG", "Piece", "Liter" |
| abbreviation | TEXT | |
| is_active | INTEGER | |

### products

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT | |
| sku | TEXT UNIQUE NULL | |
| category_id | INTEGER FK | |
| brand_id | INTEGER FK NULL | |
| unit_id | INTEGER FK | |
| purchase_price_minor | INTEGER | |
| selling_price_minor | INTEGER | |
| min_stock_qty | INTEGER | Alert threshold |
| parent_product_id | INTEGER FK NULL | Custom packaging variants |
| package_size | TEXT NULL | e.g. "1 KG" |
| is_active | INTEGER | |
| created_at | TEXT | |
| updated_at | TEXT | |

### Catalog

1. **`categories`**
   - `id` (PK), `name` (unique), `description`, `sort_order`, `is_active`
2. **`brands`**
   - `id` (PK), `name` (unique), `is_active`
3. **`units`**
   - `id` (PK), `name` (e.g., "Kilogram"), `abbreviation` (e.g., "KG"), `decimals` (e.g., 3), `is_active`
4. **`products`**
   - `id` (PK), `name`, `description`, `category_id` (FK), `brand_id` (FK), `is_active`, timestamps
5. **`product_variants`**
   - `id` (PK), `product_id` (FK to products), `variant_name` (e.g., "1 KG"), `sku` (unique), `unit_id` (FK to units), `purchase_price_minor`, `selling_price_minor`, `min_stock_alert`, `is_active`, timestamps
   - **Why this model?** Real-world POS requires strict differentiation between the abstract product (Sugar) and the physical, sellable SKU (Sugar 1 KG vs Sugar 2 KG). Each variant has unique pricing, stock, and barcodes.
6. **`product_barcodes`**
   - `id` (PK), `variant_id` (FK to variants), `barcode` (unique), `barcode_type`, `is_primary`, `created_at`

### Inventory

1. **`stock_movements`**
   - `id` (PK), `variant_id` (FK to variants), `movement_type` (IN, OUT, ADJUST, INIT), `quantity` (integer, scaled by 1000 for 3 decimal precision), `unit_cost_minor`, `reference_type` (SALE, PURCHASE, RETURN, ADJUSTMENT), `reference_id`, `notes`, `created_by`, `created_at`
   - *Note: Current stock is calculated by `SUM(quantity) WHERE type = 'IN'` - `SUM(quantity) WHERE type = 'OUT'`.*

### Sales & POS (Phase 5)

1. **`sales`**
   - `id` (PK AUTO), `invoice_number` (UNIQUE, `INV-XXXXX`), `subtotal_minor`, `discount_minor`, `tax_minor`, `total_minor`, `status` (`completed`, `cancelled`), `notes`, `created_at`

2. **`sale_items`**
   - `id` (PK AUTO), `sale_id` (FK → `sales.id`), `variant_id` (FK → `product_variants.id`), `quantity` (integer, scaled by 1000 for decimal precision), `unit_price_minor` (authoritative snapshot at time of sale), `unit_cost_minor` (purchase-cost snapshot at time of sale), `discount_minor` (per-item discount), `line_total_minor`

3. **`sale_payments`**
   - `id` (PK AUTO), `sale_id` (FK → `sales.id`), `payment_method` (`cash`, `card`), `amount_minor`

4. **`held_bills`**
   - `id` (PK AUTO), `cart_data` (TEXT, serialized JSON cart snapshot), `notes`, `created_at`

### purchases / purchase_items / purchase_payments

Mirror of sales structure for inbound inventory.

### customers / customer_transactions

**customers:** name, phone, credit_limit_minor, current_balance_minor

**customer_transactions:** type (sale_credit, payment, adjustment), amount_minor, reference

### suppliers / supplier_transactions

Similar to customers for payables.

### Returns, Expenses, and Cash (Migrations 0006-0007)

`sales_returns` and `sales_return_items` link customer returns to completed sales and sale items. `purchase_returns` and `purchase_return_items` link supplier returns to purchases and purchase items. Return quantities are checked against previous return rows, while stock changes are append-only movements.

`expense_categories` and `expenses` store categorized operating expenses in integer minor units. Expenses use generated sequence numbers and support posted/voided status.

`cash_sessions` stores opening/closing floats, expected cash, actual counted cash, variance, cashier references, and status. `cash_movements` stores session-scoped cash-in, cash-out, expense, sale, refund, opening, and closing entries. Cash-paid expenses and cash refunds are linked to their source records and written atomically.

### barcode_print_jobs

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| product_id | INTEGER FK | |
| quantity | INTEGER | Labels to print |
| status | TEXT | pending, printed, failed |
| created_at | TEXT | |

### audit_logs

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK NULL | |
| action | TEXT | e.g. sale.create, product.update |
| entity_type | TEXT | |
| entity_id | INTEGER | |
| old_values | TEXT (JSON) NULL | |
| new_values | TEXT (JSON) NULL | |
| created_at | TEXT | |

### settings

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | e.g. store.name, barcode.internal_sequence |
| value | TEXT | String or JSON-encoded value |
| updated_at | TEXT | |

### barcode_print_jobs (Phase 4)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK AUTO | |
| variant_id | INTEGER FK → product_variants | |
| barcode_id | INTEGER FK → product_barcodes | |
| quantity | INTEGER | Number of physical labels to print |
| status | TEXT | `pending`, `printed`, `failed` |
| created_at | TEXT | Default `CURRENT_TIMESTAMP` |
| updated_at | TEXT | Default `CURRENT_TIMESTAMP` |

## Key Indexes

```sql
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE UNIQUE INDEX idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

## Migration Strategy

- Tool: `drizzle-kit generate` + `drizzle-kit migrate`
- Location: `src/database/migrations/`
- Every schema change = new migration file
- Migrations run on app startup in main process

## Transaction Examples

### Complete Sale

```sql
BEGIN;
  INSERT INTO sales (...) VALUES (...);
  INSERT INTO sale_items (...) VALUES (...);
  INSERT INTO sale_payments (...) VALUES (...);
  INSERT INTO stock_movements (...) VALUES (...);
  INSERT INTO audit_logs (...) VALUES (...);
COMMIT;
```

Any failure → `ROLLBACK`. No partial records.

See full table definitions in the project planning documents and Phase 2 implementation.
