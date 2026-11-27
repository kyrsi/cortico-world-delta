/** Stock Coopanion integration. Consent belongs to this observation session. */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DeltaProductBinding } from './protocol.ts';
const execute = promisify(execFile);
export interface ObservationDisplay { id: string; primary: boolean; bounds: { x: number; y: number; width: number; height: number } }
export function officialHost(repoRoot: string) {
  if (process.platform !== 'win32') return undefined;
  const require = createRequire(join(repoRoot, 'package.json'));
  let native: string, loader: string;
  try {
    native = join(dirname(require.resolve('cortico-world-desktop-pet')), 'cua', 'engine', 'win32.ts');
    loader = pathToFileURL(require.resolve('tsx')).href;
    if (!existsSync(native)) return undefined;
  } catch { return undefined; }
  const nativeUrl = pathToFileURL(native).href;
  const module = new URL(import.meta.url.endsWith('.ts') ? './official-capture.ts' : './official-capture.js', import.meta.url);
  const source = new URL(module); source.searchParams.set('native', nativeUrl);
  let displayId = '', permitted = false, revision = 0;
  const binding: DeltaProductBinding = { version: 1, frameSourceModule: source.href,
    snapshot: () => ({ revision: String(revision), displayId, viewEnabled: true, observationEnabled: true,
      viewPermitted: permitted, corePaused: false, outputAvailable: true }) };
  return {
    binding,
    status: () => ({ permitted, displayId }),
    async displays(): Promise<ObservationDisplay[]> {
      const { stdout } = await execute(process.execPath, ['--import', loader, fileURLToPath(module), '--displays', nativeUrl],
        { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
      return JSON.parse(stdout);
    },
    async authorize(id: string) {
      const attempt = ++revision; permitted = false;
      if (!(await this.displays()).some(d => d.id === id)) throw new Error('Selected display is unavailable');
      if (revision !== attempt) throw new Error('Screen authorization was cancelled');
      displayId = id; permitted = true;
    },
    revoke() { permitted = false; revision++; },
  };
}
