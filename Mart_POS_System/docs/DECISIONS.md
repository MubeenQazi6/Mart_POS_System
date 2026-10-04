# MARTPOS — Architectural Decision Records

## ADR-001: Electron + React + TypeScript

**Decision:** Use Electron for the desktop shell, React for UI, TypeScript throughout.

**Rationale:** Electron provides cross-platform desktop capability with mature ecosystem. React enables component-based UI suitable for complex POS interfaces. TypeScript strict mode catches errors at compile time — critical for financial software.

**Alternatives considered:** Tauri (Rust learning curve, less mature printer support), WPF/C# (Windows-only, harder to find React-like component ecosystem).

---

## ADR-002: electron-vite for Development, electron-builder for Packaging

**Decision:** Use `electron-vite` for development/build bundling and `electron-builder` for Windows installer creation.

**Rationale:**

- **electron-vite:** Handles main, preload, and renderer bundling with HMR — excellent developer experience
- **electron-builder:** Industry standard for production Windows NSIS installers; more mature than Electron Forge's built-in makers for Windows `.exe` distribution

**Alternatives considered:** Electron Forge (good DX but less flexible for NSIS customization), manual Webpack setup (more maintenance).

---

## ADR-003: SQLite with better-sqlite3 in Main Process

**Decision:** Use SQLite via `better-sqlite3` driver, accessed only from the Electron main process.

**Rationale:**

- Fully offline, no server required
- `better-sqlite3` is synchronous and reliable in Node.js/Electron
- Single-writer model fits single-counter deployment
- Drizzle ORM provides type-safe schema and migrations

**Alternatives considered:** sql.js (WASM, slower for large datasets), TypeORM (heavier), raw SQL (no type safety).

**Risk:** `better-sqlite3` is a native module — must be rebuilt for Electron's Node version. Mitigation: use `@electron/rebuild` or electron-vite's externalizeDepsPlugin.

---

## ADR-004: Integer Minor Units for Money

**Decision:** Store and calculate all monetary values as integer minor units (paisa for PKR).

**Rationale:** Floating-point arithmetic causes precision errors (e.g. `0.1 + 0.2 !== 0.3`). Integer arithmetic is deterministic and safe for financial operations.

**Example:** PKR 150.50 → stored as `15050`

---

## ADR-005: Transaction-Based Inventory

**Decision:** Track inventory via `stock_movements` table, not a standalone `products.stock` counter.

**Rationale:** Every stock change must be auditable. A movement log supports returns, damage, expiry, adjustments, and historical reporting. Current stock is derived from `SUM(quantity)`.

---

## ADR-006: Secure IPC Architecture

**Decision:** Renderer communicates with main process only through typed, allowlisted IPC channels exposed via contextBridge.

**Rationale:** Prevents renderer from accessing Node.js, filesystem, or database directly. Each channel validates input with Zod.

**Configuration:**

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`

---

## ADR-007: Single Instance Lock

**Decision:** Use `app.requestSingleInstanceLock()` to prevent multiple MARTPOS instances.

**Rationale:** SQLite allows only one writer at a time. Multiple instances could corrupt data or cause lock errors.

---

## ADR-008: User Data in OS AppData Directory

**Decision:** Store database, backups, and config in `app.getPath('userData')`.

**Rationale:** Windows installs to Program Files (read-only for standard users). User data must live in `%APPDATA%/martpos/` or equivalent.

---

## ADR-009: Feature-Oriented Folder Structure

**Decision:** Organize renderer code by feature (`features/products/`, `features/pos/`) with shared components in `components/`.

**Rationale:** Scales better than flat component folders as modules grow. Business logic stays in `domain/`, data access in `repositories/`.

---

## ADR-010: No Backend Server

**Decision:** No Express/Fastify or other HTTP server inside the application.

**Rationale:** All logic runs in Electron main process via IPC. A local server adds complexity, port conflicts, and security surface without benefit for a single-user desktop app.

---

## ADR-011: Soft Deletion for Critical Records

**Decision:** Sales, payments, stock movements, and products use deactivation/cancellation — never permanent deletion.

**Rationale:** Financial audit requirements. A cancelled sale remains in the database with `status = 'cancelled'` and corresponding reversal movements.

---

## ADR-012: Internal Barcode Numbering Scheme (SUPERSEDED by ADR-016)

**Status:** Superseded by ADR-016 in Phase 4. The previously proposed `[29][product_id][variant][check]` produced only 12 digits and coupled barcode identity to database IDs.

---

## Decisions Pending Approval

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Currency | PKR only vs. configurable | Start PKR-only, add setting later |
| Tax support | Include now vs. later | Defer to Phase 6 POS design |
| Authentication | Login on startup vs. per-action | Login on startup (Phase 13) |
| Code signing | Required for production | Needed for Phase 18 — requires certificate |

---

## ADR-013: Preload Script Format and Path Resolution

**Decision:** Build the preload script as **CommonJS (`.js`)** and resolve its path at runtime by checking for `index.mjs` then `index.js` in the build output directory.

**Context:** With `"type": "module"` in `package.json`, electron-vite defaults preload output to **ESM (`.mjs`)**. Two failures occurred:

1. Main process referenced hardcoded `index.js` while electron-vite emitted `index.mjs` — preload file not found.
2. After correcting the path, ESM preload failed at runtime with `Cannot use import statement outside a module` in Electron's sandboxed preload context.

**Resolution:**

- Force preload Rollup output to `format: 'cjs'` with `entryFileNames: '[name].js'` in `electron.vite.config.ts`.
- Resolve preload path in `src/main/paths.ts` using `import.meta.url` and `existsSync` (checks `.mjs` then `.js`).
- Expose API via `contextBridge.exposeInMainWorld('martpos', api)` in `src/preload/index.ts`.
- Renderer accesses only `window.martpos` — never raw `ipcRenderer`.

**Security retained:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.

**Verification:** `MARTPOS_VERIFY_PRELOAD=1` runs automated runtime check; `node scripts/verify-preload.mjs` after build.

---

## ADR-014: React Router HashRouter & Main Process Structured Logging (Phase 1)

**Decision:** Use `HashRouter` for client-side routing in the renderer and implement a lightweight structured file-and-console logger (`MainLogger`) in the main process.

**Rationale:**
- **HashRouter:** Packaged Electron applications serve frontend assets via `file://` protocol where browser path routing (`BrowserRouter`) fails on reloads or subpath links without a web server. Hash-based routing ensures deterministic offline navigation across all views without 404 file path lookup errors.
- **MainLogger:** Centralized logging with severity levels (`debug`, `info`, `warn`, `error`), timestamp formatting, and dual-output (colored dev console + persistent JSONL append in `%APPDATA%/martpos/logs/martpos.log`) without introducing heavy external logging dependencies.

---

## ADR-015: SQLite with Drizzle ORM Schema (Phase 2)

**Decision:** Define the complete schema using `drizzle-orm/sqlite-core`, handle migrations automatically at app startup in the main process, and store all financial values in minor units. Product catalog separates abstract `products` from physical, sellable `product_variants`.

**Rationale:**
- **Product vs Variant:** A self-referencing product table (`parent_product_id`) was rejected because base products (e.g., "Sugar") and physical SKUs (e.g., "1 KG", "2 KG") have different domains. Base products don't have prices or barcodes. Variants do. 
- **Minor Units:** Integer arithmetic (`MoneyMinor`) avoids floating point issues.
- **Quantity Scale:** Standardized stock quantities as integer thousandths (e.g. 1500 = 1.5 KG) to prevent JS floating-point inaccuracies in inventory reporting.
- **Transactions:** A repository base provides `withTransaction` for financial atomicity (sales, stock movements).
- **Startup Migrations:** Guarantee the database schema is up-to-date before opening the application window. If it fails, a native error dialog is displayed, preventing corrupted states.
- **Native Modules:** `better-sqlite3` is externalized in `electron.vite.config.ts` to ensure Electron's Node 22 ABI resolves it correctly at runtime.

---

## ADR-016: Internal EAN-13 Barcode Standard (Phase 4)

**Decision:** All internally generated MARTPOS barcodes strictly conform to the 13-digit EAN-13 standard:
- Prefix `29` (Standard GS1 prefix reserved for internal retailer usage)
- 10-digit zero-padded persistent sequence number (e.g., `0000000001`)
- 1 standard EAN-13 check digit calculated using integer arithmetic alternating weights (1 and 3)

**Rationale:** 
- EAN-13 is universally supported by retail barcode scanners (hardware wedge scanners).
- Avoids coupling barcode identity to database IDs (`product_id` / `variant_id`), allowing products to be restructured or migrated safely.
- Relational mapping is maintained cleanly: `barcode → product_barcodes → product_variants → products`.

---

## ADR-017: Barcode Sequence Persistence & Rollback Gap Policy (Phase 4)

**Decision:** The sequence counter for internal barcode generation is persisted in the `settings` table (`key = 'barcode.internal_sequence'`) and incremented atomically inside a database transaction (`withTransaction`).

**Rationale:**
- Sequence increments survive application restarts and system crashes.
- If a transaction rolls back after incrementing the sequence, that sequence number is consumed and creates an intentional gap. Gaps in barcode sequences are completely benign in retail operations, whereas duplicate barcodes are catastrophic. Uniqueness is guaranteed both by the atomic sequence loop and a database-level `UNIQUE` constraint on `product_barcodes.barcode`.

---

## ADR-018: jsbarcode for Offline Vector SVG Label Rendering (Phase 4)

**Decision:** Use `jsbarcode` in the React renderer for crisp, offline vector SVG barcode generation in label previews.

**Rationale:**
- 100% offline — zero cloud or CDN dependencies.
- Vector SVG rendering scales cleanly to any print DPI or thermal label dimension without bitmap pixelation.
- Confined entirely to renderer DOM components; zero native Node.js or main process coupling.

---

## ADR-019: Sequential Invoice Numbers (`INV-XXXXX`) & Monotonic Sequence (Phase 5)

**Decision:** All completed sales receive a sequential invoice number with format `INV-XXXXX` (e.g., `INV-00001`, `INV-00002`), driven by a persistent counter `invoice.internal_sequence` in the `settings` table.

**Rationale:**
- Monotonically increasing numbers are easy for cashiers and customers to reference on printed receipts and return lookups.
- Persisting the sequence counter in the database ensures numbers survive application restarts.
- Sequence increments occur inside the atomic sale transaction (`withTransaction`). Sequence gaps after transaction rollback are acceptable; duplicate invoice numbers are strictly prohibited via SQLite `UNIQUE` constraints.

---

## ADR-020: Server-Side Authoritative Pricing, Payment Validation & Negative Stock Policy (Phase 5)

**Decision:**
1. **Untrusted Frontend Totals:** Frontend cart totals are UI-only. The main process repository fetches fresh prices from SQLite for each `variant_id`, independently calculates line totals, item discounts, bill discounts, tax, and the final grand total using pure integer arithmetic (`src/domain/sales.ts`).
2. **Payment Validation:** Server-side validation requires that total recorded payments equal or exceed the authoritative grand total, properly handling split cash/card tenders and change calculations.
3. **Negative Stock Allowance:** Sales are never blocked due to calculated digital stock being zero or negative. Retail POS operates in the physical realm where the item is physically present at the counter. Accurate `OUT` stock movements are recorded regardless of stock balance, ensuring traceability.
4. **Relational Linkage:** Line items reference `variant_id` (the physical sellable SKU) rather than `product_id`, aligning with the strict multi-variant architecture established in Phase 3.

---

## ADR-021: SQLite Persistence for Held Bills (Phase 5)

**Decision:** The Hold & Resume bill feature persists the serialized cart snapshot directly into the `held_bills` SQLite table rather than relying exclusively on in-memory Zustand store state.

**Rationale:**
- Cashiers can hold active carts during peak retail hours without risk of data loss if the cashier switches screens, restarts the app, or recovers from an unexpected power loss.
- Resuming a held bill unpacks the cart and deletes the held record from SQLite atomically.


