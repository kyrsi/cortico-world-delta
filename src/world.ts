/** A bounded observation queue connects an independent capture process to Core's deferred events. */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import jpeg from 'jpeg-js';
import type { Language } from 'cortico/core/language.ts';
import type { BlobInput, EventEnvelope, OutputTap, RunPhase, World, WorldWebUiDecl, WorldHost } from 'cortico/core/types.ts';
import type { DeepPartial } from 'cortico/world.ts';
import type { CuaFrame } from 'cortico-world-desktop-pet';
import { CALIBRATION_PREVIEW_MS, calibrationRegions, sameCalibrationSource } from './calibration.ts';
import { captureRectangle } from './roi.ts';
import { DELTA_DEFAULTS, deltaConfigGroups, type DeltaConfigSection } from './config.ts';
import { DELTA_CONTROL_INTERVAL_MS, DELTA_MAX_HISTORY, DELTA_MAX_JPEG_BYTES } from './limits.ts';
import { calibrationFitsBudget, detectionStatus, matchesCalibration } from './detector.ts';
import { deltaText } from './i18n/index.ts';
import { observationText } from './model-text.ts';
import { KnowledgeStore } from './knowledge-store.ts';
import { selectKnowledge } from './knowledge.ts';
import { evaluateSpeech, validateSpeechConfig } from './speech.ts';
import { DeltaWorker, runCalibrationOperation } from './proxy.ts';
import { openScreenshotInFolder, revealCapture, type ScreenshotReveal } from './screenshot-reveal.ts';
import { startupCheck } from './startup-check.ts';
import { PersonalNotificationTracker, validPersonalSignature } from './personal-notification.ts';
import { LootItemTracker, lootCalibrationFitsBudget, lootNamespace, lootStatus, validLootSignature } from './loot-detector.ts';
import type { CalibrationWorkerRequest, CalibrationWorkerResult, ChildToMain, DeltaCapture } from './engine-ipc.ts';
import { DEFAULT_GAME_ASPECT_RATIO, isGameAspectRatio, type DeltaCalibrationRegions, type DeltaGameAspectRatio } from './protocol.ts';
import type { DeltaBindingSnapshot, DeltaCalibrationApplyRequest, DeltaCalibrationHotkeyState, DeltaCalibrationSuggestion, DeltaDetectionConfigureRequest, DeltaDetectionState, DeltaDropReason, DeltaEvent, DeltaIntent, DeltaKnowledgeImportRequest, DeltaLootConfig, DeltaLootConfigureRequest, DeltaLootState, DeltaProductBinding, DeltaReason, DeltaRoi, DeltaScreenshotRevealRequest, DeltaSimulateRequest, DeltaSimulationReceipt, DeltaSpeechConfig, DeltaState } from './protocol.ts';

interface Evidence { full: Uint8Array; crop: Uint8Array }
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
export interface DeltaWorldOptions {
  cfg: DeltaConfigSection; persist(patch: DeepPartial<DeltaConfigSection>): void;
  binding?: DeltaProductBinding; frameSourceModule?: string; modelLanguage?(): 'zh' | 'en';
  calibrationOperation?: typeof runCalibrationOperation;
  screenshotReveal?: Partial<ScreenshotReveal>;
  dataDir?: string;
  random?(): number;
}

export class DeltaWorld implements World {
  readonly id = 'delta';
  private host: WorldHost | null = null;
  private binding?: DeltaProductBinding;
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
  private events: DeltaEvent[] = [];
  private pending: DeltaEvent[] = [];
  private inflight = new Set<string>();
  private images = new Map<string, Evidence>();
  private seen = new Map<string, number>();
  private personalNotifications = new PersonalNotificationTracker();
  private lootItems = new LootItemTracker();
  private simulations = new Map<number, Simulation>();
  private requestSequence = 0;
  private wake: { generation: number; token: string } | null = null;
  private stopping = new Set<Promise<void>>();
  private detectorState: Omit<DeltaDetectionState, 'config'> | null = null;
  private lootState: Omit<DeltaLootState, 'config'> | null = null;
  private preview: { capture: DeltaCapture; generation: number; expiresAtMs: number; aspectRatio: DeltaGameAspectRatio } | null = null;
  private previewRequests = new Map<number, { resolve(capture: DeltaCapture | null): void; timer: NodeJS.Timeout }>();
  private calibrationPreview: CalibrationPreview | null = null;
  private calibrationRequest: { controller: AbortController; attemptId?: string } | null = null;
  private calibrationHotkeyLease: HotkeyLease | null = null;
  private calibrationHotkeyAttempt: HotkeyAttempt | null = null;
  private calibrationLastPressMs = -Infinity;
  private readonly knowledge: KnowledgeStore;
  private readonly screenshotReveal: ScreenshotReveal | null;
  private lastSelectedAtMs: number | null = null;
  private lastActivityAtMs: number | null = null;

  constructor(private readonly options: DeltaWorldOptions) {
    this.binding = options.binding; this.knowledge = new KnowledgeStore(options.dataDir);
    const directory = options.screenshotReveal?.directory ?? (options.dataDir ? join(options.dataDir, 'worlds', this.id, 'screenshots') : null);
    this.screenshotReveal = directory ? { directory, open: options.screenshotReveal?.open ?? openScreenshotInFolder } : null;
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
        || event.type === 'response.function_call_arguments.delta') this.lastActivityAtMs = Date.now();
    } };
  }
  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.lastSelectedAtMs = null; this.lastActivityAtMs = null;
    this.intent = this.options.cfg.observer.enabled ? 'running' : 'stopped';
    this.bindProduct(this.binding);
    this.timer = setInterval(() => this.reconcile(), DELTA_CONTROL_INTERVAL_MS);
    this.timer.unref();
    this.reconcile();
  }
  async stop(): Promise<void> {
    this.host = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribe?.(); this.unsubscribe = null;
    this.releaseCalibrationHotkey();
    this.clearCalibration();
    this.intent = 'stopped';
    this.invalidate('policy-changed');
    this.wake = null;
    this.phase = 'stopped'; this.reason = 'stopped';
    await Promise.all(this.stopping);
  }
  bindProduct(binding?: DeltaProductBinding): void {
    if (binding && binding.version !== 1) throw new Error(deltaText().errors.invalidBinding);
    this.unsubscribe?.(); this.unsubscribe = null;
    this.releaseCalibrationHotkey();
    this.clearCalibration();
    this.binding = binding;
    this.policyKey = null;
    this.calibrationPolicyKey = null;
    this.invalidate('policy-changed');
    if (this.host) this.unsubscribe = binding?.subscribe?.(() => this.reconcile()) ?? null;
    this.reconcile();
  }
  private snapshot(): DeltaBindingSnapshot | null { return this.binding?.snapshot() ?? null; }
  private frameSourceModule(): string {
    return this.options.frameSourceModule ?? this.binding?.frameSourceModule ?? 'cortico-world-desktop-pet/capture';
  }
  private blocked(snapshot: DeltaBindingSnapshot | null): DeltaReason | null {
    if (!snapshot) return 'unbound';
    if (!snapshot.viewEnabled) return 'view-disabled';
    if (!snapshot.observationEnabled) return 'observation-disabled';
    if (!snapshot.viewPermitted) return 'view-permission';
    if (snapshot.corePaused) return 'core-paused';
    if (!snapshot.outputAvailable) return 'no-output';
    if (!this.host?.modelFacts.accepts('image/jpeg')) return 'no-image-model';
    return null;
  }
  private reconcile(): void {
    if (!this.host) return;
    const now = Date.now();
    if (this.preview && this.preview.aspectRatio !== this.gameAspectRatio()) this.preview = null;
    if (this.calibrationPreview && this.calibrationPreview.expiresAtMs <= now) this.calibrationPreview = null;
    if (this.calibrationHotkeyAttempt && this.calibrationHotkeyAttempt.expiresAtMs <= now) this.clearCalibrationHotkeyAttempt();
    const cfg = this.options.cfg;
    if (!cfg.enabled || (!cfg.observer.enabled && this.intent === 'running')) this.intent = 'stopped';
    else if (cfg.observer.enabled && this.intent !== 'running') this.intent = 'running';
    const snapshot = this.snapshot();
    const loot = this.lootConfig();
    const calibrationKey = JSON.stringify([snapshot, cfg.enabled, cfg.detection.calibration, loot.calibration, this.gameAspectRatio()]);
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
      if (this.worker || this.images.size || this.pending.length) this.invalidate('policy-changed');
      this.phase = 'blocked'; this.reason = reason; return;
    }
    if (this.exhausted) { this.phase = 'error'; return; }
    if (!this.worker && this.stopping.size === 0 && Date.now() >= this.retryAt) this.spawn(snapshot);
    this.expire();
    this.scheduleWake();
  }
  private spawn(snapshot: DeltaBindingSnapshot): void {
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
    for (const event of this.events) if (event.status === 'queued') this.drop(event, reason);
    this.pending = []; this.images.clear(); this.inflight.clear(); this.frame = null;
    if (!preserveDedup) { this.seen.clear(); this.personalNotifications.clear(); this.lootItems.clear(); }
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
        this.lootItems.observe(lootNamespace(message.frame, calibration), message.lootVisible, Date.now());
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
        try { this.accept(message); } catch { this.failed('worker-failed'); }
        return;
      }
      if (!this.frame || this.phase !== 'running' || !this.options.cfg.detection.enabled || !this.options.cfg.detection.calibration
        || !matchesCalibration(message.capture.frame, this.options.cfg.detection.calibration)) return;
      const calibration = this.options.cfg.detection.calibration;
      if (!message.recognition || message.recognition.kind !== (calibration.personalFeedbackRoi ? 'personal-feedback-text' : 'actor-text')) return;
      if (calibration.personalFeedbackRoi && this.options.cfg.detection.language !== 'zh-CN') return;
      const crop = captureRectangle(calibration.personalFeedbackRoi ?? calibration.roi, message.capture.frame.width, message.capture.frame.height);
      if (crop.x !== message.crop.x || crop.y !== message.crop.y || crop.width !== message.crop.width || crop.height !== message.crop.height) return;
      try { this.accept(message); } catch { this.failed('worker-failed'); }
      return;
    }
    const request = this.simulations.get(message.requestId);
    if (!request || request.id !== message.id) return;
    this.simulations.delete(message.requestId); clearTimeout(request.timer);
    let receipt: Omit<DeltaSimulationReceipt, 'state'>;
    try { receipt = this.accept(message); }
    catch { receipt = { accepted: false, reason: 'worker-failed', eventId: null }; this.failed('worker-failed'); }
    request.resolve({ ...receipt, state: this.stateSnapshot() });
  }
  private accept(message: Extract<ChildToMain, { kind: 'event' }>): Omit<DeltaSimulationReceipt, 'state'> {
    const { frame, jpeg: full } = message.capture, crop = message.crop;
    const time = Date.parse(frame.capturedAt), now = Date.now();
    if (!this.frame || frame.display.id !== this.frame.display.id || frame.topologyRevision !== this.frame.topologyRevision
      || !Number.isFinite(time) || time > now + 1000 || !['kill', 'knockdown', 'loot'].includes(message.eventKind)
      || full.byteLength > DELTA_MAX_JPEG_BYTES || message.cropJpeg.byteLength > DELTA_MAX_JPEG_BYTES
      || ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger)
      || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > frame.width || crop.y + crop.height > frame.height) throw new Error('Invalid observation frame');
    const decoded = jpeg.decode(full, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
    const decodedCrop = jpeg.decode(message.cropJpeg, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
    if (decoded.width !== frame.width || decoded.height !== frame.height || decodedCrop.width !== crop.width || decodedCrop.height !== crop.height) throw new Error('Invalid image dimensions');
    const personal = !message.synthetic && message.recognition?.kind === 'personal-feedback-text' && message.eventKind !== 'loot';
    if (personal && !validPersonalSignature(message.personalSignature)) throw new Error('Invalid personal notification signature');
    const attribution = message.synthetic ? null : message.attribution ?? null;
    if (attribution && (!['self', 'teammate', 'unknown'].includes(attribution.relation)
      || !['actor-text', 'personal-feedback', 'assist-text', 'spectator-hud', 'unknown'].includes(attribution.basis)
      || typeof attribution.assisted !== 'boolean' || typeof attribution.spectating !== 'boolean')) throw new Error('Invalid observation attribution');
    const relation = attribution?.relation ?? 'unknown';
    const namespace = personal ? JSON.stringify([frame.display, frame.topologyRevision, this.options.cfg.detection, relation]) : '';
    const loot = !message.synthetic && message.eventKind === 'loot', itemNamespace = loot ? lootNamespace(frame, this.lootConfig().calibration!) : '';
    const duplicateItem = loot && this.lootItems.has(itemNamespace, message.lootSignature!, now);
    const dedupKey = loot ? this.lootItems.identify(itemNamespace, message.lootSignature!, now)
      : personal ? this.personalNotifications.identify(namespace, message.eventKind as 'kill' | 'knockdown', message.personalSignature ?? null, now) : message.dedupKey;
    const event: DeltaEvent = { id: message.id, kind: message.eventKind, capturedAt: frame.capturedAt,
      validUntil: new Date(time + this.options.cfg.events.ttlMs).toISOString(), generation: this.generation,
      synthetic: message.synthetic, confidence: null, recognition: message.recognition, attribution, dedupKey, frame, crop, status: 'queued', dropReason: null };
    this.events.push(event);
    const seenKey = event.kind === 'loot' ? `${event.kind}:${event.dedupKey}` : `${event.kind}:${relation}:${event.dedupKey}`;
    if (Date.parse(event.validUntil) <= now) this.drop(event, 'expired');
    else if (duplicateItem || (this.seen.get(seenKey) ?? 0) > now) this.drop(event, 'duplicate');
    else {
      if (personal) this.personalNotifications.remember(namespace, message.eventKind as 'kill' | 'knockdown', message.personalSignature ?? null, dedupKey, now);
      if (loot) this.lootItems.remember(itemNamespace, message.lootSignature!, dedupKey, now);
      this.seen.set(seenKey, now + this.options.cfg.events.dedupMs);
      for (const [key, expires] of this.seen) if (expires <= now || this.seen.size > 256) this.seen.delete(key);
      const suppression = evaluateSpeech(this.speechConfig(), event, { nowMs: now, lastSelectedAtMs: this.lastSelectedAtMs,
        lastActivityAtMs: this.lastActivityAtMs, random: this.options.random ?? Math.random });
      if (suppression) this.drop(event, suppression);
      else {
        while (this.pending.length >= this.options.cfg.events.maxPending) this.drop(this.pending.shift()!, 'overflow');
        this.images.set(event.id, { full: new Uint8Array(full), crop: new Uint8Array(message.cropJpeg) });
        this.pending.push(event); this.scheduleWake();
      }
    }
    this.trimHistory();
    return { accepted: event.status !== 'dropped', reason: event.dropReason, eventId: event.id };
  }
  private drop(event: DeltaEvent, reason: DeltaDropReason): void { event.status = 'dropped'; event.dropReason = reason; this.images.delete(event.id); }
  private trimHistory(): void {
    const limit = Math.max(DELTA_MAX_HISTORY, this.options.cfg.events.maxPending);
    while (this.events.length > limit) {
      let index = this.events.findIndex((event) => event.status !== 'queued');
      if (index < 0) index = this.events.findIndex((event) => !this.inflight.has(event.id));
      if (index < 0) break;
      const removed = this.events.splice(index, 1)[0]!;
      if (removed.status === 'queued') this.drop(removed, 'overflow');
      this.pending = this.pending.filter((event) => event !== removed);
      this.images.delete(removed.id);
    }
  }
  private expire(): void {
    const now = Date.now();
    if (this.preview && this.preview.expiresAtMs <= now) this.preview = null;
    for (const event of this.events) if (Date.parse(event.validUntil) <= now) {
      if (event.status === 'queued') this.drop(event, 'expired');
      this.images.delete(event.id);
    }
    this.pending = this.pending.filter((event) => event.status === 'queued');
  }
  private scheduleWake(): void {
    if (!this.host || this.wake || !this.runIdle || !this.pending.length || this.phase !== 'running' || this.blocked(this.snapshot())) return;
    const wake = { generation: this.generation, token: randomUUID() }; this.wake = wake;
    const meta: Record<string, unknown> = { deltaEventIds: [] };
    this.host.pushDeferred({ type: 'delta.observation', senderKey: 'delta.observation', meta, render: () => {
      if (this.wake !== wake) return null;
      this.reconcile(); this.expire();
      this.wake = null;
      if (wake.generation !== this.generation || this.phase !== 'running' || this.blocked(this.snapshot())) {
        queueMicrotask(() => this.scheduleWake()); return null;
      }
      const nowMs = Date.now(), config = this.speechConfig();
      const batch = this.pending.splice(0).filter(event => {
        const suppression = evaluateSpeech({ ...config, probability: config.probability === 0 ? 0 : 1 }, event, { nowMs,
          lastSelectedAtMs: this.lastSelectedAtMs, lastActivityAtMs: this.lastActivityAtMs, random: () => 0 });
        if (suppression) this.drop(event, suppression);
        return suppression === null;
      });
      if (!batch.length) return null;
      if (batch.some(event => !event.synthetic)) this.lastSelectedAtMs = nowMs;
      meta.deltaEventIds = batch.map((event) => event.id);
      for (const event of batch) this.inflight.add(event.id);
      const blobs: BlobInput[] = [];
      for (const event of batch) {
        const images = this.images.get(event.id)!;
        for (const [index, bytes] of [images.full, images.crop].entries()) blobs.push({ bytes, mime: 'image/jpeg', fallbackText: `${event.id} ${index === 0 ? 'full' : 'crop'} frameId=${event.frame.frameId}` });
      }
      const knowledge = this.knowledge.current();
      return { text: observationText(batch, this.options.modelLanguage?.() ?? this.binding?.modelLanguage?.() ?? 'zh', {
        knowledge: selectKnowledge(knowledge, batch), source: this.knowledge.state().source, name: knowledge.name,
        version: knowledge.version, style: config.style,
      }), blobs };
    } }, { trigger: 'debounce' });
  }
  onRunPhase(phase: RunPhase): void {
    this.runIdle = phase.state === 'idle';
    if (this.runIdle) queueMicrotask(() => this.scheduleWake());
  }
  onEventsSettled(events: readonly EventEnvelope[], outcome: 'delivered' | 'discarded'): void {
    for (const envelope of events) {
      const ids = envelope.meta?.deltaEventIds;
      if (!Array.isArray(ids)) continue;
      for (const event of this.events) if (ids.includes(event.id) && event.status === 'queued') {
        this.inflight.delete(event.id);
        if (outcome === 'delivered') event.status = 'delivered'; else this.drop(event, 'policy-changed');
      }
    }
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
      source: this.frame?.display ?? null, configuredDisplayId: snapshot?.displayId ?? '',
      calibrationHotkey: this.calibrationHotkeyState(snapshot), gameAspectRatio: this.gameAspectRatio(),
      worker: { pid: this.worker?.pid ?? null, heartbeatAt: this.worker?.heartbeatAt ?? null, restarts: this.restarts, captures: this.captures },
      pending: this.pending.length, events: this.events, detection, loot, startupCheck: startupCheck(this.frame, this.options.cfg.detection, config),
      speech: { config: this.speechConfig(), lastSelectedAt: this.lastSelectedAtMs === null ? null : new Date(this.lastSelectedAtMs).toISOString(),
        lastActivityAt: this.lastActivityAtMs === null ? null : new Date(this.lastActivityAtMs).toISOString() }, knowledge: this.knowledge.state(),
      actions: { start: !!this.host && !!this.options.cfg.enabled && !blocked && (this.intent !== 'running' || this.exhausted),
        pause: this.intent === 'running', stop: this.intent !== 'stopped', simulate: this.phase === 'running' && this.worker !== null && this.frame !== null && !blocked } });
  }
  state(): DeltaState { this.reconcile(); this.expire(); return this.stateSnapshot(); }
  private async setIntent(intent: DeltaIntent, unavailable: string): Promise<DeltaState> {
    if (intent === 'running' && (!this.host || !this.options.cfg.enabled || this.blocked(this.snapshot()))) throw new Error(unavailable);
    this.invalidate('policy-changed');
    this.intent = intent; this.exhausted = false; this.retryAt = 0;
    if (intent === 'running') { this.restarts = 0; this.captures = 0; }
    this.options.persist({ observer: { enabled: intent === 'running' } });
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
    const decoded = jpeg.decode(capture.jpeg, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
    if (decoded.width !== capture.frame.width || decoded.height !== capture.frame.height) throw new Error(unavailable);
    this.preview = { capture, generation, aspectRatio, expiresAtMs: Date.now() + 30_000 };
    return structuredClone(capture.frame);
  }
  private validPreview(frameId: unknown): DeltaCapture | null {
    this.reconcile();
    const preview = this.preview;
    return typeof frameId === 'string' && preview && preview.capture.frame.frameId === frameId && preview.generation === this.generation
      && preview.expiresAtMs > Date.now() && this.phase === 'running' && !this.blocked(this.snapshot()) ? preview.capture : null;
  }
  private calibrationPolicy(snapshot = this.snapshot()): DeltaBindingSnapshot | null {
    return this.host && this.options.cfg.enabled && snapshot?.viewEnabled && snapshot.observationEnabled && snapshot.viewPermitted ? snapshot : null;
  }
  private gameAspectRatio() {
    const ratio = this.options.cfg.gameAspectRatio;
    return isGameAspectRatio(ratio) ? ratio : DEFAULT_GAME_ASPECT_RATIO;
  }
  private calibrationHotkeyState(snapshot: DeltaBindingSnapshot | null): DeltaCalibrationHotkeyState {
    const status = this.options.cfg.calibrationHotkeyEnabled === false ? 'disabled' : !this.calibrationPolicy(snapshot) ? 'blocked'
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
  private reconcileCalibrationHotkey(snapshot: DeltaBindingSnapshot | null): void {
    const port = this.binding?.calibrationHotkey;
    if (!port || this.options.cfg.calibrationHotkeyEnabled === false || !this.calibrationPolicy(snapshot)) {
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
  private async calibrationCapture(kind: CalibrationWorkerRequest['kind'], snapshot: DeltaBindingSnapshot, attemptId?: string): Promise<CalibrationWorkerResult> {
    const controller = new AbortController();
    this.calibrationRequest = { controller, attemptId };
    try {
      const operation = this.options.calibrationOperation ?? runCalibrationOperation;
      const result = await operation({ kind, displayId: snapshot.displayId, frameSourceModule: this.frameSourceModule(),
        gameAspectRatio: this.gameAspectRatio(), language: this.lootConfig().language || this.options.cfg.detection.language || 'zh-CN' }, controller.signal);
      this.reconcile();
      if (!controller.signal.aborted && this.calibrationPolicy()?.revision === snapshot.revision) return result;
    } catch { /* A one-time capture failure does not change observer state. */ }
    finally { this.calibrationRequest = null; }
    return { status: 'capture-unavailable' };
  }
  private async calibrationSuggest(attemptId?: string): Promise<DeltaCalibrationSuggestion> {
    this.reconcile();
    const snapshot = this.calibrationPolicy();
    if (!snapshot || this.calibrationRequest) return { status: 'capture-unavailable' };
    if (attemptId === undefined) this.clearCalibrationHotkeyAttempt();
    this.calibrationPreview = null;
    const result = await this.calibrationCapture('calibration-suggest', snapshot, attemptId);
    if (attemptId !== undefined && this.calibrationHotkeyAttempt?.id !== attemptId) return { status: 'capture-unavailable' };
    if (result.status === 'source' || result.status === 'capture-unavailable') return { status: 'capture-unavailable' };
    const { capture } = result;
    if (!capture) return result.status === 'ready' || result.status === 'inventory-ready' ? { status: 'capture-unavailable' } : { status: result.status };
    const { frame } = capture;
    if ((snapshot.displayId ? frame.display.id !== snapshot.displayId : !frame.display.primary)
      || (this.frame && !sameCalibrationSource(this.frame, frame)) || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) return { status: 'capture-unavailable' };
    try {
      const decoded = jpeg.decode(capture.jpeg, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
      if (decoded.width !== frame.width || decoded.height !== frame.height) return { status: 'capture-unavailable' };
    } catch { return { status: 'capture-unavailable' }; }
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
    this.calibrationPreview.regions = structuredClone(regions);
    return structuredClone({ status: 'ready', frame, nickname: null, expiresAt, ...(result.anchors && { anchors: result.anchors }), ...regions });
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
  private readableEventCapture(eventId: string, part: keyof Evidence): DeltaCapture | null {
    this.reconcile(); this.expire();
    const event = this.events.find((value) => value.id === eventId), images = this.images.get(eventId);
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
  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = deltaText(language);
    return { label: t.title, panels: [{ id: 'observer', title: t.panel }], config: deltaConfigGroups(language),
      invoke: async (panel, method, args) => {
        if (panel !== 'observer') throw new Error(t.errors.unknownMethod);
        if (method === 'calibrationAspectRatioConfigure') {
          if (args.length !== 1 || !isGameAspectRatio(args[0])) throw new Error(t.errors.invalidRequest);
          this.options.persist({ gameAspectRatio: args[0] });
          return this.state();
        }
        if (method === 'speechConfigure') {
          if (args.length !== 1 || !validateSpeechConfig(args[0])) throw new Error(t.errors.invalidRequest);
          const request = args[0];
          this.options.persist({ speech: { enabled: request.enabled, probability: request.probability, cooldownMs: request.cooldownMs, style: request.style,
            events: { kill: request.eventKinds.includes('kill'), knockdown: request.eventKinds.includes('knockdown'), loot: request.eventKinds.includes('loot') },
            attribution: { self: request.relations.includes('self'), teammate: request.relations.includes('teammate'), unknown: request.relations.includes('unknown') } } });
          return this.state();
        }
        if (['knowledgeRead', 'knowledgeImport', 'knowledgeReload', 'knowledgeRestore'].includes(method)) {
          if (method === 'knowledgeImport' ? args.length !== 1 : args.length !== 0) throw new Error(t.errors.invalidRequest);
          if (method === 'knowledgeRead') return this.knowledge.read();
          try {
            if (method === 'knowledgeImport') {
              const request = args[0] as DeltaKnowledgeImportRequest | null;
              if (!request || typeof request !== 'object' || typeof request.name !== 'string' || typeof request.content !== 'string') throw new Error('knowledge-invalid');
              this.knowledge.import(request.name, request.content);
            } else if (method === 'knowledgeReload') this.knowledge.reload();
            else this.knowledge.restore();
          } catch (error) {
            const code = error instanceof Error ? error.message : '';
            const messages: Record<string, string> = { 'knowledge-invalid': t.errors.knowledgeInvalid, 'knowledge-too-large': t.errors.knowledgeTooLarge,
              'knowledge-unavailable': t.errors.knowledgeUnavailable, 'knowledge-read-failed': t.errors.knowledgeReadFailed, 'knowledge-write-failed': t.errors.knowledgeWriteFailed };
            throw new Error(messages[code] ?? t.errors.knowledgeReadFailed);
          }
          return this.state();
        }
        if (['state', 'start', 'pause', 'stop'].includes(method)) {
          if (args.length) throw new Error(t.errors.invalidRequest);
          if (method === 'state') return this.state();
          return this.setIntent(method === 'start' ? 'running' : method === 'pause' ? 'paused' : 'stopped', t.errors.unavailable);
        }
        if (method === 'detectionConfigure') {
          const request = args[0] as DeltaDetectionConfigureRequest | null;
          if (args.length !== 1 || !request || typeof request !== 'object' || typeof request.enabled !== 'boolean'
            || typeof request.nickname !== 'string' || request.nickname.length > 64 || !['', 'zh-CN', 'en-US'].includes(request.language)) throw new Error(t.errors.invalidRequest);
          this.options.persist({ detection: { enabled: request.enabled, nickname: request.nickname.trim(), language: request.language } });
          this.reconcile(); return this.state();
        }
        if (method === 'lootConfigure') {
          const request = args[0] as DeltaLootConfigureRequest | null;
          if (args.length !== 1 || !request || typeof request !== 'object' || typeof request.enabled !== 'boolean'
            || !['', 'zh-CN', 'en-US'].includes(request.language) || !['conservative', 'balanced', 'sensitive'].includes(request.sensitivity)) throw new Error(t.errors.invalidRequest);
          this.options.persist({ loot: { enabled: request.enabled, language: request.language, sensitivity: request.sensitivity } });
          this.reconcile(); return this.state();
        }
        if (method === 'lootCalibrate') {
          const preview = this.validPreview(args[0]), itemsRoi = args[1] as DeltaRoi, contextRoi = args[2] as DeltaRoi;
          if (args.length !== 3 || !preview || !itemsRoi || !contextRoi) throw new Error(t.errors.invalidRequest);
          const calibration = { display: preview.frame.display, topologyRevision: preview.frame.topologyRevision, gameAspectRatio: this.gameAspectRatio(), itemsRoi, contextRoi };
          if (!lootCalibrationFitsBudget(calibration)) throw new Error(t.errors.invalidRequest);
          this.options.persist({ loot: { calibration } }); this.preview = null; this.reconcile(); return this.state();
        }
        if (method === 'calibrationSuggest') {
          if (args.length) throw new Error(t.errors.invalidRequest);
          return this.calibrationSuggest();
        }
        if (method === 'calibrationApply') {
          const request = args[0] as DeltaCalibrationApplyRequest | null;
          if (args.length !== 1 || !request || typeof request.frameId !== 'string') throw new Error(t.errors.invalidRequest);
          return this.calibrationApply(request, t.errors.invalidRequest, t.errors.unavailable);
        }
        if (method === 'calibrationDismiss') {
          if (args.length !== 1 || typeof args[0] !== 'string') throw new Error(t.errors.invalidRequest);
          if (this.calibrationHotkeyAttempt?.id === args[0]) this.clearCalibrationHotkeyAttempt();
          return this.state();
        }
        if (method === 'detectionPreview') {
          if (args.length) throw new Error(t.errors.invalidRequest);
          return this.detectionPreview(t.errors.unavailable);
        }
        if (method === 'detectionPreviewImage') {
          if (args.length !== 1) throw new Error(t.errors.invalidRequest);
          const preview = this.readablePreview(args[0]);
          if (!preview) throw new Error(t.errors.imageUnavailable);
          return { $binary: { mime: 'image/jpeg', base64: Buffer.from(preview.jpeg).toString('base64') } };
        }
        if (method === 'revealScreenshot') {
          const request = args[0] as DeltaScreenshotRevealRequest | null;
          if (args.length !== 1 || !request || typeof request !== 'object' || typeof request.frameId !== 'string'
            || (request.kind !== 'preview' && request.kind !== 'event')
            || (request.kind === 'event' && (typeof request.eventId !== 'string' || (request.part !== 'full' && request.part !== 'crop')))) {
            throw new Error(t.errors.invalidRequest);
          }
          const capture = request.kind === 'preview' ? this.readablePreview(request.frameId) : this.readableEventCapture(request.eventId, request.part);
          if (!capture || capture.frame.frameId !== request.frameId) throw new Error(t.errors.imageUnavailable);
          if (!this.screenshotReveal) throw new Error(t.errors.unavailable);
          try { await revealCapture(this.screenshotReveal, capture, request.kind === 'preview' ? 'preview' : request.part); }
          catch { throw new Error(t.errors.unavailable); }
          return {};
        }
        if (method === 'detectionCalibrate') {
          const roi = args[1] as DeltaRoi | null, personalFeedbackRoi = args[2] as DeltaRoi | null | undefined, preview = this.validPreview(args[0]);
          if ((args.length !== 2 && args.length !== 3) || !preview || !roi
            || (personalFeedbackRoi !== undefined && personalFeedbackRoi !== null && typeof personalFeedbackRoi !== 'object')) throw new Error(t.errors.invalidRequest);
          const calibration = { display: preview.frame.display, topologyRevision: preview.frame.topologyRevision, gameAspectRatio: this.gameAspectRatio(), roi,
            ...(args.length === 3 || this.options.cfg.detection.calibration?.personalFeedbackRoi ? { personalFeedbackRoi: personalFeedbackRoi ?? null } : {}) };
          try { if (!calibrationFitsBudget(calibration)) throw new Error(t.errors.invalidRequest); }
          catch { throw new Error(t.errors.invalidRequest); }
          this.options.persist({ detection: { calibration } });
          this.preview = null; this.reconcile(); return this.state();
        }
        if (method === 'simulate') {
          const request = args[0] as DeltaSimulateRequest | null;
          if (args.length !== 1 || !request || typeof request !== 'object' || !['kill', 'knockdown', 'loot'].includes(request.kind)
            || (request.dedupKey !== undefined && (typeof request.dedupKey !== 'string' || !request.dedupKey.trim() || request.dedupKey.length > 200))) throw new Error(t.errors.invalidRequest);
          return this.simulate(request, t.errors.unavailable);
        }
        if (method === 'eventImage') {
          const [eventId, part] = args;
          if (args.length !== 2 || typeof eventId !== 'string' || (part !== 'full' && part !== 'crop')) throw new Error(t.errors.invalidRequest);
          const capture = this.readableEventCapture(eventId, part);
          if (!capture) throw new Error(t.errors.imageUnavailable);
          return { $binary: { mime: 'image/jpeg', base64: Buffer.from(capture.jpeg).toString('base64') } };
        }
        throw new Error(t.errors.unknownMethod);
      } };
  }
}
