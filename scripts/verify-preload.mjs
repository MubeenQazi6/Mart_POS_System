/**
 * Runtime verification: confirms preload exposes window.martpos and IPC works.
 * Run after build: node scripts/verify-preload.mjs
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const electronBin = join(
  projectRoot,
  'node_modules',
  'electron',
  'dist',
  process.platform === 'win32' ? 'electron.exe' : 'electron',
);

const successPattern = /\[verify\] window\.martpos=available appInfo=/;
const failurePattern = /\[verify\] window\.martpos=missing|\[main\] Preload error:/;

const child = spawn(electronBin, [projectRoot], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    MARTPOS_VERIFY_PRELOAD: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
const timeout = setTimeout(() => {
  console.error('[verify] Timed out waiting for preload verification');
  child.kill();
  process.exit(1);
}, 30000);

function handleLine(line) {
  process.stdout.write(`${line}\n`);
  output += `${line}\n`;

  if (successPattern.test(line)) {
    clearTimeout(timeout);
    child.kill();
    console.log('[verify] PASSED — preload API available and IPC responded');
    process.exit(0);
  }

  if (failurePattern.test(line)) {
    clearTimeout(timeout);
    child.kill();
    console.error('[verify] FAILED — preload API unavailable');
    process.exit(1);
  }
}

for (const stream of [child.stdout, child.stderr]) {
  const rl = createInterface({ input: stream });
  rl.on('line', handleLine);
}

child.on('exit', (code) => {
  clearTimeout(timeout);
  if (!successPattern.test(output)) {
    console.error('[verify] FAILED — exited without success signal', { code, output });
    process.exit(1);
  }
});
