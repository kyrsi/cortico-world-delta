import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { DeltaCapture } from './engine-ipc.ts';
import { DELTA_REVEAL_MAX_SCREENSHOTS } from './limits.ts';

const revealName = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-(?:preview|full|crop)-[\da-f]{64}\.jpg$/;

export interface ScreenshotReveal {
  directory: string;
  open(filePath: string): Promise<void> | void;
  maxFiles?: number;
}

export function openScreenshotInFolder(filePath: string): Promise<void> {
  const windows = process.platform === 'win32';
  const command = windows ? join(process.env.SystemRoot ?? 'C:\\Windows', 'explorer.exe')
    : process.platform === 'darwin' ? '/usr/bin/open' : '/usr/bin/xdg-open';
  // Explorer parses its /select option and quoted path as a single argument.
  const args = windows ? [`/select,"${filePath}"`] : process.platform === 'darwin' ? ['-R', filePath] : [dirname(filePath)];
  return new Promise<void>((done, fail) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: windows });
    child.once('error', fail);
    child.once('spawn', () => { child.unref(); done(); });
  });
}

export async function revealCapture(options: ScreenshotReveal, capture: DeltaCapture, part: 'preview' | 'full' | 'crop'): Promise<void> {
  const directory = resolve(options.directory);
  const stamp = new Date(capture.frame.capturedAt).toISOString().replaceAll(':', '-');
  const bytes = Buffer.from(capture.jpeg.buffer, capture.jpeg.byteOffset, capture.jpeg.byteLength);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const filePath = join(directory, `${stamp}-${part}-${digest}.jpg`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!lstatSync(directory).isDirectory()) throw new Error('Screenshot directory is unavailable');

  const existing = lstatSync(filePath, { throwIfNoEntry: false });
  if (existing) {
    if (!existing.isFile() || existing.size !== bytes.byteLength || !bytes.equals(readFileSync(filePath))) throw new Error('Screenshot file has changed');
  } else {
    const temporary = join(directory, `.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
      renameSync(temporary, filePath);
    } catch (error) {
      try { unlinkSync(temporary); } catch { /* The temporary file may not have been created. */ }
      throw error;
    }
  }
  pruneRevealDirectory(directory, basename(filePath), options.maxFiles ?? DELTA_REVEAL_MAX_SCREENSHOTS);
  await options.open(filePath);
}

function pruneRevealDirectory(directory: string, keepName: string, maxFiles: number): void {
  const ranked: { name: string; mtimeMs: number }[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !revealName.test(entry.name)) continue;
    const stat = lstatSync(join(directory, entry.name), { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.nlink !== 1) continue;
    ranked.push({ name: entry.name, mtimeMs: stat.mtimeMs });
  }
  ranked.sort((a, b) => a.mtimeMs - b.mtimeMs || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  let extras = ranked.length - maxFiles;
  for (const item of ranked) {
    if (extras <= 0) break;
    if (item.name === keepName) continue;
    extras--;
    try {
      const path = join(directory, item.name);
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.nlink !== 1) continue;
      unlinkSync(path);
    } catch { /* Leave a file that cannot be removed. */ }
  }
}
