import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve preload script path for the current build output.
 * With `"type": "module"`, electron-vite emits preload as `index.mjs` (not `.js`).
 * @see https://electron-vite.org/guide/dev
 */
function resolvePreloadPath(): string {
  const baseDir = fileURLToPath(new URL('.', import.meta.url));
  const candidates = ['index.mjs', 'index.js'] as const;

  for (const filename of candidates) {
    const candidatePath = join(baseDir, '..', 'preload', filename);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  // Fallback for clearer startup diagnostics if neither file exists yet.
  return join(baseDir, '..', 'preload', 'index.mjs');
}

export const MAIN_DIST = fileURLToPath(new URL('..', import.meta.url));
export const PRELOAD_PATH = resolvePreloadPath();
export const RENDERER_URL =
  process.env.ELECTRON_RENDERER_URL ??
  fileURLToPath(new URL('../renderer/index.html', import.meta.url));
