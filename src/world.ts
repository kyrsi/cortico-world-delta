/** A bounded observation queue connects an independent capture process to Core's deferred events. */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Language } from 'cortico/core/language.ts';
import type { EventEnvelope, OutputTap, RunPhase, World, WorldWebUiDecl, WorldHost } from 'cortico/core/types.ts';
import type { DeepPartial } from 'cortico/world.ts';
import type { CuaDisplay, CuaFrame } from 'cortico-world-desktop-pet';
import { CALIBRATION_PREVIEW_MS, calibrationRegions, sameCalibrationSource } from './calibration.ts';
import { captureRectangle } from './roi.ts';
import { DELTA_DEFAULTS, deltaConfigGroups, type DeltaConfigSection } from './config.ts';
import { DELTA_CONTROL_INTERVAL_MS, DELTA_MAX_JPEG_BYTES } from './limits.ts';
import { detectionStatus, matchesCalibration } from './detector.ts';
import { jpegSize } from './jpeg-size.ts';
import { deltaText } from './i18n/index.ts';
import { EventQueue } from './event-queue.ts';
import { KnowledgeStore } from './knowledge-store.ts';
import { IdentityDebugStore } from './identity-debug.ts';
import { invokePanel, type DeltaPanelHost } from './panel-rpc.ts';
import { DeltaWorker, runCalibrationOperation } from './proxy.ts';
import { openScreenshotInFolder, revealCapture, type ScreenshotReveal } from './screenshot-reveal.ts';
import { startupCheck } from './startup-check.ts';
import { windowsCalibrationHotkey } from './standalone-hotkey.ts';
import { lootCalibrationFitsBudget, lootNamespace, lootStatus, validLootSignature } from './loot-detector.ts';
import type { CalibrationWorkerRequest, CalibrationWorkerResult, ChildToMain, DeltaCapture, IdentityProgressSink } from './engine-ipc.ts';
import { DEFAULT_GAME_ASPECT_RATIO, isGameAspectRatio, type DeltaCalibrationRegions, type DeltaGameAspectRatio } from './protocol.ts';
import type { DeltaBindingSnapshot, DeltaCalibrationApplyRequest, DeltaCalibrationHotkeyState, DeltaCalibrationSuggestion, DeltaDetectionState, DeltaDropReason, DeltaIntent, DeltaLootConfig, DeltaLootState, DeltaProductBinding, DeltaReason, DeltaSimulateRequest, DeltaSimulationReceipt, DeltaSpeechConfig, DeltaState } from './protocol.ts';

interface Simulation { id: string; resolve(receipt: DeltaSimulationReceipt): void; timer: NodeJS.Timeout }
interface CalibrationPreview {
  capture: DeltaCapture;
  regions: Partial<DeltaCalibrationRegions> | null;
  revision: string;
  expiresAtMs: number;
  attemptId?: string;
}
type HotkeyAttempt = NonNullable<DeltaCalibrationHotkeyState['attempt']> & { expiresAtMs: number };
interface HotkeyLease {
  status: 'registering' | 'registered' | 'occupied' | 'unavailable';
  release?: () => void;
}
const HOTKEY_REPEAT_MS = 750;
const CALIBRATION_GRANT_MS = 600_000;
interface StandaloneSource {
  frameSourceModule: string;
  listDisplays(): Promise<CuaDisplay[]>;
  calibrationHotkey?: DeltaProductBinding['calibrationHotkey'];
}
type CapturePolicy = Omit<DeltaBindingSnapshot, 'corePaused' | 'outputAvailable'> &
  Partial<Pick<DeltaBindingSnapshot, 'corePaused' | 'outputAvailable'>>;
const standaloneModule = new URL(import.meta.url.endsWith('.ts') ? './standalone-capture.ts' : './standalone-capture.js', import.meta.url).href;
const windowsCapture: StandaloneSource = {
  frameSourceModule: standaloneModule,
  calibrationHotkey: windowsCalibrationHotkey,
  async listDisplays() { return (await import(standaloneModule)).listDisplays(); },
};
export interface DeltaWorldOptions {
  cfg: DeltaConfigSection; persist(patch: DeepPartial<DeltaConfigSection>): void;
  binding?: DeltaProductBinding; frameSourceModule?: string; modelLanguage?(): 'zh' | 'en';
  standalone?: StandaloneSource;
  calibrationOperation?: typeof runCalibrationOperation;
  screenshotReveal?: Partial<ScreenshotReveal>;
  dataDir?: string;
  random?(): number;
}

export class DeltaWorld implements World {
  readonly id = 'delta';
  private host: WorldHost | null = null;
  private binding?: DeltaProductBinding;
  private readonly standalone?: StandaloneSource;
  private grantedDisplayId: string | null = null;
  private pendingGrant: { calibrationOnly: boolean } | null = null;
  private calibrationGrant: { displayId: string; expiresAt: number } | null = null;
  private unsubscribe: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;
  private worker: DeltaWorker | null = null;
  private generation = 0;
  private intent: DeltaIntent = 'stopped';
  private phase: DeltaState['phase'] = 'stopped';
  private reason: DeltaReason | null = 'stopped';
  private policyKey: string | null = null;
  private calibrationPolicyKey: string | null = null;
  private sourceKey: string | null = null;
  private frame: CuaFrame | null = null;
  private captures = 0;
  private restarts = 0;
  private retryAt = 0;
  private exhausted = false;
  private runIdle = true;
  private readonly queue: EventQueue;
  private simulations = new Map<number, Simulation>();
  private requestSequence = 0;
  private stopping = new Set<Promise<void>>();
  private detectorState: Omit<DeltaDetectionState, 'config'> | null = null;
  private lootState: Omit<DeltaLootState, 'config'> | null = null;
  private preview: { capture: DeltaCapture; generation: number; expiresAtMs: number; aspectRatio: DeltaGameAspectRatio; calibrationRevision?: string } | null = null;
  private previewRequests = new Map<number, { resolve(capture: DeltaCapture | null): void; timer: NodeJS.Timeout }>();
  private calibrationPreview: CalibrationPreview | null = null;
  private calibrationRequest: { controller: AbortController; kind: CalibrationWorkerRequest['kind']; attemptId?: string } | null = null;
  private calibrationHotkeyLease: HotkeyLease | null = null;
  private calibrationHotkeyAttempt: HotkeyAttempt | null = null;
  private calibrationLastPressMs = -Infinity;
  private readonly knowledge: KnowledgeStore;
  private readonly identityDebug: IdentityDebugStore;
  private identitySaveRevision = 0;
  private readonly screenshotReveal: ScreenshotReveal | null;
  constructor(private readonly options: DeltaWorldOptions) {
    this.binding = options.binding; this.knowledge = new KnowledgeStore(options.dataDir);
    this.identityDebug = new IdentityDebugStore(options.dataDir);
    this.standalone = options.standalone ?? (process.platform === 'win32' ? windowsCapture : undefined);
    const directory = options.screenshotReveal?.directory ?? (options.dataDir ? join(options.dataDir, 'worlds', this.id, 'screenshots') : null);
    this.screenshotReveal = directory ? { directory, open: options.screenshotReveal?.open ?? openScreenshotInFolder } : null;
    this.queue = new EventQueue({
      frame: () => this.frame,
      generation: () => this.generation,
      phase: () => this.phase,
      detection: () => this.options.cfg.detection,
      lootCalibration: () => this.lootConfig().calibration,
      ttlMs: () => this.options.cfg.events.ttlMs,
      dedupMs: () => this.options.cfg.events.dedupMs,
      maxPending: () => this.options.cfg.events.maxPending,
      speech: () => this.speechConfig(),
      random: () => this.options.random ?? Math.random,
      hasHost: () => this.host !== null,
      idle: () => this.runIdle,
      blocked: () => this.blocked(this.snapshot()) !== null,
      modelLanguage: () => this.options.modelLanguage?.() ?? this.binding?.modelLanguage?.() ?? 'zh',
      knowledge: () => this.knowledge.current(),
      knowledgeSource: () => this.knowledge.state().source,
      reconcile: () => this.reconcile(),
      expire: () => this.expire(),
      pushDeferred: (meta, render) => { this.host!.pushDeferred({ type: 'delta.observation', senderKey: 'delta.observation', meta, render }, { trigger: 'debounce' }); },
    });
  }
  private lootConfig(): DeltaLootConfig { return { ...DELTA_DEFAULTS.loot, ...this.options.cfg.loot }; }
  private speechConfig(): DeltaSpeechConfig {
    const config = { ...DELTA_DEFAULTS.speech, ...this.options.cfg.speech };
    const events = { ...DELTA_DEFAULTS.speech.events, ...config.events };
    const attribution = { ...DELTA_DEFAULTS.speech.attribution, ...config.attribution };
    return { enabled: config.enabled, probability: config.probability, cooldownMs: config.cooldownMs, style: config.style,
      eventKinds: (['kill', 'knockdown', 'loot'] as const).filter(kind => events[kind]),
      relations: (['self', 'teammate', 'unknown'] as const).filter(relation => attribution[relation]) };
  }
  envPromptVars(): null { return null; }
  tools(): [] { return []; }
  outputTap(): OutputTap {
    return { externalizes: () => false, onEvent: (event) => {
      if (event.type === 'response.output_text.delta' || event.type === 'response.refusal.delta'
        || (event.type === 'response.output_item.added' && event.item?.type === 'function_call')
        || event.type === 'response.function_call_arguments.delta') this.queue.noteActivity(Date.now());
    } };
  }
  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.queue.resetClock();
    this.bindProduct(this.binding);
    this.timer = setInterval(() => this.reconcile(), DELTA_CONTROL_INTERVAL_MS);
    this.timer.unref();
    this.reconcile();
  }
  async stop(): Promise<void> {
    this.host = null;
    this.pendingGrant = null; this.calibrationGrant = null; this.grantedDisplayId = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribe?.(); this.unsubscribe = null;
    this.releaseCalibrationHotkey();
    this.clearCalibration();
    this.intent = 'stopped';
    this.invalidate('policy-changed');
    this.queue.clearWake();
    this.phase = 'stopped'; this.reason = 'stopped';
    await Promise.all(this.stopping);
  }
  bindProduct(binding?: DeltaProductBinding): void {
    if (binding && binding.version !== 1) throw new Error(deltaText().errors.invalidBinding);
    this.unsubscribe?.(); this.unsubscribe = null;
    this.releaseCalibrationHotkey();
    this.clearCalibration();
    this.binding = binding;
    this.pendingGrant = null; this.calibrationGrant = null; this.grantedDisplayId = null;
    this.intent = binding && this.options.cfg.observer.enabled ? 'running' : 'stopped';
    this.policyKey = null;
    this.calibrationPolicyKey = null;
    this.invalidate('policy-changed');
    if (this.host) this.unsubscribe = binding?.subscribe?.(() => this.reconcile()) ?? null;
    this.reconcile();
  }
  private snapshot(): CapturePolicy | null {
    if (this.binding) return this.binding.snapshot();
    if (!this.standalone) return null;
    const displayId = this.options.cfg.standaloneDisplayId ?? '';
    return { revision: displayId, displayId, viewEnabled: true, observationEnabled: true,
      viewPermitted: this.grantedDisplayId !== null && this.grantedDisplayId === displayId };
  }
  private frameSourceModule(): string {
    if (!this.binding && this.standalone) return this.standalone.frameSourceModule;
    return this.options.frameSourceModule ?? this.binding?.frameSourceModule ?? 'cortico-world-desktop-pet/capture';
  }
  private blocked(snapshot: CapturePolicy | null): DeltaReason | null {
    if (!snapshot) return 'unbound';
    if (!snapshot.viewEnabled) return 'view-disabled';
    if (!snapshot.observationEnabled) return 'observation-disabled';
    if (this.binding && !snapshot.viewPermitted) return 'view-permission';
    if (snapshot.corePaused) return 'core-paused';
    if (snapshot.outputAvailable === false) return 'no-output';
    if (!this.host?.modelFacts.accepts('image/jpeg')) return 'no-image-model';
    return snapshot.viewPermitted ? null : 'view-permission';
  }
  private reconcile(): void {
    if (!this.host) return;
    const now = Date.now();
    if (this.preview && this.preview.aspectRatio !== this.gameAspectRatio()) this.preview = null;
    if (this.calibrationPreview && this.calibrationPreview.expiresAtMs <= now) this.calibrationPreview = null;
    if (this.calibrationHotkeyAttempt && this.calibrationHotkeyAttempt.expiresAtMs <= now) this.clearCalibrationHotkeyAttempt();
    const cfg = this.options.cfg;
    if (this.calibrationGrant && (!cfg.enabled || now >= this.calibrationGrant.expiresAt
      || this.calibrationGrant.displayId !== cfg.standaloneDisplayId)) this.revokeCalibrationGrant();
    if (!cfg.enabled) {
      this.pendingGrant = null; this.grantedDisplayId = null; this.intent = 'stopped';
    } else if (this.binding) {
      if (cfg.observer.enabled) this.intent = 'running';
      else if (this.intent === 'running') this.intent = 'stopped';
    } else if (this.grantedDisplayId !== null && this.grantedDisplayId !== cfg.standaloneDisplayId) {
      this.grantedDisplayId = null; this.intent = 'stopped';
    }
    const snapshot = this.snapshot();
    const loot = this.lootConfig();
    const calibrationKey = JSON.stringify([snapshot, cfg.enabled, cfg.detection.language, cfg.detection.calibration, loot.calibration, this.gameAspectRatio()]);
    if (this.calibrationPolicyKey !== null && calibrationKey !== this.calibrationPolicyKey) this.clearCalibration();
    this.calibrationPolicyKey = calibrationKey;
    const key = JSON.stringify([snapshot, cfg.enabled, cfg.captureIntervalMs, cfg.worker, cfg.detection, loot]);
    if (this.policyKey !== null && key !== this.policyKey) {
      this.invalidate('policy-changed'); this.retryAt = 0;
    }
    this.policyKey = key;
    this.reconcileCalibrationHotkey(snapshot);
    const reason = this.blocked(snapshot);
    if (!snapshot) { this.phase = 'unbound'; this.reason = 'unbound'; return; }
    if (this.intent !== 'running') {
      if (this.worker) this.invalidate('policy-changed');
      this.phase = 'stopped'; this.reason = this.intent === 'paused' ? 'paused' : 'stopped'; return;
    }
    if (reason) {
      if (this.worker || this.queue.imageCount() || this.queue.pendingCount()) this.invalidate('policy-changed');
      this.phase = 'blocked'; this.reason = reason; return;
    }
    if (this.exhausted) { this.phase = 'error'; return; }
    if (!this.worker && this.stopping.size === 0 && Date.now() >= this.retryAt) this.spawn(snapshot);
    this.expire();
    this.queue.scheduleWake();
  }
  private spawn(snapshot: CapturePolicy): void {
    const generation = ++this.generation;
    this.phase = 'starting'; this.reason = null;
    const worker = new DeltaWorker({ generation,
      settings: { displayId: snapshot.displayId, frameSourceModule: this.frameSourceModule(),
        captureIntervalMs: this.options.cfg.captureIntervalMs, heartbeatMs: this.options.cfg.worker.heartbeatMs, detection: structuredClone(this.options.cfg.detection), loot: structuredClone(this.lootConfig()) },
      heartbeatTimeoutMs: this.options.cfg.worker.heartbeatTimeoutMs, log: this.host!.log.child('worker'),
      message: (message) => { if (this.worker === worker) this.receive(message); },
      failed: (reason) => { if (this.worker === worker) this.failed(reason); },
    });
    this.worker = worker;
    try { worker.start(); } catch { this.failed('worker-failed'); }
  }
  private detachWorker(): void {
    const worker = this.worker; this.worker = null;
    if (!worker) return;
    const stopping = worker.stop(); this.stopping.add(stopping);
    void stopping.finally(() => this.stopping.delete(stopping));
  }
  private invalidate(reason: DeltaDropReason, preserveDedup = false): void {
    this.detachWorker();
    this.phase = this.intent === 'running' ? 'starting' : 'stopped';
    this.reason = this.intent === 'running' ? null : this.intent === 'paused' ? 'paused' : 'stopped';
    this.clearEvidence(reason, preserveDedup);
    this.sourceKey = null;
  }
  private clearEvidence(reason: DeltaDropReason, preserveDedup = false): void {
    this.generation++;
    this.preview = null; this.detectorState = null; this.lootState = null;
    if (reason === 'source-changed') this.clearCalibration();
    for (const request of this.previewRequests.values()) { clearTimeout(request.timer); request.resolve(null); }
    this.previewRequests.clear();
    this.queue.clear(reason, preserveDedup);
    this.frame = null;
    for (const [id, request] of this.simulations) {
      clearTimeout(request.timer); this.simulations.delete(id);
      request.resolve({ accepted: false, reason, eventId: null, state: this.stateSnapshot() });
    }
  }
  private failed(reason: DeltaReason): void {
    const sourceKey = this.sourceKey;
    this.invalidate('worker-failed', true);
    this.sourceKey = sourceKey;
    this.reason = reason;
    if (this.restarts >= this.options.cfg.worker.maxRestarts) { this.exhausted = true; this.phase = 'error'; }
    else { this.restarts++; this.retryAt = Date.now() + this.options.cfg.worker.restartDelayMs; this.phase = 'blocked'; }
  }
  private receive(message: ChildToMain): void {
    const generation = this.generation;
    this.reconcile();
    if (generation !== this.generation || this.blocked(this.snapshot()) || this.intent !== 'running') return;
    if (message.kind === 'error') {
      if (message.reason !== 'source-unavailable' || this.reason !== 'source-unavailable') this.host?.log.warn(message.message);
      if (message.reason === 'source-unavailable') {
        if (this.reason !== 'source-unavailable') this.clearEvidence('source-changed', true);
        this.phase = 'blocked'; this.reason = 'source-unavailable';
      } else this.failed(message.reason);
      return;
    }
    if (message.kind === 'ready') return;
    if (message.kind === 'preview') {
      const request = this.previewRequests.get(message.requestId);
      if (request) { clearTimeout(request.timer); this.previewRequests.delete(message.requestId); request.resolve(message.capture); }
      return;
    }
    if (message.kind === 'heartbeat') {
      this.captures = message.captures;
      if (message.frame) {
        const key = JSON.stringify([message.frame.display, message.frame.topologyRevision, message.frame.width, message.frame.height, message.frame.transform]);
        if (this.sourceKey && key !== this.sourceKey) {
          this.clearEvidence('source-changed');
        }
        this.sourceKey = key; this.frame = message.frame; this.phase = 'running'; this.reason = null;
      }
      this.detectorState = message.detection;
      this.lootState = message.loot ?? null;
      const calibration = this.lootConfig().calibration;
      if (message.frame && calibration && message.lootVisible && message.lootVisible.length <= 4 && message.lootVisible.every(validLootSignature)) {
        this.queue.observeLoot(lootNamespace(message.frame, calibration), message.lootVisible, Date.now());
      }
      return;
    }
    if (!message.synthetic) {
      if (message.eventKind === 'loot') {
        const config = this.lootConfig(), calibration = config.calibration, recognition = message.recognition;
        if (!this.frame || this.phase !== 'running' || !config.enabled || !calibration || lootStatus(config, this.options.cfg.detection).reason
          || !matchesCalibration(message.capture.frame, { ...calibration, roi: calibration.itemsRoi }) || !recognition || recognition.kind !== 'loot-candidate'
          || recognition.quality !== 'unconfirmed' || recognition.basis !== 'red-grid-ui' || recognition.itemName !== null || recognition.target !== ''
          || typeof recognition.text !== 'string' || recognition.text.length > 512 || !['loot', 'container', 'inventory'].includes(recognition.scene)
          || !validLootSignature(message.lootSignature) || message.attribution) return;
        const crop = captureRectangle(calibration.itemsRoi, message.capture.frame.width, message.capture.frame.height);
        if (crop.x !== message.crop.x || crop.y !== message.crop.y || crop.width !== message.crop.width || crop.height !== message.crop.height) return;
        try { this.queue.accept(message); } catch { this.failed('worker-failed'); }
        return;
      }
      if (!this.frame || this.phase !== 'running' || !this.options.cfg.detection.enabled || !this.options.cfg.detection.calibration
        || !matchesCalibration(message.capture.frame, this.options.cfg.detection.calibration)) return;
      const calibration = this.options.cfg.detection.calibration;
      if (!message.recognition || message.recognition.kind !== (calibration.personalFeedbackRoi ? 'personal-feedback-text' : 'actor-text')) return;
      if (calibration.personalFeedbackRoi && this.options.cfg.detection.language !== 'zh-CN') return;
      const crop = captureRectangle(calibration.personalFeedbackRoi ?? calibration.roi, message.capture.frame.width, message.capture.frame.height);
      if (crop.x !== message.crop.x || crop.y !== message.crop.y || crop.width !== message.crop.width || crop.height !== message.crop.height) return;
      try { this.queue.accept(message); } catch { this.failed('worker-failed'); }
      return;
    }
    const request = this.simulations.get(message.requestId);
    if (!request || request.id !== message.id) return;
    this.simulations.delete(message.requestId); clearTimeout(request.timer);
    let receipt: Omit<DeltaSimulationReceipt, 'state'>;
    try { receipt = this.queue.accept(message); }
    catch { receipt = { accepted: false, reason: 'worker-failed', eventId: null }; this.failed('worker-failed'); }
    request.resolve({ ...receipt, state: this.stateSnapshot() });
  }
  private expire(): void {
    const now = Date.now();
    if (this.preview && this.preview.expiresAtMs <= now) this.preview = null;
    this.queue.expire(now);
  }
  onRunPhase(phase: RunPhase): void {
    this.runIdle = phase.state === 'idle';
    if (this.runIdle) queueMicrotask(() => this.queue.scheduleWake());
  }
  onEventsSettled(events: readonly EventEnvelope[], outcome: 'delivered' | 'discarded'): void {
    this.queue.settled(events, outcome);
  }
  private stateSnapshot(): DeltaState {
    const snapshot = this.snapshot(), blocked = this.blocked(snapshot);
    const detection = { config: this.options.cfg.detection, ...(this.detectorState ?? detectionStatus(this.options.cfg.detection)) };
    if (!this.worker && detection.phase === 'starting') detection.phase = 'paused';
    if (detection.config.enabled && detection.config.calibration && this.frame && !matchesCalibration(this.frame, detection.config.calibration)) {
      detection.phase = 'uncalibrated'; detection.reason = 'source-changed';
    }
    const config = this.lootConfig(), loot = { config, ...(this.lootState ?? lootStatus(config, this.options.cfg.detection)) };
    if (!this.worker && (loot.phase === 'starting' || loot.phase === 'ready')) loot.phase = 'paused';
    if (config.enabled && config.calibration && this.frame && !matchesCalibration(this.frame, { ...config.calibration, roi: config.calibration.itemsRoi })) {
      loot.phase = 'uncalibrated'; loot.reason = 'source-changed';
    }
    return structuredClone({ generation: this.generation, intent: this.intent, phase: this.phase, reason: this.reason, startBlockedReason: blocked, bound: !!snapshot,
      captureMode: this.binding ? 'host' : this.standalone ? 'standalone' : 'unsupported', standaloneGranted: this.grantedDisplayId !== null,
      calibrationDisplayId: this.calibrationGrant?.displayId ?? null,
      source: this.frame?.display ?? null, configuredDisplayId: snapshot?.displayId ?? '',
      calibrationHotkey: this.calibrationHotkeyState(snapshot), gameAspectRatio: this.gameAspectRatio(),
      identityDebug: this.identityDebug.state(),
      worker: { pid: this.worker?.pid ?? null, heartbeatAt: this.worker?.heartbeatAt ?? null, restarts: this.restarts, captures: this.captures },
      pending: this.queue.pendingCount(), events: this.queue.list(), detection, loot, startupCheck: startupCheck(this.frame, this.options.cfg.detection, config),
      speech: { config: this.speechConfig(), lastSelectedAt: this.queue.selectedAtMs() === null ? null : new Date(this.queue.selectedAtMs()!).toISOString(),
        lastActivityAt: this.queue.activityAtMs() === null ? null : new Date(this.queue.activityAtMs()!).toISOString() }, knowledge: this.knowledge.state(),
      actions: { start: !!this.binding && !!this.host && !!this.options.cfg.enabled && !blocked && (this.intent !== 'running' || this.exhausted),
        pause: this.intent === 'running', stop: this.intent !== 'stopped' || this.pendingGrant !== null || this.calibrationGrant !== null,
        simulate: this.phase === 'running' && this.worker !== null && this.frame !== null && !blocked } });
  }
  state(): DeltaState { this.reconcile(); this.expire(); return this.stateSnapshot(); }
  private async listStandaloneDisplays(unavailable: string): Promise<CuaDisplay[]> {
    if (!this.host || !this.options.cfg.enabled || this.binding || !this.standalone) throw new Error(unavailable);
    return this.standalone.listDisplays();
  }
  private revokeCalibrationGrant(): void {
    if (this.pendingGrant?.calibrationOnly) this.pendingGrant = null;
    if (!this.calibrationGrant) return;
    this.calibrationGrant = null;
    this.clearCalibration();
    this.preview = null;
  }
  private async authorizeStandalone(displayId: string, calibrationOnly: boolean, unavailable: string): Promise<DeltaState> {
    if (calibrationOnly && this.intent === 'running') throw new Error(unavailable);
    const request = { calibrationOnly };
    this.pendingGrant = request;
    try {
      const displays = await this.listStandaloneDisplays(unavailable);
      if (this.pendingGrant !== request || !this.host || !this.options.cfg.enabled || (!calibrationOnly && !this.host.modelFacts.accepts('image/jpeg'))
        || !displays.some(display => display.id === displayId)) throw new Error(unavailable);
      if (this.options.cfg.standaloneDisplayId !== displayId) this.options.persist({ standaloneDisplayId: displayId });
      this.clearCalibration();
      this.preview = null;
      if (calibrationOnly) {
        this.calibrationGrant = { displayId, expiresAt: Date.now() + CALIBRATION_GRANT_MS };
        return this.state();
      }
      this.calibrationGrant = null;
      this.grantedDisplayId = displayId;
      return await this.setIntent('running', unavailable);
    } finally {
      if (this.pendingGrant === request) this.pendingGrant = null;
    }
  }
  private async setIntent(intent: DeltaIntent, unavailable: string): Promise<DeltaState> {
    if (intent === 'running' && (!this.host || !this.options.cfg.enabled || this.blocked(this.snapshot()))) throw new Error(unavailable);
    if (intent !== 'running' && !this.binding) {
      this.pendingGrant = null; this.calibrationGrant = null; this.grantedDisplayId = null; this.clearCalibration();
    }
    this.invalidate('policy-changed');
    this.intent = intent; this.exhausted = false; this.retryAt = 0;
    if (intent === 'running') { this.restarts = 0; this.captures = 0; }
    if (this.binding) this.options.persist({ observer: { enabled: intent === 'running' } });
    this.reconcile();
    if (intent !== 'running') await Promise.all(this.stopping);
    return this.state();
  }
  private simulate(request: DeltaSimulateRequest, unavailable: string): Promise<DeltaSimulationReceipt> {
    this.reconcile();
    if (this.phase !== 'running' || this.blocked(this.snapshot()) || !this.worker) throw new Error(unavailable);
    if (this.simulations.size >= this.options.cfg.events.maxPending) return Promise.resolve({ accepted: false, reason: 'overflow', eventId: null, state: this.stateSnapshot() });
    const requestId = ++this.requestSequence, id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.simulations.delete(requestId); resolve({ accepted: false, reason: 'worker-failed', eventId: null, state: this.stateSnapshot() }); }, 5000);
      this.simulations.set(requestId, { id, timer, resolve });
      this.worker!.send({ kind: 'simulate', requestId, eventId: id, eventKind: request.kind, dedupKey: request.dedupKey ?? id });
    });
  }
  private async detectionPreview(unavailable: string): Promise<CuaFrame> {
    this.reconcile();
    if (this.intent !== 'running') {
      const policy = this.calibrationPolicy();
      if (!policy || this.calibrationRequest) throw new Error(unavailable);
      const result = await this.calibrationCapture('calibration-preview', policy);
      if (result.status !== 'manual-preview' || this.calibrationPolicy()?.revision !== policy.revision
        || (policy.displayId ? result.capture.frame.display.id !== policy.displayId : !result.capture.frame.display.primary)) throw new Error(unavailable);
      return this.storeManualPreview(result.capture, unavailable, policy.revision);
    }
    const deadline = Date.now() + 5000;
    while (this.intent === 'running' && this.phase === 'starting' && !this.blocked(this.snapshot()) && Date.now() < deadline) {
      await new Promise((done) => setTimeout(done, 20)); this.reconcile();
    }
    if (this.phase !== 'running' || !this.worker || this.blocked(this.snapshot()) || this.previewRequests.size) throw new Error(unavailable);
    const generation = this.generation, aspectRatio = this.gameAspectRatio(), requestId = ++this.requestSequence;
    const capture = await new Promise<DeltaCapture | null>((resolve) => {
      const timer = setTimeout(() => { this.previewRequests.delete(requestId); resolve(null); }, 5000);
      this.previewRequests.set(requestId, { resolve, timer }); this.worker!.send({ kind: 'preview', requestId });
    });
    this.reconcile();
    if (!capture || generation !== this.generation || aspectRatio !== this.gameAspectRatio() || this.phase !== 'running' || this.blocked(this.snapshot()) || !this.frame
      || !matchesCalibration(capture.frame, { display: this.frame.display, topologyRevision: this.frame.topologyRevision, roi: { x: 0, y: 0, width: 1, height: 1 } })
      || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) throw new Error(unavailable);
    return this.storeManualPreview(capture, unavailable);
  }
  private storeManualPreview(capture: DeltaCapture, unavailable: string, calibrationRevision?: string): CuaFrame {
    if (!capture.jpeg.byteLength || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) throw new Error(unavailable);
    const size = jpegSize(capture.jpeg);
    if (!size || size.width !== capture.frame.width || size.height !== capture.frame.height) throw new Error(unavailable);
    this.preview = { capture, generation: this.generation, aspectRatio: this.gameAspectRatio(), calibrationRevision, expiresAtMs: Date.now() + 30_000 };
    return structuredClone(capture.frame);
  }
  private validPreview(frameId: unknown): DeltaCapture | null {
    this.reconcile();
    const preview = this.preview;
    if (!preview || preview.capture.frame.frameId !== frameId || preview.generation !== this.generation || preview.expiresAtMs <= Date.now()) return null;
    const permitted = preview.calibrationRevision === undefined ? this.phase === 'running' && !this.blocked(this.snapshot())
      : this.calibrationPolicy()?.revision === preview.calibrationRevision;
    return permitted ? preview.capture : null;
  }
  private async previewForSave(frameId: unknown): Promise<DeltaCapture | null> {
    const capture = this.validPreview(frameId);
    if (!capture || this.preview?.calibrationRevision === undefined) return capture;
    const policy = this.calibrationPolicy();
    if (!policy || this.calibrationRequest) return null;
    const result = await this.calibrationCapture('calibration-source', policy);
    return result.status === 'source' && sameCalibrationSource(result.source, capture.frame) && this.validPreview(frameId) === capture ? capture : null;
  }
  private calibrationPolicy(snapshot = this.snapshot()): CapturePolicy | null {
    if (!this.host || !this.options.cfg.enabled || !snapshot?.viewEnabled || !snapshot.observationEnabled) return null;
    if (snapshot.viewPermitted) return snapshot;
    const grant = this.calibrationGrant;
    return !this.binding && grant && grant.displayId === snapshot.displayId && grant.expiresAt > Date.now()
      ? { ...snapshot, viewPermitted: true } : null;
  }
  private gameAspectRatio() {
    const ratio = this.options.cfg.gameAspectRatio;
    return isGameAspectRatio(ratio) ? ratio : DEFAULT_GAME_ASPECT_RATIO;
  }
  private calibrationHotkeyState(snapshot: CapturePolicy | null): DeltaCalibrationHotkeyState {
    const status = !this.binding && !this.standalone ? 'unavailable' : this.options.cfg.calibrationHotkeyEnabled === false ? 'disabled' : !snapshot?.viewPermitted || !this.calibrationPolicy(snapshot) ? 'blocked'
      : this.calibrationHotkeyLease?.status ?? 'unavailable';
    const attempt = this.calibrationHotkeyAttempt;
    return { status, attempt: attempt && { id: attempt.id, result: attempt.result } };
  }
  private clearCalibration(): void {
    this.calibrationPreview = null;
    this.calibrationRequest?.controller.abort();
    this.clearCalibrationHotkeyAttempt();
  }
  private clearCalibrationHotkeyAttempt(): void {
    const attempt = this.calibrationHotkeyAttempt;
    if (!attempt) return;
    this.calibrationHotkeyAttempt = null;
    if (this.calibrationPreview?.attemptId === attempt.id) this.calibrationPreview = null;
    if (this.calibrationRequest?.attemptId === attempt.id) this.calibrationRequest.controller.abort();
  }
  private releaseCalibrationHotkey(): void {
    const lease = this.calibrationHotkeyLease;
    this.calibrationHotkeyLease = null;
    this.calibrationLastPressMs = -Infinity;
    this.clearCalibrationHotkeyAttempt();
    lease?.release?.();
  }
  private reconcileCalibrationHotkey(snapshot: CapturePolicy | null): void {
    const port = this.binding ? this.binding.calibrationHotkey : this.standalone?.calibrationHotkey;
    if (!port || this.options.cfg.calibrationHotkeyEnabled === false || !snapshot?.viewPermitted || !this.calibrationPolicy(snapshot)) {
      if (this.calibrationHotkeyLease) this.releaseCalibrationHotkey();
      return;
    }
    if (this.calibrationHotkeyLease) return;
    const lease: HotkeyLease = { status: 'registering' };
    this.calibrationHotkeyLease = lease;
    try {
      lease.release = port.register(() => { void this.onCalibrationHotkey(lease); }, (status) => {
        if (this.calibrationHotkeyLease !== lease) return;
        lease.status = status;
        if (status !== 'registered') this.clearCalibrationHotkeyAttempt();
      });
    } catch { lease.status = 'unavailable'; }
  }
  private async onCalibrationHotkey(lease: HotkeyLease): Promise<void> {
    this.reconcile();
    if (this.calibrationHotkeyLease !== lease || lease.status !== 'registered') return;
    const now = Date.now(), repeated = now - this.calibrationLastPressMs < HOTKEY_REPEAT_MS;
    this.calibrationLastPressMs = now;
    if (repeated || this.calibrationRequest) return;
    const attempt: HotkeyAttempt = { id: randomUUID(), result: { status: 'capturing' }, expiresAtMs: Infinity };
    this.calibrationHotkeyAttempt = attempt;
    const result: DeltaCalibrationSuggestion = await this.calibrationSuggest(attempt.id).catch(() => ({ status: 'capture-unavailable' } as const));
    if (this.calibrationHotkeyAttempt !== attempt) return;
    attempt.result = result;
    attempt.expiresAtMs = result.expiresAt ? Date.parse(result.expiresAt) : Date.now() + CALIBRATION_PREVIEW_MS;
  }
  private identityLanguage() { return this.options.cfg.detection.language || this.lootConfig().language || 'zh-CN'; }
  private async calibrationCapture(kind: CalibrationWorkerRequest['kind'], snapshot: CapturePolicy, attemptId?: string,
    progress?: IdentityProgressSink): Promise<CalibrationWorkerResult> {
    const controller = new AbortController();
    this.calibrationRequest = { controller, attemptId, kind };
    const aspect = this.gameAspectRatio();
    const current = () => {
      const policy = this.calibrationPolicy();
      return this.calibrationRequest?.controller === controller && !controller.signal.aborted && policy?.revision === snapshot.revision
        && policy.displayId === snapshot.displayId && this.gameAspectRatio() === aspect;
    };
    try {
      const operation = this.options.calibrationOperation ?? runCalibrationOperation;
      const result = await operation({ kind, displayId: snapshot.displayId, frameSourceModule: this.frameSourceModule(),
        gameAspectRatio: aspect, language: kind === 'identity-suggest' ? this.identityLanguage()
          : this.lootConfig().language || this.options.cfg.detection.language || 'zh-CN' }, controller.signal,
        progress ? event => { if (current()) progress(event); } : undefined);
      this.reconcile();
      if (current()) return result;
    } catch {
      if (current()) return { status: 'capture-unavailable', reason: 'worker-exception' };
    }
    finally { this.calibrationRequest = null; }
    return { status: 'capture-unavailable', reason: controller.signal.reason === 'id-saved' ? 'id-saved'
      : this.host && !this.calibrationPolicy() ? 'permission-revoked' : 'cancelled' };
  }
  private async identitySuggest() {
    this.reconcile();
    const attemptId = randomUUID(), started = Date.now(), saved = this.identitySaveRevision;
    const snapshot = this.calibrationPolicy(), store = this.identityDebug;
    let screenshot: string | null = null, recognitionReason: string | undefined;
    const record = (event: { stage: string; [field: string]: unknown }) => store.record(attemptId, event);
    record({ stage: 'start', displayId: this.snapshot()?.displayId ?? null, aspectRatio: this.gameAspectRatio(), language: this.identityLanguage() });
    const progress: IdentityProgressSink = update => {
      if (update.kind === 'frame') {
        if (snapshot?.displayId && update.displayId !== snapshot.displayId) return;
        const { kind: _kind, png, ...details } = update;
        screenshot = store.writeFrame(attemptId, png);
        record({ stage: 'frame', ...details, screenshot, ...(screenshot ? {} : { reason: 'frame-write-failed' }) });
      } else if (update.event.stage === 'finish') {
        recognitionReason = update.event.reason;
        record({ ...update.event, stage: 'recognition-finish' });
      } else record(update.event);
    };
    let result: CalibrationWorkerResult;
    if (!snapshot) result = { status: 'capture-unavailable', reason: 'permission-denied' };
    else if (this.calibrationRequest) result = { status: 'capture-unavailable', reason: 'busy' };
    else result = await this.calibrationCapture('identity-suggest', snapshot, attemptId, this.options.dataDir ? progress : undefined);
    if (saved !== this.identitySaveRevision) { result = { status: 'capture-unavailable', reason: 'id-saved' }; screenshot = null; }
    const suggestion = result.status === 'identity' ? result.suggestion : { status: 'capture-unavailable' as const };
    const reason = ('reason' in result && result.reason) || recognitionReason || (result.status === 'identity' ? suggestion.status : result.status);
    record({ stage: 'finish', status: suggestion.status, reason, screenshot, elapsedMs: Date.now() - started });
    return { ...suggestion, attemptId, reason, screenshot };
  }
  private async calibrationSuggest(attemptId?: string): Promise<DeltaCalibrationSuggestion> {
    this.reconcile();
    const snapshot = this.calibrationPolicy();
    if (!snapshot || this.calibrationRequest) return { status: 'capture-unavailable' };
    if (attemptId === undefined) this.clearCalibrationHotkeyAttempt();
    this.calibrationPreview = null;
    const result = await this.calibrationCapture('calibration-suggest', snapshot, attemptId);
    if (attemptId !== undefined && this.calibrationHotkeyAttempt?.id !== attemptId) return { status: 'capture-unavailable' };
    if (result.status === 'source' || result.status === 'identity' || result.status === 'manual-preview' || result.status === 'capture-unavailable') return { status: 'capture-unavailable' };
    const { capture } = result;
    if (!capture) return result.status === 'ready' || result.status === 'inventory-ready' ? { status: 'capture-unavailable' } : { status: result.status };
    const { frame } = capture;
    if ((snapshot.displayId ? frame.display.id !== snapshot.displayId : !frame.display.primary)
      || (this.frame && !sameCalibrationSource(this.frame, frame)) || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) return { status: 'capture-unavailable' };
    const size = jpegSize(capture.jpeg);
    if (!size || size.width !== frame.width || size.height !== frame.height) return { status: 'capture-unavailable' };
    const expiresAtMs = Date.now() + CALIBRATION_PREVIEW_MS;
    const preview = { capture, revision: snapshot.revision, expiresAtMs, attemptId };
    const expiresAt = new Date(expiresAtMs).toISOString();
    this.calibrationPreview = { ...preview, regions: null };
    if (result.status === 'inventory-ready') {
      if (!lootCalibrationFitsBudget({ display: frame.display, topologyRevision: frame.topologyRevision, ...result.loot })) {
        return structuredClone({ status: 'unsupported-layout', frame, expiresAt });
      }
      this.calibrationPreview.regions = { loot: structuredClone(result.loot) };
      return structuredClone({ status: 'inventory-ready', frame, expiresAt, loot: result.loot, sources: { loot: 'detected' } });
    }
    if (result.status !== 'ready') return structuredClone({ status: result.status, frame, expiresAt });
    const regions = calibrationRegions(frame, this.gameAspectRatio(), this.options.cfg.detection.calibration, this.lootConfig().calibration, result.anchors);
    if (!regions) return result.anchors ? structuredClone({ status: 'preparation-only', anchors: result.anchors, frame, expiresAt })
      : structuredClone({ status: 'unsupported-layout', frame, expiresAt });
    const combat = this.options.cfg.detection.language === 'en-US' ? { roi: regions.combat.roi, personalFeedbackRoi: null } : regions.combat;
    const suggestion = { ...regions, combat };
    this.calibrationPreview.regions = structuredClone(suggestion);
    return structuredClone({ status: 'ready', frame, nickname: null, expiresAt, ...(result.anchors && { anchors: result.anchors }), ...suggestion });
  }
  private validCalibrationPreview(frameId: unknown): CalibrationPreview | null {
    this.reconcile();
    const preview = this.calibrationPreview;
    return preview && preview.capture.frame.frameId === frameId && this.calibrationPolicy()?.revision === preview.revision
      && (!this.frame || sameCalibrationSource(this.frame, preview.capture.frame)) ? preview : null;
  }
  private readablePreview(frameId: unknown): DeltaCapture | null {
    return this.validPreview(frameId) ?? this.validCalibrationPreview(frameId)?.capture ?? null;
  }
  private readableEventCapture(eventId: string, part: 'full' | 'crop'): DeltaCapture | null {
    this.reconcile(); this.expire();
    const event = this.queue.list().find((value) => value.id === eventId), images = this.queue.stored(eventId);
    if (this.phase !== 'running' || this.blocked(this.snapshot()) || !event || event.generation !== this.generation || event.status === 'dropped' || !images) return null;
    return { frame: event.frame, jpeg: images[part] };
  }
  private async calibrationApply(request: DeltaCalibrationApplyRequest, invalidRequest: string, unavailable: string): Promise<DeltaState> {
    const snapshot = this.calibrationPolicy(), preview = this.validCalibrationPreview(request.frameId);
    if (!snapshot || !preview?.regions || this.calibrationRequest) throw new Error(unavailable);
    const { regions } = preview;
    if ((request.combat !== undefined && !isDeepStrictEqual(request.combat, regions.combat))
      || (request.loot !== undefined && !isDeepStrictEqual(request.loot, regions.loot))) throw new Error(invalidRequest);
    const result = await this.calibrationCapture('calibration-source', snapshot, preview.attemptId);
    const { frame } = preview.capture;
    if (result.status !== 'source' || !sameCalibrationSource(result.source, frame) || this.validCalibrationPreview(request.frameId) !== preview) {
      if (this.calibrationPreview === preview) {
        this.calibrationPreview = null;
        if (preview.attemptId) this.clearCalibrationHotkeyAttempt();
      }
      throw new Error(unavailable);
    }
    const source = { display: frame.display, topologyRevision: frame.topologyRevision, gameAspectRatio: this.gameAspectRatio() };
    this.options.persist({ ...(regions.combat && { detection: { calibration: { ...source, ...regions.combat } } }),
      ...(regions.loot && { loot: { calibration: { ...source, ...regions.loot } } }) });
    this.calibrationPreview = null;
    if (preview.attemptId) this.clearCalibrationHotkeyAttempt();
    return this.state();
  }
  private panelHost(errors: DeltaPanelHost['errors']): DeltaPanelHost {
    return {
      errors,
      identitySuggest: () => this.identitySuggest(),
      openIdentityLog: () => {
        if (!this.screenshotReveal) throw new Error(errors.unavailable);
        return Promise.resolve(this.screenshotReveal.open(this.identityDebug.logPath()));
      },
      saveIdentity: (nickname) => {
        this.options.persist({ detection: { nickname: nickname.trim() } });
        this.identitySaveRevision++;
        if (this.calibrationRequest?.kind === 'identity-suggest') this.calibrationRequest.controller.abort('id-saved');
        this.identityDebug.clearFrames();
        return this.state();
      },
      persist: (patch) => { this.options.persist(patch); },
      state: () => this.state(),
      readKnowledge: () => this.knowledge.read(),
      importKnowledge: (name, content) => { this.knowledge.import(name, content); },
      reloadKnowledge: () => { this.knowledge.reload(); },
      restoreKnowledge: () => { this.knowledge.restore(); },
      listStandaloneDisplays: () => this.listStandaloneDisplays(errors.unavailable),
      authorizeStandalone: (displayId, calibrationOnly) => this.authorizeStandalone(displayId, calibrationOnly, errors.unavailable),
      cancelCalibration: () => { this.revokeCalibrationGrant(); return this.state(); },
      hasBinding: () => !!this.binding,
      setIntent: (intent) => this.setIntent(intent, errors.unavailable),
      reconcile: () => { this.reconcile(); },
      previewForSave: (frameId) => this.previewForSave(frameId),
      calibrationSource: (capture) => ({ display: capture.frame.display, topologyRevision: capture.frame.topologyRevision, gameAspectRatio: this.gameAspectRatio() }),
      clearManualPreview: () => { this.preview = null; },
      calibrationSuggest: () => this.calibrationSuggest(),
      calibrationApply: (request) => this.calibrationApply(request, errors.invalidRequest, errors.unavailable),
      dismissCalibration: (attemptId) => {
        if (this.calibrationHotkeyAttempt?.id === attemptId) this.clearCalibrationHotkeyAttempt();
        return this.state();
      },
      detectionPreview: () => this.detectionPreview(errors.unavailable),
      readablePreview: (frameId) => this.readablePreview(frameId),
      readableEventCapture: (eventId, part) => this.readableEventCapture(eventId, part),
      canReveal: () => this.screenshotReveal !== null,
      reveal: (capture, part) => {
        if (!this.screenshotReveal) throw new Error(errors.unavailable);
        return Promise.resolve(revealCapture(this.screenshotReveal, capture, part));
      },
      savedPersonalFeedback: () => !!this.options.cfg.detection.calibration?.personalFeedbackRoi,
      simulate: (request) => this.simulate(request, errors.unavailable),
    };
  }
  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = deltaText(language), host = this.panelHost(t.errors);
    return { label: t.title, panels: [{ id: 'observer', title: t.panel }], config: deltaConfigGroups(language, !!this.binding, !!this.binding || process.platform === 'win32'),
      invoke: (panel, method, args) => invokePanel(host, panel, method, args) };
  }
}
