/**
 * Zenthropic Technologies — Monorepo Codebase Mapper
 *
 * Scans the entire codebase and generates a complete structural map:
 * - Applications (Desktop Electron, MartPOS Web, WarehouseOS Web, Company Site)
 * - Modules & Feature Boundaries
 * - Database Schemas & Tables (SQLite + PostgreSQL Supabase)
 * - IPC Channels & Handlers
 * - State Management Stores (Zustand)
 * - Universal API Adapters & Cloud Integrations
 *
 * Outputs:
 * - codebase-map.json
 * - docs/CODEBASE_MAP.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getFiles(dir, extensions = ['.ts', '.tsx', '.js', '.mjs', '.sql']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === 'out' || file === 'dist-gateway' || file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

console.log('🔍 Scanning Zenthropic Monorepo Codebase...');

const apps = [
  { name: 'MartPOS Desktop (Electron)', path: 'src', type: 'Desktop POS Client' },
  { name: 'MartPOS Web (Cloud POS)', path: 'packages/web', type: 'Web PRD & UAT Client' },
  { name: 'WarehouseOS Web', path: 'packages/warehouse-web', type: 'Supply Chain & Inventory Hub' },
  { name: 'Zenthropic Corporate Site', path: 'packages/company-site', type: 'Public SaaS Landing' },
];

const desktopFeatures = getFiles(path.join(rootDir, 'src/renderer/src/features'));
const webFeatures = getFiles(path.join(rootDir, 'packages/web/src/features'));
const warehouseFeatures = getFiles(path.join(rootDir, 'packages/warehouse-web/src/features'));
const schemaFiles = getFiles(path.join(rootDir, 'src/database/schema'));
const ipcHandlerFiles = getFiles(path.join(rootDir, 'src/main/ipc/handlers'));
const desktopStores = getFiles(path.join(rootDir, 'src/renderer/src/stores'));
const webStores = getFiles(path.join(rootDir, 'packages/web/src/stores'));

const codebaseMap = {
  project: 'Zenthropic Technologies — Multi-System POS & Supply Chain Ecosystem',
  generated_at: new Date().toISOString(),
  architecture: {
    pattern: 'Multi-Tenant Modular Monorepo with Offline-First Distributed Synchronization',
    tenancy: 'Row Level Security (RLS) PostgreSQL + Local SQLite Cache per Counter',
    client_parity: '100% Feature Parity between Electron Desktop and Web via Universal Adapter',
  },
  apps: apps.map(a => ({
    ...a,
    file_count: getFiles(path.join(rootDir, a.path)).length
  })),
  database: {
    driver_desktop: 'better-sqlite3 + Drizzle ORM (Local WAL Mode)',
    driver_cloud: 'PostgreSQL + Supabase Cloud Engine',
    schemas: schemaFiles.map(f => path.basename(f, path.extname(f))),
  },
  ipc_channels: ipcHandlerFiles.map(f => path.basename(f, path.extname(f))),
  stores: {
    desktop_count: desktopStores.length,
    web_count: webStores.length,
    shared_state: desktopStores.map(f => path.basename(f, path.extname(f))),
  },
  features: {
    martpos_desktop: [...new Set(desktopFeatures.map(f => path.dirname(f).split(path.sep).pop()))],
    martpos_web: [...new Set(webFeatures.map(f => path.dirname(f).split(path.sep).pop()))],
    warehouse_web: [...new Set(warehouseFeatures.map(f => path.dirname(f).split(path.sep).pop()))],
  }
};

// Write codebase-map.json
const jsonPath = path.join(rootDir, 'codebase-map.json');
fs.writeFileSync(jsonPath, JSON.stringify(codebaseMap, null, 2), 'utf-8');
console.log(`✅ Generated JSON Map: ${jsonPath}`);

// Generate docs/CODEBASE_MAP.md
const mdContent = `# 🗺️ Zenthropic Technologies — Enterprise Codebase Map

> **Generated Automatically:** ${new Date().toLocaleDateString()} | **Monorepo Version:** 2.0.0-enterprise

---

## 1. System Topology & Architecture Overview

\`\`\`mermaid
flowchart TD
    subgraph Clients["Frontend Clients (UI & Experience)"]
        Desk["💻 MartPOS Desktop (Electron + React)"]
        WebP["🌐 MartPOS Web (PRD / Cloud)"]
        WebU["🧪 MartPOS Web (UAT / Staging)"]
        WareP["📦 WarehouseOS PRD"]
        WareU["🧪 WarehouseOS UAT"]
        Comp["🏢 Zenthropic Company Website"]
    end

    subgraph Adapters["Universal Adapter Boundary"]
        DeskIPC["Preload contextBridge IPC"]
        WebAdapt["Universal Web Adapter (martposWebAdapter)"]
    end

    subgraph State["Reactive State Layer (Zustand)"]
        Stores["Auth, POS, Inventory, Customers, Suppliers, Purchases, Expenses, Cash, Reports"]
    end

    subgraph Persistence["Storage & Database Engine"]
        SQL["📂 Local SQLite (WAL Mode, Deterministic)"]
        Supa["☁️ Supabase PostgreSQL (RLS Tenant-Scoped)"]
        LocalS["💾 IndexedDB / localStorage Fallback Cache"]
    end

    Desk --> DeskIPC --> Stores --> SQL
    WebP --> WebAdapt --> Stores --> Supa
    WebP --> WebAdapt --> LocalS
    WareP --> WebAdapt --> Supa
\`\`\`

---

## 2. Monorepo Application Matrix

| Package / Application | Directory | Role & Target | Storage Engine |
|---|---|---|---|
| **MartPOS Desktop** | \`src/\` | High-speed offline retail POS counter (barcode scanning, thermal printers, cash drawer) | \`better-sqlite3\` + Drizzle ORM |
| **MartPOS Web** | \`packages/web/\` | Browser-based cloud management, multi-device dashboard & cashier terminal | Supabase PostgreSQL + Local Storage |
| **WarehouseOS Web** | \`packages/warehouse-web/\` | Supply chain, batch bin tracking, purchase orders & logistics | Supabase PostgreSQL (Isolated Schema) |
| **Company Website** | \`packages/company-site/\` | Public SaaS marketing, pricing, dynamic software catalog & customer acquisition | Static / Vercel Edge CDN |
| **Shared Core Types** | \`src/shared/\` | Type contracts, MoneyMinor utilities, IPC channel definitions, formatters | Shared across all packages |

---

## 3. Active Feature Modules (${codebaseMap.features.martpos_desktop.length} Core Modules)

\`\`\`
├── 🏷️ Catalog & Categories (categories, brands, units)
├── 📦 Products & Pricing (variants, cost/selling price, SKUs)
├── 📊 Barcodes (EAN-13, internal auto-generation, labels)
├── 🛒 Point of Sale (POS) (barcode lookup, cart, multi-tender, held bills)
├── 🧾 Returns & Exchanges (sales/purchases return, refund calculations)
├── 📈 Inventory & Stock (adjustments, batch lots, low-stock warnings)
├── 👥 Customers & Khata (credit limits, ledgers, recovery payments)
├── 🚚 Suppliers & Payables (vendor balances, supplier ledgers)
├── 📑 Purchases & GRN (purchase orders, item costing, receiving)
├── 💵 Cash Register & Shifts (opening drawer, cash-in/out, closing reports)
├── 💸 Store Expenses (operational expense categorization, receipts)
├── 📈 Reports & Business Intelligence (sales, profit/loss, inventory value)
├── 🔐 Users & Roles (cashier, manager, admin, permission matrices)
├── 🛡️ Audit Logs (system action trail, login events, security logs)
├── ⚙️ Settings (store details, receipt formatting, theme preferences)
└── 🔑 Licensing (3-day trial engine, machine code, enterprise activations)
\`\`\`

---

## 4. Database Schema Map

| Table / Entity | Desktop SQLite Schema | Cloud Supabase Table | Key Purpose |
|---|---|---|---|
| **Organizations** | In-app store metadata | \`public.organizations\` | Multi-tenant tenant identifier (\`org_id\`) |
| **Subscriptions** | \`licensing_state\` | \`public.subscriptions\` | 3-day trial & SaaS tier license records |
| **Counters** | Counter hardware fingerprint | \`public.counters\` | Multi-counter terminal mesh synchronization |
| **Products** | \`products\`, \`product_variants\` | \`public.cloud_products\` | Synced catalog with barcode mappings |
| **Sales Invoices** | \`sales\`, \`sale_items\`, \`sale_payments\` | \`public.cloud_sales\` | Financial transaction records (minor units) |
| **Stock Movements** | \`stock_movements\` | \`public.cloud_stock_movements\` | Immutable inventory audit trail |
| **Customers** | \`customers\`, \`customer_transactions\` | \`public.cloud_customers\` | Customer Khata & credit balances |
| **Suppliers** | \`suppliers\`, \`supplier_transactions\` | \`public.cloud_suppliers\` | Vendor accounts & payables |
| **Expenses** | \`expenses\`, \`expense_categories\` | \`public.cloud_expenses\` | Store daily operational costs |
| **Cash Sessions** | \`cash_sessions\`, \`cash_movements\` | \`public.cloud_cash_sessions\` | Daily drawer shifts & cash reconciliations |

---

## 5. Security & Isolation Invariants

1. **Deterministic Money Calculation**: Integer minor units (\`MoneyMinor\` - paisa) across all layers. Zero floating-point drift.
2. **Multi-Tenant RLS Barrier**: Every Supabase query enforces \`org_id\` matching both database RLS and application-layer fail-closed filters.
3. **Hardware & Token Security**: Electron preload exposes only strict \`window.martpos\` API. Direct filesystem or database access from renderer is blocked.
4. **Air-Gapped Offline Capability**: Core desktop and web POS operate independently of network connectivity.
`;

const mdPath = path.join(rootDir, 'docs', 'CODEBASE_MAP.md');
fs.writeFileSync(mdPath, mdContent, 'utf-8');
console.log(`✅ Generated Markdown Architecture Map: ${mdPath}`);
console.log('🎉 Codebase mapping complete!');
