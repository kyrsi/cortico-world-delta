import { lstatSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/** Keep the newest `maxFiles` regular single-link names matching `pattern`. `keepName` stays. */
export function retainNewestFiles(directory: string, pattern: RegExp, keepName: string, maxFiles: number): void {
  const ranked: { name: string; mtimeMs: number }[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !pattern.test(entry.name)) continue;
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
