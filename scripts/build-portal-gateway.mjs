/**
 * Zenthropic Deployment Builder
 *
 * Deploys MartPOS directly to the root:
 * - Root (/) -> MartPOS Production (Landing Page -> Login/Register -> Full Web App)
 * - /martpos/ -> MartPOS Production mirror
 * - /martpos-uat/ -> Private UAT Staging (restricted via passcode, hidden from public UI)
 * - /warehouse/ -> WarehouseOS Production
 * - /warehouse-uat/ -> WarehouseOS UAT
 *
 * No intermediate gateway page is generated. Each product has its own dedicated landing page.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist-gateway');

console.log('🚀 Starting Zenthropic Production & Staging Build Pipeline...');

// 1. Clean output directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function run(cmd, cwd) {
  console.log(`\n▶️ Running: ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// 2. Build MartPOS PRD (Production)
console.log('\n📦 [1/4] Building MartPOS PRD (Production)...');
run('npm run build:prd', path.resolve(rootDir, 'packages/web'));

// Copy MartPOS PRD to root of outDir (so / loads MartPOS directly!)
console.log('📋 Deploying MartPOS PRD to root (/)...');
fs.cpSync(path.resolve(rootDir, 'packages/web/dist'), outDir, { recursive: true });

// Also mirror to /martpos/
console.log('📋 Deploying MartPOS PRD mirror to /martpos/...');
fs.cpSync(path.resolve(rootDir, 'packages/web/dist'), path.resolve(outDir, 'martpos'), { recursive: true });

// 3. Build MartPOS UAT (Staging) - Private sandbox URL, no public links
console.log('\n🧪 [2/4] Building MartPOS UAT (Private Staging)...');
run('npm run build:uat', path.resolve(rootDir, 'packages/web'));
fs.cpSync(path.resolve(rootDir, 'packages/web/dist'), path.resolve(outDir, 'martpos-uat'), { recursive: true });

// 4. Build WarehouseOS PRD (Production)
console.log('\n📦 [3/4] Building WarehouseOS PRD (Production)...');
run('npm run build:prd', path.resolve(rootDir, 'packages/warehouse-web'));
fs.cpSync(path.resolve(rootDir, 'packages/warehouse-web/dist'), path.resolve(outDir, 'warehouse'), { recursive: true });

// 5. Build WarehouseOS UAT (Staging)
console.log('\n🧪 [4/4] Building WarehouseOS UAT (Private Staging)...');
run('npm run build:uat', path.resolve(rootDir, 'packages/warehouse-web'));
fs.cpSync(path.resolve(rootDir, 'packages/warehouse-web/dist'), path.resolve(outDir, 'warehouse-uat'), { recursive: true });

console.log('\n✅ Build complete!');
console.log('--------------------------------------------------');
console.log('Live Deployments:');
console.log('  • MartPOS Root (PRD):       / (Direct Landing -> Login -> App)');
console.log('  • MartPOS Mirror (PRD):     /martpos/');
console.log('  • MartPOS Private UAT:      /martpos-uat/ (Hidden, Passcode Protected)');
console.log('  • WarehouseOS (PRD):        /warehouse/');
console.log('  • WarehouseOS Private UAT:  /warehouse-uat/ (Hidden, Passcode Protected)');
console.log('--------------------------------------------------');
