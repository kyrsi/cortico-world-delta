import { closeSync, lstatSync, mkdirSync, openSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import metadata from '../package.json' with { type: 'json' };

const frameName = /^frame-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.png$/i;

/** Only ID calibration creates frames in this directory. Save also collects frames from prior app runs. */
export class IdentityDebugStore {
  private hasLog = false;
  private pendingFrames = false;
  constructor(private readonly dataDir?: string) {
    try {
      const dir = this.directory(false);
      this.hasLog = this.regularLog(dir);
      this.pendingFrames = this.frames(dir).length > 0;
    } catch { /* The first attempt creates the directory. */ }
  }
  state() { return { hasLog: this.hasLog, pendingFrames: this.pendingFrames }; }

  private directory(create: boolean): string {
    if (!this.dataDir) throw new Error('World data directory unavailable');
    let dir = resolve(this.dataDir);
    for (const component of ['worlds', 'delta', 'identity-debug']) {
      dir = join(dir, component);
      if (create && !lstatSync(dir, { throwIfNoEntry: false })) mkdirSync(dir, { mode: 0o700 });
      if (!lstatSync(dir).isDirectory()) throw new Error('Identity debug directory unavailable');
    }
    return dir;
  }
  private regularLog(dir: string): boolean {
    const stat = lstatSync(join(dir, 'attempts.jsonl'), { throwIfNoEntry: false });
    return !!stat && stat.isFile() && stat.nlink === 1;
  }
  private frames(dir: string) {
    return readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile() && frameName.test(entry.name));
  }
  logPath(): string {
    const dir = this.directory(false);
    if (!this.regularLog(dir)) throw new Error('Identity log unavailable');
    return join(dir, 'attempts.jsonl');
  }
  record(attemptId: string, event: { stage: string; [field: string]: unknown }): void {
    try {
      const dir = this.directory(true), path = join(dir, 'attempts.jsonl');
      const stat = lstatSync(path, { throwIfNoEntry: false });
      if (stat && (!stat.isFile() || stat.nlink !== 1)) return;
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      writeFileSync(path, JSON.stringify({ ...event, version: metadata.version, timestamp, attemptId }) + '\n',
        { flag: stat ? 'a' : 'wx', mode: 0o600 });
      this.hasLog = true;
    } catch { /* Diagnosis is optional when storage is unavailable. */ }
  }
  writeFrame(attemptId: string, png: Uint8Array): string | null {
    const name = `frame-${attemptId}.png`;
    if (!frameName.test(name)) return null;
    try {
      const path = join(this.directory(true), name);
      const fd = openSync(path, 'wx', 0o600);
      try {
        try { writeFileSync(fd, png); } finally { closeSync(fd); }
      } catch (error) {
        unlinkSync(path);
        throw error;
      }
      this.pendingFrames = true;
      return name;
    } catch { return null; }
  }
  clearFrames(): void {
    try {
      const dir = this.directory(false);
      let remaining = false;
      for (const entry of this.frames(dir)) {
        try { unlinkSync(join(dir, entry.name)); } catch { remaining = true; }
      }
      this.pendingFrames = remaining;
    } catch { /* Retain the last known state so cleanup can be retried. */ }
  }
}
