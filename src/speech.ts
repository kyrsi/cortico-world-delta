/** Selection limits wake frequency; a selected observation does not require a reply. */
import type { DeltaEvent, DeltaSpeechConfig, DeltaSpeechSuppression } from './protocol.ts';

export function validateSpeechConfig(value: unknown): value is DeltaSpeechConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as DeltaSpeechConfig;
  return typeof config.enabled === 'boolean' && Number.isFinite(config.probability) && config.probability >= 0 && config.probability <= 1
    && Number.isInteger(config.cooldownMs) && config.cooldownMs >= 0 && config.cooldownMs <= 600_000
    && Array.isArray(config.eventKinds) && config.eventKinds.length <= 3 && new Set(config.eventKinds).size === config.eventKinds.length
    && config.eventKinds.every(kind => ['kill', 'knockdown', 'loot'].includes(kind))
    && Array.isArray(config.relations) && config.relations.length <= 3 && new Set(config.relations).size === config.relations.length
    && config.relations.every(relation => ['self', 'teammate', 'unknown'].includes(relation))
    && ['natural', 'playful', 'sassy'].includes(config.style);
}

export interface SpeechEvaluation {
  nowMs: number;
  lastSelectedAtMs: number | null;
  lastActivityAtMs: number | null;
  random(): number;
}
export function evaluateSpeech(config: DeltaSpeechConfig, event: DeltaEvent, context: SpeechEvaluation): DeltaSpeechSuppression | null {
  if (event.synthetic) return null;
  if (!config.enabled) return 'speech-disabled';
  if (!config.eventKinds.includes(event.kind)) return 'event-filtered';
  if (event.kind !== 'loot' && !config.relations.includes(event.attribution?.relation ?? 'unknown')) return 'attribution-filtered';
  if (context.lastActivityAtMs !== null && context.nowMs - context.lastActivityAtMs < config.cooldownMs) return 'recent-activity';
  if (context.lastSelectedAtMs !== null && context.nowMs - context.lastSelectedAtMs < config.cooldownMs) return 'cooldown';
  if (config.probability === 0 || (config.probability < 1 && context.random() >= config.probability)) return 'probability';
  return null;
}
