/** Panel methods validate JSON arguments, then call the World operations they name. */
import type { CuaDisplay, CuaFrame } from 'cortico-world-desktop-pet';
import type { DeepPartial } from 'cortico/world.ts';
import type { DeltaConfigSection } from './config.ts';
import { calibrationFitsBudget } from './detector.ts';
import type { DeltaCapture } from './engine-ipc.ts';
import type { DeltaText } from './i18n/index.ts';
import { lootCalibrationFitsBudget } from './loot-detector.ts';
import { validIdentityNickname } from './profile-identity.ts';
import { isGameAspectRatio, type DeltaCalibration, type DeltaCalibrationApplyRequest, type DeltaCalibrationSuggestion, type DeltaDetectionConfigureRequest, type DeltaGameAspectRatio, type DeltaIntent, type DeltaKnowledgeImportRequest, type DeltaLootConfigureRequest, type DeltaPanelMethods, type DeltaQuickSetupRequest, type DeltaScreenshotRevealRequest, type DeltaSimulateRequest, type DeltaSimulationReceipt, type DeltaSpeechConfig, type DeltaState } from './protocol.ts';
import { validateSpeechConfig } from './speech.ts';

export interface DeltaPanelHost {
  readonly errors: DeltaText['errors'];
  identitySuggest(): Promise<DeltaPanelMethods['identitySuggest']['result']>;
  openIdentityLog(): Promise<void>;
  saveIdentity(nickname: string): DeltaState;
  persist(patch: DeepPartial<DeltaConfigSection>): void;
  state(): DeltaState;
  readKnowledge(): DeltaPanelMethods['knowledgeRead']['result'];
  importKnowledge(name: string, content: string): void;
  reloadKnowledge(): void;
  restoreKnowledge(): void;
  listStandaloneDisplays(): Promise<CuaDisplay[]>;
  authorizeStandalone(displayId: string, calibrationOnly: boolean): Promise<DeltaState>;
  cancelCalibration(): DeltaState;
  hasBinding(): boolean;
  setIntent(intent: DeltaIntent): Promise<DeltaState>;
  reconcile(): void;
  previewForSave(frameId: unknown): Promise<DeltaCapture | null>;
  calibrationSource(capture: DeltaCapture): { display: DeltaCalibration['display']; topologyRevision: string; gameAspectRatio: DeltaGameAspectRatio };
  clearManualPreview(): void;
  calibrationSuggest(): Promise<DeltaCalibrationSuggestion>;
  calibrationApply(request: DeltaCalibrationApplyRequest): Promise<DeltaState>;
  dismissCalibration(attemptId: string): DeltaState;
  detectionPreview(): Promise<CuaFrame>;
  readablePreview(frameId: unknown): DeltaCapture | null;
  readableEventCapture(eventId: string, part: 'full' | 'crop'): DeltaCapture | null;
  canReveal(): boolean;
  reveal(capture: DeltaCapture, part: 'preview' | 'full' | 'crop'): Promise<void>;
  savedPersonalFeedback(): boolean;
  simulate(request: DeltaSimulateRequest): Promise<DeltaSimulationReceipt>;
}

type Entry<M extends keyof DeltaPanelMethods> = {
  validate(args: unknown[]): DeltaPanelMethods[M]['args'] | null;
  handle(host: DeltaPanelHost, args: DeltaPanelMethods[M]['args']): Promise<DeltaPanelMethods[M]['result']> | DeltaPanelMethods[M]['result'];
};

const none = (args: unknown[]): [] | null => args.length ? null : [];
const language = (value: unknown): value is 'zh-CN' | 'en-US' => value === 'zh-CN' || value === 'en-US';
const configuredLanguage = (value: unknown): value is '' | 'zh-CN' | 'en-US' => value === '' || language(value);
const jpeg = (bytes: Uint8Array) => ({ $binary: { mime: 'image/jpeg' as const, base64: Buffer.from(bytes).toString('base64') } });

const object = (value: unknown): boolean => !!value && typeof value === 'object';

function knowledgeError(error: unknown, errors: DeltaText['errors']): Error {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = { 'knowledge-invalid': errors.knowledgeInvalid, 'knowledge-too-large': errors.knowledgeTooLarge,
    'knowledge-unavailable': errors.knowledgeUnavailable, 'knowledge-read-failed': errors.knowledgeReadFailed, 'knowledge-write-failed': errors.knowledgeWriteFailed };
  return new Error(messages[code] ?? errors.knowledgeReadFailed);
}

function runKnowledge(host: DeltaPanelHost, work: () => void): DeltaState {
  try { work(); } catch (error) { throw knowledgeError(error, host.errors); }
  return host.state();
}

function displayId(args: unknown[]): [string] | null {
  const id = args[0];
  return args.length === 1 && typeof id === 'string' && !!id.trim() && id.length <= 1024 ? [id] : null;
}

function detectionRequest(args: unknown[]): [DeltaDetectionConfigureRequest] | null {
  if (args.length !== 1 || !object(args[0])) return null;
  const request = args[0] as DeltaDetectionConfigureRequest;
  return typeof request.enabled === 'boolean' && typeof request.nickname === 'string' && request.nickname.length <= 64 && configuredLanguage(request.language) ? [request] : null;
}

function lootRequest(args: unknown[]): [DeltaLootConfigureRequest] | null {
  if (args.length !== 1 || !object(args[0])) return null;
  const request = args[0] as DeltaLootConfigureRequest;
  return typeof request.enabled === 'boolean' && configuredLanguage(request.language)
    && (request.sensitivity === 'conservative' || request.sensitivity === 'balanced' || request.sensitivity === 'sensitive') ? [request] : null;
}

function quickSetup(args: unknown[]): [DeltaQuickSetupRequest] | null {
  if (args.length !== 1 || !object(args[0])) return null;
  const request = args[0] as DeltaQuickSetupRequest;
  return typeof request.combat === 'boolean' && typeof request.loot === 'boolean' && (request.combat || request.loot) && language(request.language) ? [request] : null;
}

function simulateRequest(args: unknown[]): [DeltaSimulateRequest] | null {
  if (args.length !== 1 || !object(args[0])) return null;
  const request = args[0] as DeltaSimulateRequest;
  if (request.kind !== 'kill' && request.kind !== 'knockdown' && request.kind !== 'loot') return null;
  if (request.dedupKey !== undefined && (typeof request.dedupKey !== 'string' || !request.dedupKey.trim() || request.dedupKey.length > 200)) return null;
  return [request];
}

function revealRequest(args: unknown[]): [DeltaScreenshotRevealRequest] | null {
  if (args.length !== 1 || !object(args[0])) return null;
  const request = args[0] as DeltaScreenshotRevealRequest;
  if (typeof request.frameId !== 'string' || (request.kind !== 'preview' && request.kind !== 'event')) return null;
  if (request.kind === 'event' && (typeof request.eventId !== 'string' || (request.part !== 'full' && request.part !== 'crop'))) return null;
  return [request];
}

const table = {
  identitySuggest: { validate: none, handle: (host) => host.identitySuggest() },
  identityDebugReveal: { validate: none, async handle(host) {
    try { await host.openIdentityLog(); } catch { throw new Error(host.errors.unavailable); }
    return { ok: true as const };
  } },
  identitySave: { validate: (args): [string] | null => args.length === 1 && validIdentityNickname(args[0]) ? [args[0]] : null,
    handle: (host, [nickname]) => host.saveIdentity(nickname) },
  speechConfigure: { validate: (args): [DeltaSpeechConfig] | null => args.length === 1 && validateSpeechConfig(args[0]) ? [args[0]] : null,
    handle(host, [request]) {
      host.persist({ speech: { enabled: request.enabled, probability: request.probability, cooldownMs: request.cooldownMs, style: request.style,
        events: { kill: request.eventKinds.includes('kill'), knockdown: request.eventKinds.includes('knockdown'), loot: request.eventKinds.includes('loot') },
        attribution: { self: request.relations.includes('self'), teammate: request.relations.includes('teammate'), unknown: request.relations.includes('unknown') } } });
      return host.state();
    } },
  knowledgeRead: { validate: none, handle: (host) => host.readKnowledge() },
  knowledgeImport: { validate: (args): [DeltaKnowledgeImportRequest] | null => args.length === 1 ? [args[0] as DeltaKnowledgeImportRequest] : null,
    handle(host, [request]) {
      return runKnowledge(host, () => {
        if (!request || typeof request !== 'object' || typeof request.name !== 'string' || typeof request.content !== 'string') throw new Error('knowledge-invalid');
        host.importKnowledge(request.name, request.content);
      });
    } },
  knowledgeReload: { validate: none, handle: (host) => runKnowledge(host, () => { host.reloadKnowledge(); }) },
  knowledgeRestore: { validate: none, handle: (host) => runKnowledge(host, () => { host.restoreKnowledge(); }) },
  state: { validate: none, handle: (host) => host.state() },
  start: { validate: none, handle(host) { if (!host.hasBinding()) throw new Error(host.errors.unavailable); return host.setIntent('running'); } },
  listStandaloneDisplays: { validate: none, handle: (host) => host.listStandaloneDisplays() },
  prepareCalibration: { validate: displayId, handle: (host, [id]) => host.authorizeStandalone(id, true) },
  cancelCalibration: { validate: none, handle: (host) => host.cancelCalibration() },
  quickSetupConfigure: { validate: quickSetup, handle(host, [request]) {
    host.persist({ detection: { enabled: request.combat, ...(request.combat && { language: request.language }) },
      loot: { enabled: request.loot, ...(request.loot && { language: request.language }) } });
    return host.state();
  } },
  startStandalone: { validate: displayId, handle: (host, [id]) => host.authorizeStandalone(id, false) },
  pause: { validate: none, handle: (host) => host.setIntent('paused') },
  stop: { validate: none, handle: (host) => host.setIntent('stopped') },
  simulate: { validate: simulateRequest, handle: (host, [request]) => host.simulate(request) },
  eventImage: { validate: (args): [string, 'full' | 'crop'] | null => {
    const [eventId, part] = args;
    return args.length === 2 && typeof eventId === 'string' && (part === 'full' || part === 'crop') ? [eventId, part] : null;
  }, handle(host, [eventId, part]) {
    const capture = host.readableEventCapture(eventId, part);
    if (!capture) throw new Error(host.errors.imageUnavailable);
    return jpeg(capture.jpeg);
  } },
  detectionConfigure: { validate: detectionRequest, handle(host, [request]) {
    host.persist({ detection: { enabled: request.enabled, nickname: request.nickname.trim(), language: request.language } });
    host.reconcile(); return host.state();
  } },
  calibrationSuggest: { validate: none, handle: (host) => host.calibrationSuggest() },
  calibrationAspectRatioConfigure: { validate: (args): [DeltaGameAspectRatio] | null => args.length === 1 && isGameAspectRatio(args[0]) ? [args[0]] : null,
    handle(host, [ratio]) { host.persist({ gameAspectRatio: ratio }); return host.state(); } },
  calibrationApply: { validate: (args): [DeltaCalibrationApplyRequest] | null => {
    const request = args[0] as DeltaCalibrationApplyRequest | null;
    return args.length === 1 && !!request && typeof request === 'object' && typeof request.frameId === 'string' ? [request] : null;
  }, handle: (host, [request]) => host.calibrationApply(request) },
  calibrationDismiss: { validate: (args): [string] | null => args.length === 1 && typeof args[0] === 'string' ? [args[0]] : null,
    handle: (host, [attemptId]) => host.dismissCalibration(attemptId) },
  detectionPreview: { validate: none, handle: (host) => host.detectionPreview() },
  detectionPreviewImage: { validate: (args): [string] | null => args.length === 1 ? [args[0] as string] : null, handle(host, [frameId]) {
    const preview = host.readablePreview(frameId);
    if (!preview) throw new Error(host.errors.imageUnavailable);
    return jpeg(preview.jpeg);
  } },
  revealScreenshot: { validate: revealRequest, async handle(host, [request]) {
    const capture = request.kind === 'preview' ? host.readablePreview(request.frameId) : host.readableEventCapture(request.eventId, request.part);
    if (!capture || capture.frame.frameId !== request.frameId) throw new Error(host.errors.imageUnavailable);
    if (!host.canReveal()) throw new Error(host.errors.unavailable);
    try { await host.reveal(capture, request.kind === 'preview' ? 'preview' : request.part); }
    catch { throw new Error(host.errors.unavailable); }
    return {};
  } },
  detectionCalibrate: {
    validate: (args) => args as DeltaPanelMethods['detectionCalibrate']['args'],
    async handle(host, args) {
      const roi = args[1], personalFeedbackRoi = args[2], preview = await host.previewForSave(args[0]);
      if ((args.length !== 2 && args.length !== 3) || !preview || !roi
        || (personalFeedbackRoi !== undefined && personalFeedbackRoi !== null && typeof personalFeedbackRoi !== 'object')) throw new Error(host.errors.invalidRequest);
      const calibration = { ...host.calibrationSource(preview), roi,
        ...(args.length === 3 || host.savedPersonalFeedback() ? { personalFeedbackRoi: personalFeedbackRoi ?? null } : {}) };
      try { if (!calibrationFitsBudget(calibration)) throw new Error(host.errors.invalidRequest); }
      catch { throw new Error(host.errors.invalidRequest); }
      host.persist({ detection: { calibration } });
      host.clearManualPreview(); host.reconcile(); return host.state();
    },
  },
  lootConfigure: { validate: lootRequest, handle(host, [request]) {
    host.persist({ loot: { enabled: request.enabled, language: request.language, sensitivity: request.sensitivity } });
    host.reconcile(); return host.state();
  } },
  lootCalibrate: {
    validate: (args) => args as DeltaPanelMethods['lootCalibrate']['args'],
    async handle(host, args) {
      const preview = await host.previewForSave(args[0]), itemsRoi = args[1], contextRoi = args[2];
      if (args.length !== 3 || !preview || !itemsRoi || !contextRoi) throw new Error(host.errors.invalidRequest);
      const calibration = { ...host.calibrationSource(preview), itemsRoi, contextRoi };
      if (!lootCalibrationFitsBudget(calibration)) throw new Error(host.errors.invalidRequest);
      host.persist({ loot: { calibration } });
      host.clearManualPreview(); host.reconcile(); return host.state();
    },
  },
} satisfies { [M in keyof DeltaPanelMethods]: Entry<M> };

export async function invokePanel(host: DeltaPanelHost, panel: string, method: string, args: unknown[]): Promise<unknown> {
  if (panel !== 'observer' || !Object.hasOwn(table, method)) throw new Error(host.errors.unknownMethod);
  const entry = table[method as keyof DeltaPanelMethods];
  const parsed = entry.validate(args);
  if (parsed === null) throw new Error(host.errors.invalidRequest);
  return (entry.handle as (host: DeltaPanelHost, args: typeof parsed) => unknown)(host, parsed);
}
