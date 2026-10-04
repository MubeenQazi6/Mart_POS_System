# MARTPOS — Technical Architecture

## Overview

MARTPOS is an Electron desktop application with a React renderer, SQLite database, and strict process separation for security and maintainability.

```
┌─────────────────────────────────────────────────────────────┐
│                     RENDERER (React)                        │
│  UI Components → Features → Zustand Stores → IPC Client     │
└──────────────────────────┬──────────────────────────────────┘
                           │ contextBridge (preload)
┌──────────────────────────▼──────────────────────────────────┐
│                     PRELOAD (Sandboxed)                       │
│  Typed MartposApi — allowlisted ipcRenderer.invoke only      │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC (typed channels)
┌──────────────────────────▼──────────────────────────────────┐
│                     MAIN PROCESS (Node.js)                    │
│  IPC Handlers → Services → Repositories → SQLite (Drizzle)   │
│  Hardware Abstraction → Filesystem → Backup                   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Desktop shell | Electron 37+ | Single-instance lock for SQLite safety |
| Dev/build tooling | electron-vite | Fast HMR for main, preload, renderer |
| Production packaging | electron-builder | NSIS Windows installer |
| Frontend | React 19 + TypeScript | Strict mode enabled |
| Routing | React Router 7 (HashRouter) | Hash-based routing for offline Electron file:// loading |
| Bundler | Vite 7 | Separate configs per process |
| Styling | Tailwind CSS 3 | Design tokens in tailwind.config.js |
| Database | SQLite + Drizzle ORM | Phase 2 — folder structure prepared in Phase 1 |
| Validation | Zod | Input validation at IPC and form boundaries |
| State | Zustand | Feature-scoped stores |
| Forms | React Hook Form | With Zod resolvers |
| Charts | Recharts | Reports module |
| Icons | Lucide React | Consistent icon set |
| Main Logging | Structured MainLogger | Timestamped console and file logging in userData/logs/ |
| Error Handling | React ErrorBoundary | Graceful UI crash fallback with reload & dashboard recovery |

## Project Structure

```
Mart_POS_System/
├── docs/                    # Architecture and product documentation
├── resources/               # App icons and build resources (Phase 18)
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts         # App entry, single-instance lock
│   │   ├── paths.ts         # Build output paths
│   │   ├── windows/         # BrowserWindow management
│   │   ├── ipc/handlers/    # IPC handler registration
│   │   └── services/        # Main-process services (DB, backup, hardware)
│   ├── preload/             # contextBridge API
│   ├── renderer/            # React application
│   │   ├── index.html
│   │   └── src/
│   │       ├── components/  # Shared UI (layout, ui)
│   │       ├── features/    # Feature modules (products, pos, returns, etc.)
│   │       ├── stores/      # Zustand stores
│   │       └── styles/      # Global CSS + Tailwind
│   ├── shared/              # Cross-process shared code
│   │   ├── ipc/             # Channel definitions
│   │   ├── types/           # Shared TypeScript types
│   │   ├── constants/       # App constants
│   │   └── utils/           # Money, formatting utilities
│   ├── database/            # Schema, migrations, connection (Phase 2)
│   ├── domain/              # Business logic (EAN-13 barcodes, sales, stock rules)
│   │   └── barcode.ts       # Pure EAN-13 generation, checksum, validation
│   └── repositories/        # Data access layer
│       ├── base.ts          # Common DB types & withTransaction helper
│       ├── catalog.ts       # Categories, brands, units CRUD
│       ├── products.ts      # Transactional products, variants, barcodes CRUD
│       ├── barcode-jobs.ts  # Barcode generation sequence & print queue CRUD
│       ├── dashboard.ts     # Dashboard KPI and analytics queries
│       ├── expenses.ts      # Expense categories, entries, totals, and audit
│       ├── cash.ts          # Cash sessions, movements, and reconciliation
│       └── returns.ts       # Atomic sales and purchase returns
├── electron.vite.config.ts
├── package.json
└── AGENTS.md
```

## Electron Security Model

| Setting | Value | Reason |
|---------|-------|--------|
| `contextIsolation` | `true` | Isolate renderer from Node |
| `nodeIntegration` | `false` | No Node in renderer |
| `sandbox` | `true` | Restrict preload capabilities |
| `webSecurity` | `true` | Standard web security |
| External links | `shell.openExternal` | Never open in Electron window |

### IPC Design

1. All channels defined in `src/shared/ipc/channels.ts`
2. Preload exposes a typed `window.martpos` API — no raw `ipcRenderer` in renderer
3. Main process validates all inputs with Zod before executing
4. Handlers organized by domain: `app`, `catalog`, `sales`, `dashboard`, `expenses`, `cash`, and `returns`.
5. No arbitrary channel strings from renderer

### Preload Loading (Critical)

electron-vite builds preload to `out/preload/`. The main process resolves the path in `src/main/paths.ts`:

```
out/main/index.js  →  resolves  →  out/preload/index.js (CJS)
```

**Why CJS for preload:** With `"type": "module"`, electron-vite defaults to ESM (`.mjs`). ESM preload scripts fail in Electron's sandboxed preload context with module loading errors. Preload is explicitly configured as `format: 'cjs'` in `electron.vite.config.ts`.

**Secure API exposure:**

```
src/preload/index.ts
  contextBridge.exposeInMainWorld('martpos', { app: { getInfo: () => ipcRenderer.invoke(...) } })

Renderer (React)
  window.martpos.app.getInfo()
```

**Runtime verification:** Set `MARTPOS_VERIFY_PRELOAD=1` or run `node scripts/verify-preload.mjs` after build.

## SQLite Integration Strategy (Phase 2)

```
app.getPath('userData')/martpos.db     ← Database file
app.getPath('userData')/backups/       ← Backup storage
```

- **Driver:** `better-sqlite3` — synchronous, reliable in Electron main process
- **ORM:** Drizzle ORM — type-safe schema, migrations via `drizzle-kit`
- **Location:** Never inside the installed app directory
- **Access:** Main process only — renderer calls IPC, never touches DB directly
- **Migrations:** Every schema change gets a versioned migration file
- **WAL mode:** Enabled for better concurrent read performance
- **Single instance:** Enforced via `requestSingleInstanceLock()` to prevent concurrent writers

## Money Representation

All money stored as **integer minor units** (`MoneyMinor` type):

```typescript
// 150.50 PKR → 15050 minor units
const price: MoneyMinor = toMinorUnits(150.50);
```

Utilities in `src/shared/utils/money.ts`. Domain logic performs integer arithmetic only. Display formatting converts to decimal for UI.

## Business Logic Layer

Business logic lives in `src/domain/` — never in React components or IPC handlers directly.

```
IPC Handler → validates input → calls Domain Logic / Repo → atomic withTransaction → SQLite
```

Implemented Phase 5 sale completion flow:

```
salesRepo.createSale(input)
  → withTransaction (BEGIN)
  → increment invoice.internal_sequence in settings
  → merge duplicate cart items
  → fetch authoritative prices from DB for each variant_id
  → domain calculateCartTotals(authoritativeItems, discount_minor)
  → validate payments sum >= authoritative total
  → insert sales record (INV-XXXXX)
  → insert sale_items (line_total_minor, unit_price_minor snapshot)
  → insert stock_movements (OUT, scaled quantity, reference SALE)
  → insert sale_payments (cash, card)
  → COMMIT (or ROLLBACK on failure)
```

Phase 13 POS transaction controls use the same authoritative path:

```text
POS transaction search/reprint/void
  → window.martpos.sales
  → sales IPC handler + RBAC
  → sales repository
  → atomic status, stock, cash, and Khata reversal
```

Voiding never deletes the original sale or changes its invoice number. A cancelled sale receives compensating stock and financial ledger movements inside one transaction. Reprinting only reads the original sale and opens the existing receipt preview.

## Hardware Abstraction (Future — Phase 16)

```
src/main/services/hardware/
├── barcode-scanner.ts    # Keyboard-wedge + future native
├── receipt-printer.ts    # ESC/POS abstraction
├── label-printer.ts      # Barcode label printing
└── cash-drawer.ts        # Drawer kick command
```

Business logic calls hardware interfaces — implementations are swappable.

## Barcode Architecture (Phase 4)

Internal barcodes strictly follow the 13-digit EAN-13 standard:

```
[prefix: 2 digits (29)][sequence: 10 digits][check: 1 digit]
Example: 2900000000018
```

- **Domain Layer (`src/domain/barcode.ts`):** Pure EAN-13 check digit calculation and formatting.
- **Sequence Persistence (`src/repositories/barcode-jobs.ts`):** Counter stored in `settings` table (`barcode.internal_sequence`), atomic within transaction.
- **Decoupled Identity:** Barcode identity does not embed database primary keys (`product_id` / `variant_id`), allowing flexible refactoring. Relational resolution flows: `barcode → product_barcodes → product_variants → products`.
- **Print Queue:** Physical label print batches queued in `barcode_print_jobs` table.
- **Offline Rendering:** `jsbarcode` produces vector SVG barcode stickers in the renderer.

## Backup Architecture (Future — Phase 15)

- Manual: user-triggered copy of `martpos.db` to backup folder
- Automatic: scheduled copy with rotation
- Restore: validate backup integrity, replace DB with confirmation
- Export: CSV/JSON exports for products and sales

## Windows Packaging

**Tool:** electron-builder with NSIS target

**Output:** `release/MARTPOS-Setup-x.x.x.exe`

**Features:**

- Custom install directory
- Desktop and Start Menu shortcuts
- No developer dependencies for end user

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Electron with HMR |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Run built app locally |
| `npm run package` | Build + create Windows installer |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint |

## Path Aliases

| Alias | Path |
|-------|------|
| `@main/*` | `src/main/*` |
| `@renderer/*` | `src/renderer/src/*` |
| `@shared/*` | `src/shared/*` |

## Future Extensibility

| Concern | Extension Point |
|---------|-----------------|
| Multi-counter | Add `counter_id` to sales, cash_sessions |
| Multi-branch | Add `branch_id` to relevant entities |
| Multi-database | Repository layer abstraction |
| Plugin hardware | Hardware service interfaces |
| Online sync (optional) | Separate sync service — never required for core POS |
