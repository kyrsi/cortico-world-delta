import { closeSync, lstatSync, mkdirSync, openSync, readdirSync, renameSync, unlinkSync, writeFileSync, type Stats } from 'node:fs';
import { join, resolve } from 'node:path';
import metadata from '../package.json' with { type: 'json' };
import { DELTA_IDENTITY_DEBUG_MAX_FRAMES, DELTA_IDENTITY_DEBUG_MAX_LOG_BYTES } from './limits.ts';
import { retainNewestFiles } from './retain-files.ts';

const frameName = /^frame-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.png$/i;
const logName = 'attempts.jsonl';
const previousLogName = 'attempts.1.jsonl';

export interface IdentityDebugLimits {
  maxFrames?: number;
  maxLogBytes?: number;
}

/** Only ID calibration creates frames in this directory. Save also collects frames from prior app runs. */
export class IdentityDebugStore {
  private hasLog = false;
  private pendingFrames = false;
  private readonly maxFrames: number;
  private readonly maxLogBytes: number;
  constructor(private readonly dataDir?: string, limits: IdentityDebugLimits = {}) {
    this.maxFrames = limits.maxFrames ?? DELTA_IDENTITY_DEBUG_MAX_FRAMES;
    this.maxLogBytes = limits.maxLogBytes ?? DELTA_IDENTITY_DEBUG_MAX_LOG_BYTES;
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
    return !!this.regularStat(join(dir, logName));
  }
  /** `null` when the path is absent, `false` when it is not a regular file with one link. */
  private regularStat(path: string): Stats | false | null {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat) return null;
    return stat.isFile() && stat.nlink === 1 ? stat : false;
  }
  private frames(dir: string) {
    return readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile() && frameName.test(entry.name));
  }
  logPath(): string {
    const dir = this.directory(false);
    if (!this.regularLog(dir)) throw new Error('Identity log unavailable');
    return join(dir, logName);
  }
  record(attemptId: string, event: { stage: string; [field: string]: unknown }): void {
    try {
      const dir = this.directory(true), path = join(dir, logName);
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const line = JSON.stringify({ ...event, version: metadata.version, timestamp, attemptId }) + '\n';
      let stat = this.regularStat(path);
      if (stat === false) return;
      if (stat && stat.size + Buffer.byteLength(line) > this.maxLogBytes) {
        const archived = join(dir, previousLogName);
        const previous = this.regularStat(archived);
        if (previous === false) return;
        if (previous) unlinkSync(archived);
        stat = this.regularStat(path);
        if (!stat) return;
        renameSync(path, archived);
        stat = null;
      }
      writeFileSync(path, line, { flag: stat ? 'a' : 'wx', mode: 0o600 });
      this.hasLog = true;
    } catch { /* Diagnosis is optional when storage is unavailable. */ }
  }
  writeFrame(attemptId: string, png: Uint8Array): string | null {
    const name = `frame-${attemptId}.png`;
    if (!frameName.test(name)) return null;
    try {
      const dir = this.directory(true);
      const path = join(dir, name);
      const fd = openSync(path, 'wx', 0o600);
      try {
        try { writeFileSync(fd, png); } finally { closeSync(fd); }
      } catch (error) {
        unlinkSync(path);
        throw error;
      }
      this.pruneFrames(dir, name);
      return name;
    } catch { return null; }
  }
  private pruneFrames(dir: string, keepName: string): void {
    try {
      retainNewestFiles(dir, frameName, keepName, this.maxFrames);
      this.pendingFrames = this.frames(dir).length > 0;
    } catch { this.pendingFrames = true; }
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
