/** Owns one capture process and its ready/heartbeat deadlines. Recovery belongs to the World. */
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { childExecArgv } from 'cortico/extensions/runtime.ts';
import type { Logger } from 'cortico/core/types.ts';
import type { CalibrationWorkerRequest, CalibrationWorkerResult, ChildToMain, DeltaWorkerSettings, IdentityDebugProgress, IdentityProgressSink, MainToChild } from './engine-ipc.ts';
import type { DeltaReason } from './protocol.ts';

function launchEngine(output: 'pipe' | 'ignore'): ChildProcess {
  return fork(fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? './engine-child.ts' : './engine-child.js', import.meta.url)), [], {
    execArgv: childExecArgv(), serialization: 'advanced', stdio: ['ignore', output, output, 'ipc'],
  });
}

export async function runCalibrationOperation(request: CalibrationWorkerRequest, signal: AbortSignal, progress?: IdentityProgressSink): Promise<CalibrationWorkerResult> {
  const failure = (reason: string) => ({ status: 'capture-unavailable' as const, ...(request.kind === 'identity-suggest' && { reason }) });
  if (signal.aborted) return failure('cancelled');
  try {
    const child = launchEngine('ignore');
    return await new Promise<CalibrationWorkerResult>((resolve) => {
      let settled = false;
      const finish = (result: CalibrationWorkerResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', cancelled);
        child.kill();
        resolve(result);
      };
      const unavailable = () => finish(failure('worker-failed'));
      const cancelled = () => finish(failure('cancelled'));
      const timer = setTimeout(() => finish(failure('worker-timeout')), request.kind === 'calibration-source' ? 5000 : 25_000);
      signal.addEventListener('abort', cancelled, { once: true });
      child.on('message', (message: CalibrationWorkerResult | IdentityDebugProgress) => {
        if (settled) return;
        if ('status' in message) finish(message);
        else if (request.kind === 'identity-suggest') progress?.(message);
      });
      child.once('error', unavailable);
      child.once('exit', unavailable);
      try { child.send({ ...request, identityDebug: request.kind === 'identity-suggest' && !!progress }, (error) => { if (error) unavailable(); }); }
      catch { unavailable(); }
    });
  } catch { return failure('worker-failed'); }
}

export class DeltaWorker {
  private child: ChildProcess | null = null;
  private timer: NodeJS.Timeout | null = null;
  private closed = false;
  private ready = false;
  heartbeatAt: string | null = null;
  constructor(private readonly options: {
    generation: number; settings: DeltaWorkerSettings; heartbeatTimeoutMs: number;
    message(message: ChildToMain): void; failed(reason: DeltaReason): void; log: Logger;
  }) {}
  get pid(): number | null { return this.child?.pid ?? null; }
  start(): void {
    const child = launchEngine('pipe');
    this.child = child;
    const forward = (bytes: Buffer) => { for (const line of bytes.toString().split(/\r?\n/)) if (line.trim()) this.options.log.warn(line); };
    child.stdout?.on('data', forward); child.stderr?.on('data', forward);
    child.on('message', (message: ChildToMain) => {
      if (this.closed || message.generation !== this.options.generation) return;
      if (message.kind === 'ready') this.ready = true;
      if (message.kind === 'ready' || message.kind === 'heartbeat') {
        this.heartbeatAt = new Date().toISOString();
        this.deadline(this.options.heartbeatTimeoutMs);
      }
      this.options.message(message);
    });
    child.once('error', (error) => { this.options.log.warn(error.message); this.fail('worker-failed'); });
    child.once('exit', (code, signal) => { if (!this.closed) this.options.log.warn(`Capture process exited: code=${code}, signal=${signal}`); this.fail('worker-failed'); });
    // Loader startup is separate from ready-state heartbeat liveness.
    this.deadline(Math.max(10_000, this.options.heartbeatTimeoutMs));
    this.send({ kind: 'start', version: 1, generation: this.options.generation, settings: this.options.settings });
  }
  private deadline(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail(this.ready ? 'heartbeat-timeout' : 'worker-failed'), ms);
    this.timer.unref();
  }
  private fail(reason: DeltaReason): void {
    if (this.closed) return;
    this.options.failed(reason);
  }
  send(message: MainToChild): void { if (this.child?.connected && !this.closed) this.child.send(message); }
  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    const child = this.child; this.child = null;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise<void>((done) => child.once('exit', () => done()));
    if (child.connected) child.send({ kind: 'stop' } satisfies MainToChild);
    const timeout = setTimeout(() => { child.kill(); }, 300);
    await Promise.race([exited, new Promise<void>((done) => setTimeout(done, 1000))]);
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill();
  }
}
