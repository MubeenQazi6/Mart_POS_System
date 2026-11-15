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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f0fdfa',
              500: '#14b8a6',
              600: '#0d9488',
              900: '#134e4a',
            }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
  <!-- Ambient background glow -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px]"></div>
    <div class="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]"></div>
  </div>

  <!-- Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center font-extrabold text-slate-950 text-xl shadow-lg shadow-cyan-500/20">
          Z
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-lg tracking-tight text-white">ZENTHROPIC</span>
            <span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Cloud Gateway</span>
          </div>
          <p class="text-xs text-slate-400 font-medium">Enterprise Multi-Product Suite & Ecosystem Hub</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>All Systems Operational</span>
        </div>
        <a href="https://github.com/MubeenQazi6/Mart_POS_System" target="_blank" class="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
          <span>GitHub Repo</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Hero -->
  <main class="flex-1 max-w-7xl mx-auto px-6 py-12 relative z-10 w-full">
    <div class="text-center max-w-3xl mx-auto mb-14">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 mb-4 shadow-sm">
        <span class="text-amber-400 font-bold">UAT & Production</span>
        <span class="text-slate-600">•</span>
        <span>Zero-Bleed Database Isolation</span>
      </div>
      <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
        Active Applications & Staging Portals
      </h1>
      <p class="mt-4 text-slate-400 text-base sm:text-lg">
        Direct web access to live production environments and testing sandboxes for the Zenthropic ecosystem.
      </p>
    </div>

    <!-- 2x2 Grid of Product Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">

      <!-- 1. MartPOS Cloud (PRD) -->
      <div class="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-7 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between mb-5">
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Production
            </span>
          </div>

          <h2 class="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">MartPOS Cloud</h2>
          <p class="text-sm text-slate-400 mt-2 mb-6">
            1:1 Cloud edition of the flagship Mart POS & Inventory desktop system. Complete POS cashiering, barcode scanning, catalog, stock management, and financial reporting.
          </p>

          <div class="space-y-2 mb-6 text-xs text-slate-300">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Multi-Tenant Supabase Cloud DB</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Instant Cashier POS + Receipt Generation</span>
            </div>
          </div>
        </div>

        <a href="./martpos/#/" class="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 group-hover:translate-y-[-1px]">
          <span>Launch MartPOS Live</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- 2. MartPOS Cloud (UAT) -->
      <div class="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-yellow-500/50 rounded-2xl p-7 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/10 flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between mb-5">
            <div class="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              UAT Staging Sandbox
            </span>
          </div>

          <h2 class="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors">MartPOS (UAT)</h2>
          <p class="text-sm text-slate-400 mt-2 mb-6">
            Internal Quality Assurance and pre-release testing portal. Protected by the Zenthropic UAT Gatekeeper with isolated session storage.
          </p>

          <div class="p-3 bg-yellow-950/20 border border-yellow-500/20 rounded-xl mb-6 text-xs text-yellow-300">
            <span class="font-bold">Team PIN:</span> <code class="bg-slate-900 px-2 py-0.5 rounded text-white font-mono">zenthropic-uat-2026</code>
          </div>
        </div>

        <a href="./martpos-uat/#/" class="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-700">
          <span>Enter MartPOS UAT</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- 3. WarehouseOS Hub (PRD) -->
      <div class="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-7 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between mb-5">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Production
            </span>
          </div>

          <h2 class="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">WarehouseOS Hub</h2>
          <p class="text-sm text-slate-400 mt-2 mb-6">
            Enterprise supply chain portal for central distribution centers. Inbound Goods Received Notes (GRN), 3D bin coordinate tracking, batch lots, and branch stock transfers.
          </p>

          <div class="space-y-2 mb-6 text-xs text-slate-300">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Dedicated Warehouse Schema (Zero MartPOS Conflict)</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Multi-Role Personnel Login & Quick Demo Bar</span>
            </div>
          </div>
        </div>

        <a href="./warehouse/#/" class="w-full py-3.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 group-hover:translate-y-[-1px]">
          <span>Launch WarehouseOS Live</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- 4. WarehouseOS Hub (UAT) -->
      <div class="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-7 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-sky-500/10 flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between mb-5">
            <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <span class="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              UAT Staging Sandbox
            </span>
          </div>

          <h2 class="text-2xl font-bold text-white group-hover:text-sky-400 transition-colors">WarehouseOS (UAT)</h2>
          <p class="text-sm text-slate-400 mt-2 mb-6">
            Supply chain sandbox for dry-run receiving, bin allocation simulations, and carrier dispatch verification.
          </p>

          <div class="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl mb-6 text-xs text-sky-300">
            <span class="font-bold">Team PIN:</span> <code class="bg-slate-900 px-2 py-0.5 rounded text-white font-mono">warehouse-uat-786</code>
          </div>
        </div>

        <a href="./warehouse-uat/#/" class="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-700">
          <span>Enter WarehouseOS UAT</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

    </div>

    <!-- Upcoming Ecosystem Products Footer -->
    <div class="border-t border-slate-800 pt-10">
      <h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-6 text-center">
        Upcoming Zenthropic Ecosystem Modules
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div class="text-sm font-bold text-slate-300">CampusIQ</div>
          <div class="text-xs text-slate-500 mt-0.5">University ERP + Moodle App</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div class="text-sm font-bold text-slate-300">SchoolIQ</div>
          <div class="text-xs text-slate-500 mt-0.5">School Management ERP</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div class="text-sm font-bold text-slate-300">HREdge</div>
          <div class="text-xs text-slate-500 mt-0.5">Payroll, EOBI & Shifts</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div class="text-sm font-bold text-slate-300">LedgerX</div>
          <div class="text-xs text-slate-500 mt-0.5">Double-Entry Accounting & FBR</div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 relative z-10">
    <p>© 2026 Zenthropic Technologies (Pvt) Ltd. All Rights Reserved. CEO: Mubeen Qazi.</p>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.resolve(outDir, 'index.html'), gatewayHtml, 'utf8');
console.log('✅ Zenthropic Multi-Product Gateway Build Complete! Output in: dist-gateway/');
