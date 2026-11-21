/** The delta World's capture cadence, event limits and bounded worker recovery. */
import type { Language } from 'cortico/core/language.ts';
import type { ConfigGroup } from 'cortico/core/types.ts';
import type { WorldSection } from 'cortico/world.ts';
import { deltaText } from './i18n/index.ts';
import { configGroupText } from './i18n/config-groups.ts';
import type { DeltaDetectionConfig, DeltaLootConfig, DeltaSpeechConfig } from './protocol.ts';
import { DEFAULT_GAME_ASPECT_RATIO, DELTA_GAME_ASPECT_RATIOS, type DeltaGameAspectRatio } from './protocol.ts';

export interface DeltaSpeechSettings extends Omit<DeltaSpeechConfig, 'eventKinds' | 'relations'> {
  events: Record<DeltaSpeechConfig['eventKinds'][number], boolean>;
  attribution: Record<DeltaSpeechConfig['relations'][number], boolean>;
}
export interface DeltaConfigSection extends WorldSection {
  observer: { enabled: boolean };
  captureIntervalMs: number;
  calibrationHotkeyEnabled: boolean;
  gameAspectRatio: DeltaGameAspectRatio;
  detection: DeltaDetectionConfig;
  loot: DeltaLootConfig;
  speech: DeltaSpeechSettings;
  events: { maxPending: number; ttlMs: number; dedupMs: number };
  worker: { heartbeatMs: number; heartbeatTimeoutMs: number; restartDelayMs: number; maxRestarts: number };
}
export const DELTA_SPEECH_DEFAULTS: DeltaSpeechConfig = {
  enabled: true, probability: 0.5, cooldownMs: 45_000, eventKinds: ['kill', 'knockdown', 'loot'], relations: ['self'], style: 'playful',
};
export const DELTA_DEFAULTS: DeltaConfigSection = {
  enabled: false, observer: { enabled: false }, captureIntervalMs: 1000, calibrationHotkeyEnabled: true, gameAspectRatio: DEFAULT_GAME_ASPECT_RATIO,
  detection: { enabled: false, nickname: '', language: '', calibration: null },
  loot: { enabled: false, language: '', sensitivity: 'balanced', calibration: null },
  speech: { enabled: DELTA_SPEECH_DEFAULTS.enabled, probability: DELTA_SPEECH_DEFAULTS.probability,
    cooldownMs: DELTA_SPEECH_DEFAULTS.cooldownMs, style: DELTA_SPEECH_DEFAULTS.style,
    events: { kill: true, knockdown: true, loot: true }, attribution: { self: true, teammate: false, unknown: false } },
  events: { maxPending: 8, ttlMs: 15_000, dedupMs: 60_000 },
  worker: { heartbeatMs: 500, heartbeatTimeoutMs: 4000, restartDelayMs: 250, maxRestarts: 2 },
};
export { DELTA_MAX_JPEG_BYTES, DELTA_MAX_HISTORY, DELTA_CONTROL_INTERVAL_MS } from './limits.ts';

const SPEECH_STYLE_OPTIONS = 'delta-speech-style';

export function deltaConfigOptions(kind: string, language: Language): Array<{ value: string; label: string }> {
  if (kind !== SPEECH_STYLE_OPTIONS) return [];
  return Object.entries(deltaText(language).speechStyles).map(([value, label]) => ({ value, label }));
}

export function deltaConfigGroups(language: Language = 'zh'): ConfigGroup[] {
  const t = deltaText(language), labels = configGroupText(language);
  const owner = 'world:delta';
  const integer = (title: string, minimum: number, maximum: number) => ({ type: 'integer' as const, title, minimum, maximum, 'x-hot': true as const });
  const duration = (title: string, minimum: number, maximum: number) => ({
    ...integer(title, minimum, maximum), multipleOf: 1, 'x-scale': 1000, 'x-suffix': t.seconds,
  });
  const group = (id: string, title: string, fields: ConfigGroup['schema']['properties']): ConfigGroup => ({
    id, owner, schema: { type: 'object', title,
      properties: Object.fromEntries(Object.entries(fields).map(([path, field]) => [`worlds.delta.${path}`, field])) },
  });
  return [
    group(owner, labels.observation, {
      'observer.enabled': { type: 'boolean', title: t.observer, 'x-hot': true },
      captureIntervalMs: duration(t.captureIntervalMs, 20, 10_000),
      gameAspectRatio: { type: 'string', title: labels.gameAspectRatio, description: labels.gameAspectRatioDescription, enum: [...DELTA_GAME_ASPECT_RATIOS], 'x-hot': true },
      calibrationHotkeyEnabled: { type: 'boolean', title: labels.hotkey, description: labels.hotkeyDescription, 'x-hot': true },
    }),
    group(`${owner}.detection`, labels.combat, {
      'detection.enabled': { type: 'boolean', title: t.detectionEnabled, 'x-hot': true },
      'detection.nickname': { type: 'string', title: t.detectionNickname, 'x-hot': true },
      'detection.language': { type: 'string', title: t.detectionLanguage, enum: ['', 'zh-CN', 'en-US'], 'x-hot': true },
    }),
    group(`${owner}.loot`, labels.loot, {
      'loot.enabled': { type: 'boolean', title: t.lootEnabled, 'x-hot': true },
      'loot.language': { type: 'string', title: t.lootLanguage, enum: ['', 'zh-CN', 'en-US'], 'x-hot': true },
      'loot.sensitivity': { type: 'string', title: t.lootSensitivity, enum: ['conservative', 'balanced', 'sensitive'], 'x-hot': true },
    }),
    group(`${owner}.speech`, labels.speech, {
      'speech.enabled': { type: 'boolean', title: t.speechEnabled, 'x-hot': true },
      'speech.style': { type: 'string', title: t.speechStyle, enum: Object.keys(t.speechStyles), 'x-options': SPEECH_STYLE_OPTIONS, 'x-hot': true },
      'speech.probability': { type: 'number', title: t.speechProbability, minimum: 0, maximum: 1, 'x-hot': true },
      'speech.cooldownMs': duration(t.speechCooldownMs, 0, 600_000),
      'speech.events.kill': { type: 'boolean', title: t.speechKill, 'x-hot': true },
      'speech.events.knockdown': { type: 'boolean', title: t.speechKnockdown, 'x-hot': true },
      'speech.events.loot': { type: 'boolean', title: t.speechLoot, 'x-hot': true },
      'speech.attribution.self': { type: 'boolean', title: t.speechSelf, 'x-hot': true },
      'speech.attribution.teammate': { type: 'boolean', title: t.speechTeammate, 'x-hot': true },
      'speech.attribution.unknown': { type: 'boolean', title: t.speechUnknown, 'x-hot': true },
    }),
    group(`${owner}.advanced`, labels.advanced, {
      'events.maxPending': integer(t.maxPending, 1, 64),
      'events.ttlMs': duration(t.ttlMs, 50, 300_000),
      'events.dedupMs': duration(t.dedupMs, 0, 300_000),
      'worker.heartbeatMs': duration(t.heartbeatMs, 20, 5000),
      'worker.heartbeatTimeoutMs': duration(t.heartbeatTimeoutMs, 100, 30_000),
      'worker.restartDelayMs': duration(t.restartDelayMs, 20, 10_000),
      'worker.maxRestarts': integer(t.maxRestarts, 0, 3),
    }),
  ];
}
