/** Delta observer panel `observer` and its versioned product binding. */
import type { CuaDisplay, CuaFrame } from 'cortico-world-desktop-pet';
import type { PersonalTextFallback } from './personal-text-fallback.ts';

export const DELTA_PROTOCOL_VERSION = 1;
export type DeltaKind = 'kill' | 'knockdown' | 'loot';
export interface DeltaSpeechConfig {
  enabled: boolean;
  probability: number;
  cooldownMs: number;
  eventKinds: DeltaKind[];
  relations: Array<'self' | 'teammate' | 'unknown'>;
  style: 'natural' | 'playful' | 'sassy';
}
export type DeltaSpeechSuppression = 'speech-disabled' | 'event-filtered' | 'attribution-filtered' | 'probability' | 'cooldown' | 'recent-activity';
export interface DeltaSpeechState {
  config: DeltaSpeechConfig;
  /** Last selected real observation batch, whether or not the model later speaks. */
  lastSelectedAt: string | null;
  /** Model text, refusal or tool-call activity, including unsuccessful attempts. */
  lastActivityAt: string | null;
}
export type DeltaKnowledgeError = 'knowledge-invalid' | 'knowledge-too-large' | 'knowledge-read-failed';
export interface DeltaKnowledgeState {
  source: 'builtin' | 'imported';
  name: string;
  version: string;
  bytes: number;
  characters: number;
  sections: string[];
  loadedAt: string;
  lastError: DeltaKnowledgeError | null;
  canImport: boolean;
}
export interface DeltaKnowledgeImportRequest { name: string; content: string }
export type DeltaIntent = 'stopped' | 'paused' | 'running';
export type DeltaPhase = 'unbound' | 'stopped' | 'starting' | 'running' | 'blocked' | 'error';
export type DeltaReason = 'unbound' | 'stopped' | 'paused' | 'view-disabled' | 'observation-disabled' | 'view-permission'
  | 'core-paused' | 'no-output' | 'no-image-model' | 'source-unavailable' | 'worker-failed' | 'heartbeat-timeout';

/** Coordinates relative to the selected physical display, from zero to one. */
export interface DeltaRoi { x: number; y: number; width: number; height: number }
export const DELTA_GAME_ASPECT_RATIOS = ['16:10', '16:9', '4:3', '5:4', '5:3', '3:2', '21:9', '32:9'] as const;
export type DeltaGameAspectRatio = typeof DELTA_GAME_ASPECT_RATIOS[number];
export const DEFAULT_GAME_ASPECT_RATIO: DeltaGameAspectRatio = '16:10';
export function isGameAspectRatio(value: unknown): value is DeltaGameAspectRatio {
  return DELTA_GAME_ASPECT_RATIOS.some(ratio => ratio === value);
}
export type DeltaGameLanguage = '' | 'zh-CN' | 'en-US';
export interface DeltaCalibration {
  display: CuaDisplay;
  topologyRevision: string;
  gameAspectRatio?: DeltaGameAspectRatio;
  roi: DeltaRoi;
  personalFeedbackRoi?: DeltaRoi | null;
}
export interface DeltaDetectionConfig {
  enabled: boolean;
  nickname: string;
  language: DeltaGameLanguage;
  calibration: DeltaCalibration | null;
}
export interface DeltaDetectionConfigureRequest {
  enabled: boolean;
  nickname: string;
  language: DeltaGameLanguage;
}
export type DeltaLootSensitivity = 'conservative' | 'balanced' | 'sensitive';
export type DeltaLootScene = 'loot' | 'container' | 'inventory';
export interface DeltaLootCalibration {
  display: CuaDisplay;
  topologyRevision: string;
  gameAspectRatio?: DeltaGameAspectRatio;
  itemsRoi: DeltaRoi;
  contextRoi: DeltaRoi;
}

export interface DeltaCalibrationRegions {
  combat: { roi: DeltaRoi; personalFeedbackRoi: DeltaRoi | null };
  loot: { itemsRoi: DeltaRoi; contextRoi: DeltaRoi };
}
export interface DeltaPreparationAnchors { start: DeltaRoi; actions: DeltaRoi }
export type DeltaPreparationRegionSource = 'preset' | 'saved' | 'estimated';
export type DeltaCalibrationDiagnostic = 'unsupported-layout' | 'scene-unrecognized' | 'ocr-unavailable';
export type DeltaCalibrationFailure = DeltaCalibrationDiagnostic | 'capture-unavailable';
export type DeltaCalibrationSuggestion = ({ status: 'ready'; frame: CuaFrame; expiresAt: string;
  /** @deprecated Retained as null for older calibration panels. */
  nickname: string | null;
  anchors?: DeltaPreparationAnchors;
  sources: { combat: DeltaPreparationRegionSource; loot: DeltaPreparationRegionSource } } & DeltaCalibrationRegions)
  | { status: 'inventory-ready'; frame: CuaFrame; expiresAt: string; loot: DeltaCalibrationRegions['loot']; sources: { loot: 'detected' } }
  | { status: 'preparation-only'; frame: CuaFrame; expiresAt: string; anchors: DeltaPreparationAnchors }
  | ({ status: DeltaCalibrationDiagnostic } & ({ frame: CuaFrame; expiresAt: string } | { frame?: never; expiresAt?: never }))
  | { status: 'capture-unavailable'; frame?: never; expiresAt?: never };
export interface DeltaCalibrationApplyRequest extends Partial<DeltaCalibrationRegions> {
  frameId: string;
  /** @deprecated Ignored. The combat nickname is managed by detectionConfigure. */
  nickname?: string;
}
export type DeltaCalibrationHotkeyRegistration = 'registered' | 'occupied' | 'unavailable';
export interface DeltaCalibrationHotkeyPort {
  register(onPress: () => void, onStatus: (status: DeltaCalibrationHotkeyRegistration) => void): () => void;
}
export interface DeltaCalibrationHotkeyState {
  status: DeltaCalibrationHotkeyRegistration | 'disabled' | 'blocked' | 'registering';
  attempt: { id: string; result: DeltaCalibrationSuggestion | { status: 'capturing' } } | null;
}

export interface DeltaLootConfig {
  enabled: boolean;
  language: DeltaGameLanguage;
  sensitivity: DeltaLootSensitivity;
  calibration: DeltaLootCalibration | null;
}
export type DeltaLootConfigureRequest = Pick<DeltaLootConfig, 'enabled' | 'language' | 'sensitivity'>;
export interface DeltaLootState {
  config: DeltaLootConfig;
  phase: 'disabled' | 'uncalibrated' | 'paused' | 'starting' | 'ready' | 'unavailable' | 'error';
  reason: 'language-required' | 'calibration-required' | 'source-changed' | 'roi-too-large' | 'ocr-unavailable' | 'ocr-language-unavailable' | 'language-conflict' | null;
  engine: 'windows-ocr' | null;
  availableLanguages: string[];
  scans: number;
  candidates: number;
  scene: DeltaLootScene | null;
  lastError: string | null;
}
export interface DeltaDetectionState {
  config: DeltaDetectionConfig;
  phase: 'disabled' | 'uncalibrated' | 'paused' | 'starting' | 'ready' | 'unavailable' | 'error';
  reason: 'nickname-required' | 'language-required' | 'calibration-required' | 'source-changed' | 'roi-too-large' | 'ocr-unavailable' | 'ocr-language-unavailable'
    | 'feedback-language-unsupported' | null;
  engine: 'windows-ocr' | null;
  availableLanguages: string[];
  scans: number;
  candidates: number;
  confirmed: number;
  lastError: string | null;
}

export interface DeltaStartupCalibrationState {
  status: 'disabled' | 'pending' | 'missing' | 'compatible' | 'invalid';
  reason: 'calibration-required' | 'display-changed' | 'resolution-changed' | 'aspect-changed' | 'scale-changed'
    | 'geometry-changed' | 'topology-changed' | 'roi-too-large' | null;
}
/** Geometry compatibility does not verify that the saved regions contain the game UI. */
export interface DeltaStartupCheck {
  phase: 'pending' | 'checked';
  checkedAt: string | null;
  source: {
    displayId: string;
    width: number;
    height: number;
    aspectRatio: number;
    aspectClass: '16:9' | '16:10' | '21:9' | 'other';
    scaleFactor: number | null;
    rotation: number | null;
    topologyRevision: string;
  } | null;
  detection: DeltaStartupCalibrationState;
  loot: DeltaStartupCalibrationState;
}

export interface DeltaBindingSnapshot {
  /** Changes whenever the product's viewing policy or selected source changes. */
  revision: string;
  viewEnabled: boolean;
  observationEnabled: boolean;
  viewPermitted: boolean;
  corePaused: boolean;
  outputAvailable: boolean;
  /** Empty retains the desktop-pet default of selecting the current primary display. */
  displayId: string;
}

export interface DeltaProductBinding {
  version: 1;
  /** Absolute module URL supplied by a host whose capture implementation is outside the extension. */
  frameSourceModule?: string;
  calibrationHotkey?: DeltaCalibrationHotkeyPort;
  modelLanguage?(): 'zh' | 'en';
  snapshot(): DeltaBindingSnapshot;
  subscribe?(listener: () => void): () => void;
}

export interface DeltaSimulateRequest { kind: DeltaKind; dedupKey?: string }
export type DeltaDropReason = 'expired' | 'duplicate' | 'overflow' | 'policy-changed' | 'worker-failed' | 'source-changed' | DeltaSpeechSuppression;
export type DeltaRecognition = { kind: 'actor-text'; text: string; actor: string; target: string }
  | { kind: 'personal-feedback-text'; text: string;
      /** Empty when the target text was not recognized; the action remains explicit. */
      target: string; preprocessing?: PersonalTextFallback }
  | { kind: 'loot-candidate'; text: string; target: ''; scene: DeltaLootScene; basis: 'red-grid-ui'; quality: 'unconfirmed'; itemName: null };
export interface DeltaAttribution {
  relation: 'self' | 'teammate' | 'unknown';
  basis: 'actor-text' | 'personal-feedback' | 'assist-text' | 'spectator-hud' | 'unknown';
  /** The visible notification contains an assist prefix; the assisting player is not identified. */
  assisted: boolean;
  spectating: boolean;
}
export interface DeltaEvent {
  id: string;
  kind: DeltaKind;
  capturedAt: string;
  validUntil: string;
  generation: number;
  synthetic: boolean;
  confidence: number | null;
  recognition: DeltaRecognition | null;
  /** Missing or null on legacy and synthetic events means unknown ownership. */
  attribution?: DeltaAttribution | null;
  dedupKey: string;
  frame: CuaFrame;
  /** Rectangle in full JPEG pixels; frame.transform maps it to physical desktop pixels. */
  crop: { x: number; y: number; width: number; height: number };
  status: 'queued' | 'delivered' | 'dropped';
  dropReason: DeltaDropReason | null;
}

export interface DeltaState {
  generation: number;
  intent: DeltaIntent;
  phase: DeltaPhase;
  reason: DeltaReason | null;
  startBlockedReason?: DeltaReason | null;
  bound: boolean;
  source: CuaDisplay | null;
  configuredDisplayId: string;
  gameAspectRatio: DeltaGameAspectRatio;
  calibrationHotkey?: DeltaCalibrationHotkeyState;
  worker: { pid: number | null; heartbeatAt: string | null; restarts: number; captures: number };
  pending: number;
  events: DeltaEvent[];
  detection: DeltaDetectionState;
  loot: DeltaLootState;
  startupCheck: DeltaStartupCheck;
  speech: DeltaSpeechState;
  knowledge: DeltaKnowledgeState;
  actions: { start: boolean; pause: boolean; stop: boolean; simulate: boolean };
}

export interface DeltaSimulationReceipt { accepted: boolean; reason: DeltaDropReason | null; eventId: string | null; state: DeltaState }
export type DeltaScreenshotRevealRequest = { kind: 'preview'; frameId: string }
  | { kind: 'event'; eventId: string; frameId: string; part: 'full' | 'crop' };

export interface DeltaPanelMethods {
  speechConfigure: { args: [request: DeltaSpeechConfig]; result: DeltaState };
  knowledgeRead: { args: []; result: { content: string; state: DeltaKnowledgeState } };
  knowledgeImport: { args: [request: DeltaKnowledgeImportRequest]; result: DeltaState };
  knowledgeReload: { args: []; result: DeltaState };
  knowledgeRestore: { args: []; result: DeltaState };
  state: { args: []; result: DeltaState };
  start: { args: []; result: DeltaState };
  pause: { args: []; result: DeltaState };
  stop: { args: []; result: DeltaState };
  simulate: { args: [request: DeltaSimulateRequest]; result: DeltaSimulationReceipt };
  eventImage: { args: [eventId: string, image: 'full' | 'crop']; result: { $binary: { mime: 'image/jpeg'; base64: string } } };
  detectionConfigure: { args: [request: DeltaDetectionConfigureRequest]; result: DeltaState };
  calibrationSuggest: { args: []; result: DeltaCalibrationSuggestion };
  calibrationAspectRatioConfigure: { args: [ratio: DeltaGameAspectRatio]; result: DeltaState };
  calibrationApply: { args: [request: DeltaCalibrationApplyRequest]; result: DeltaState };
  calibrationDismiss: { args: [attemptId: string]; result: DeltaState };
  detectionPreview: { args: []; result: CuaFrame };
  detectionPreviewImage: { args: [frameId: string]; result: { $binary: { mime: 'image/jpeg'; base64: string } } };
  revealScreenshot: { args: [request: DeltaScreenshotRevealRequest]; result: Record<string, never> };
  detectionCalibrate: { args: [frameId: string, roi: DeltaRoi, personalFeedbackRoi?: DeltaRoi | null]; result: DeltaState };
  lootConfigure: { args: [request: DeltaLootConfigureRequest]; result: DeltaState };
  lootCalibrate: { args: [frameId: string, itemsRoi: DeltaRoi, contextRoi: DeltaRoi]; result: DeltaState };
}
