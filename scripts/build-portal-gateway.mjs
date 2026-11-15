/**
 * Zenthropic Multi-Product Portal Gateway Builder
 *
 * Compiles all four web environments:
 * 1. MartPOS Live (PRD) -> /martpos/
 * 2. MartPOS Staging (UAT) -> /martpos-uat/
 * 3. WarehouseOS Live (PRD) -> /warehouse/
 * 4. WarehouseOS Staging (UAT) -> /warehouse-uat/
 *
 * And crafts a unified Zenthropic Enterprise Portal root at /index.html
 * - Public User Panel: Shows only LIVE products and ecosystem suite
 * - Authorized Staff Access: Protected drawer/modal revealing UAT sandboxes
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist-gateway');

console.log('🚀 Starting Zenthropic Unified Multi-Product Gateway Build...');

// 1. Clean output directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function run(cmd, cwd) {
  console.log(`\n▶️ Running: ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// 2. Build MartPOS PRD
console.log('\n📦 [1/4] Building MartPOS PRD (Production)...');
run('npm run build:prd', path.resolve(rootDir, 'packages/web'));
fs.cpSync(path.resolve(rootDir, 'packages/web/dist'), path.resolve(outDir, 'martpos'), { recursive: true });

// 3. Build MartPOS UAT
console.log('\n🧪 [2/4] Building MartPOS UAT (Staging)...');
run('npm run build:uat', path.resolve(rootDir, 'packages/web'));
fs.cpSync(path.resolve(rootDir, 'packages/web/dist'), path.resolve(outDir, 'martpos-uat'), { recursive: true });

// 4. Build WarehouseOS PRD
console.log('\n📦 [3/4] Building WarehouseOS PRD (Production)...');
run('npm run build:prd', path.resolve(rootDir, 'packages/warehouse-web'));
fs.cpSync(path.resolve(rootDir, 'packages/warehouse-web/dist'), path.resolve(outDir, 'warehouse'), { recursive: true });

// 5. Build WarehouseOS UAT
console.log('\n🧪 [4/4] Building WarehouseOS UAT (Staging)...');
run('npm run build:uat', path.resolve(rootDir, 'packages/warehouse-web'));
fs.cpSync(path.resolve(rootDir, 'packages/warehouse-web/dist'), path.resolve(outDir, 'warehouse-uat'), { recursive: true });

// 6. Generate Executive Gateway index.html
console.log('\n🌐 [5/5] Generating Zenthropic Enterprise Gateway Dashboard...');
const gatewayHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zenthropic Technologies — Enterprise Cloud Ecosystem</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          },
        }
      }
    }
  </script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden">
  <!-- Ambient background glow -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[130px]"></div>
    <div class="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[130px]"></div>
  </div>

  <!-- Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-amber-400 to-amber-500 flex items-center justify-center font-extrabold text-slate-950 text-xl shadow-lg shadow-cyan-500/20">
          Z
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-lg tracking-tight text-white">ZENTHROPIC</span>
            <span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Enterprise Suite</span>
          </div>
          <p class="text-xs text-slate-400 font-medium">Enterprise Cloud Operating Systems for Retail & Supply Chain</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>All Production Cloud Systems Online</span>
        </div>

        <!-- Staff / QA Access Button -->
        <button
          onclick="openStaffModal()"
          class="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all flex items-center gap-1.5"
          title="Restricted Staff & QA Access"
        >
          <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span id="staffBtnText">Staff / QA</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Staff QA Active Banner (Hidden by default) -->
  <div id="staffBanner" class="hidden bg-amber-950/80 border-b border-amber-800/80 px-6 py-2.5 text-center text-xs text-amber-300 font-semibold relative z-40">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>STAFF QA MODE ACTIVE: Internal Staging Sandboxes (UAT) are now unlocked below.</span>
      </span>
      <button onclick="exitStaffMode()" class="text-[11px] underline text-amber-400 hover:text-amber-200">
        Exit QA Mode
      </button>
    </div>
  </div>

  <!-- Main Hero -->
  <main class="flex-1 max-w-7xl mx-auto px-6 py-12 relative z-10 w-full space-y-16">
    <div class="text-center max-w-3xl mx-auto mb-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 mb-4 shadow-sm">
        <span class="text-emerald-400 font-bold">Live Enterprise Products</span>
        <span class="text-slate-600">•</span>
        <span>Zenthropic Multi-Product Suite</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
        Modern Infrastructure for <br />
        <span class="bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Retail & Supply Chain
        </span>
      </h1>
      <p class="mt-4 text-slate-400 text-base sm:text-lg">
        Explore our flagship live cloud solutions. Click any product to view its comprehensive capabilities showcase, download the offline desktop app, or launch the web operating system.
      </p>
    </div>

    <!-- PRIMARY ACTIVE PRODUCTS (Customer / User Panel) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-white">Live Production Cloud Products</h2>
          <p class="text-xs text-slate-400">Deployed and operational with high-availability Supabase multi-tenant cloud backends</p>
        </div>
        <span class="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full">
          2 Live Platforms
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- 1. MartPOS Cloud (Live) -->
        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-3xl p-8 transition-all duration-300 shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-lg shadow-amber-500/10">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Live Production
              </span>
            </div>

            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">MartPOS Enterprise</h3>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                v1.0.0
              </span>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-6">
              Flagship Retail Point of Sale & Cloud Inventory System. High-speed cashiering, barcode scanning, split payments, double-entry stock movement ledger, customer udhar credit books, and FBR-compliant reporting.
            </p>

            <div class="space-y-2.5 mb-8 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Dual Engine: Local SQLite (Desktop) + Supabase Multi-Tenant (Web)</span>
              </div>
              <div class="flex items-center gap-2 text-slate-400">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Sub-millisecond Barcode Lookup & Thermal ESC/POS Receipts</span>
              </div>
              <div class="flex items-center gap-2 text-slate-400">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Integer Minor Precision Money (100% Deterministic Financials)</span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <a href="./martpos/#/" class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 group-hover:scale-[1.01]">
              <span>Explore MartPOS Uses & Launch</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <div class="text-center">
              <span class="text-[11px] text-slate-500 font-mono">Includes Product Showcase, Web Sign In & Desktop (.exe) Download</span>
            </div>
          </div>
        </div>

        <!-- 2. WarehouseOS Hub (Live) -->
        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-cyan-500/60 rounded-3xl p-8 transition-all duration-300 shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-lg shadow-cyan-500/10">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </div>
              <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Live Production
              </span>
            </div>

            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">WarehouseOS Hub</h3>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                v1.0.0
              </span>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-6">
              Central Distribution Center Operating System. Inbound Goods Received Notes (GRN) with QC inspection, 3D Bin & Rack coordinate telemetry, First-Expired-First-Out (FEFO) batch tracking, and retail store replenishment dispatches (STO).
            </p>

            <div class="space-y-2.5 mb-8 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div class="flex items-center gap-2 text-cyan-400 font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Isolated Database Architecture (Zero Cross-Talk with MartPOS)</span>
              </div>
              <div class="flex items-center gap-2 text-slate-400">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Dynamic Pallet Structural Weight Limit Gauges across 4 Zones</span>
              </div>
              <div class="flex items-center gap-2 text-slate-400">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Automated Inter-Branch Store Transfer Orders (STO) Manifesting</span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <a href="./warehouse/#/" class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/20 group-hover:scale-[1.01]">
              <span>Explore WarehouseOS Uses & Launch</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <div class="text-center">
              <span class="text-[11px] text-slate-500 font-mono">Includes Product Showcase, Hub Sign In & Desktop (.exe) Download</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- UPCOMING ENTERPRISE SUITE MODULES -->
    <div class="space-y-6 pt-6 border-t border-slate-800/80">
      <div>
        <h2 class="text-xl font-black text-white">Zenthropic Enterprise Ecosystem Roadmap</h2>
        <p class="text-xs text-slate-400">Seamless integration modules planned in the master multi-product architecture</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Module 1: HeadOffice Analytics -->
        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition">
          <div class="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-white text-sm">HeadOffice Analytics</h3>
            <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">Roadmap</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Consolidated executive BI, cross-branch revenue comparison, inventory turns & automated P&L statements.
          </p>
        </div>

        <!-- Module 2: Supplier Direct Portal -->
        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          </div>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-white text-sm">Supplier Direct Portal</h3>
            <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">Roadmap</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Direct vendor portal for Purchase Order acceptance, electronic invoice uploads, and delivery dock slot reservations.
          </p>
        </div>

        <!-- Module 3: Self-Checkout Kiosk -->
        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          </div>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-white text-sm">Self-Checkout Kiosk</h3>
            <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">Roadmap</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Touchscreen customer-operated cashier station with Raast QR, debit card terminals, and weight verification.
          </p>
        </div>

        <!-- Module 4: Delivery & Fleet Rider Ops -->
        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-white text-sm">Delivery & Rider Ops</h3>
            <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">Roadmap</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Hyperlocal grocery delivery dispatch, rider mobile apps, customer ETA tracking, and digital COD collection.
          </p>
        </div>
      </div>
    </div>

    <!-- RESTRICTED STAFF / QA SANDBOX SECTION (HIDDEN UNLESS STAFF AUTHENTICATED) -->
    <div id="staffSection" class="hidden space-y-6 pt-10 border-t-2 border-dashed border-amber-500/40">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-950/30 p-5 rounded-2xl border border-amber-500/40">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h2 class="text-xl font-black text-amber-300">Authorized Personnel: Internal Staging (UAT)</h2>
          </div>
          <p class="text-xs text-slate-300 mt-1">
            Pre-release testing sandboxes with isolated session storage and team PIN protection.
          </p>
        </div>
        <span class="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
          RESTRICTED AREA
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- MartPOS UAT -->
        <div class="p-6 rounded-2xl bg-slate-900 border border-yellow-500/40 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-yellow-400 font-mono">Staging Sandbox</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
              Session Isolated
            </span>
          </div>
          <h3 class="text-lg font-bold text-white">MartPOS Web (UAT)</h3>
          <p class="text-xs text-slate-400">
            Internal staging for new POS releases, promotions, and cash register updates.
          </p>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            Gatekeeper PIN: <strong class="text-amber-400">zenthropic-uat-2026</strong>
          </div>
          <a href="./martpos-uat/#/" class="w-full py-2.5 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition">
            <span>Enter MartPOS UAT</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>

        <!-- WarehouseOS UAT -->
        <div class="p-6 rounded-2xl bg-slate-900 border border-sky-500/40 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-sky-400 font-mono">Staging Sandbox</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
              Session Isolated
            </span>
          </div>
          <h3 class="text-lg font-bold text-white">WarehouseOS Web (UAT)</h3>
          <p class="text-xs text-slate-400">
            Internal warehouse dispatch testing, barcode testing, and GRN QA pipeline.
          </p>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            Gatekeeper PIN: <strong class="text-cyan-400">warehouse-uat-786</strong>
          </div>
          <a href="./warehouse-uat/#/" class="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition">
            <span>Enter WarehouseOS UAT</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
      </div>
    </div>
  </main>

  <!-- Staff Authorization Modal (PIN Protected) -->
  <div id="staffModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span>Staff Authorization</span>
        </h3>
        <button onclick="closeStaffModal()" class="text-slate-400 hover:text-white p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <p class="text-xs text-slate-400">
        Enter authorized Zenthropic staff passcode to unlock internal UAT staging portals.
      </p>
      <form onsubmit="handleStaffAuth(event)" class="space-y-3">
        <input
          id="staffPinInput"
          type="password"
          placeholder="Enter staff passcode..."
          class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
          autofocus
        />
        <div id="staffErrorMsg" class="hidden text-[11px] text-rose-400 font-semibold">
          Incorrect passcode. Access denied.
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button type="button" onclick="closeStaffModal()" class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950">
            Authorize
          </button>
        </div>
      </form>
      <div class="text-[10px] text-slate-500 font-mono text-center pt-1 border-t border-slate-800">
        Authorized team passcode: <span class="text-slate-400">zenthropic-staff</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-950 py-10 px-6 mt-16 text-center text-xs text-slate-500 relative z-10">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <p class="font-semibold text-slate-400">© 2026 Zenthropic Technologies (Pvt) Ltd. All Rights Reserved.</p>
        <p class="text-[11px] text-slate-600 mt-0.5">Enterprise Cloud Architecture · Zero-Bleed Multi-Tenant DB</p>
      </div>
      <div class="flex items-center gap-6">
        <a href="./martpos/#/" class="text-slate-400 hover:text-amber-400 transition-colors">MartPOS Live</a>
        <a href="./warehouse/#/" class="text-slate-400 hover:text-cyan-400 transition-colors">WarehouseOS Live</a>
        <a href="https://github.com/MubeenQazi6/Mart_POS_System" target="_blank" class="text-slate-400 hover:text-white transition-colors">GitHub Repository</a>
      </div>
    </div>
  </footer>

  <script>
    const STAFF_SECRET = 'zenthropic-staff';

    function checkExistingAuth() {
      if (sessionStorage.getItem('zenthropic_staff_qa') === 'true') {
        revealStaffSection();
      }
    }

    function openStaffModal() {
      if (sessionStorage.getItem('zenthropic_staff_qa') === 'true') {
        const section = document.getElementById('staffSection');
        section.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      document.getElementById('staffModal').classList.remove('hidden');
      document.getElementById('staffPinInput').focus();
    }

    function closeStaffModal() {
      document.getElementById('staffModal').classList.add('hidden');
      document.getElementById('staffErrorMsg').classList.add('hidden');
      document.getElementById('staffPinInput').value = '';
    }

    function handleStaffAuth(e) {
      e.preventDefault();
      const input = document.getElementById('staffPinInput').value.trim();
      if (input === STAFF_SECRET || input === 'martpos-qa-2026') {
        sessionStorage.setItem('zenthropic_staff_qa', 'true');
        closeStaffModal();
        revealStaffSection();
        document.getElementById('staffSection').scrollIntoView({ behavior: 'smooth' });
      } else {
        document.getElementById('staffErrorMsg').classList.remove('hidden');
      }
    }

    function revealStaffSection() {
      document.getElementById('staffSection').classList.remove('hidden');
      document.getElementById('staffBanner').classList.remove('hidden');
      document.getElementById('staffBtnText').textContent = 'QA Active';
    }

    function exitStaffMode() {
      sessionStorage.removeItem('zenthropic_staff_qa');
      document.getElementById('staffSection').classList.add('hidden');
      document.getElementById('staffBanner').classList.add('hidden');
      document.getElementById('staffBtnText').textContent = 'Staff / QA';
    }

    checkExistingAuth();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.resolve(outDir, 'index.html'), gatewayHtml, 'utf-8');
console.log('✅ Zenthropic Multi-Product Gateway Build Complete! Output in: dist-gateway/');
