/** IPC images and retained event metadata have fixed memory bounds. */
export const DELTA_MAX_JPEG_BYTES = 2 * 1024 * 1024;
export const DELTA_MAX_HISTORY = 20;
export const DELTA_CONTROL_INTERVAL_MS = 50;
export const DELTA_MAX_ROI_AREA = 0.25;
export const DELTA_MAX_ROI_PIXELS = 2_000_000;
export const DELTA_MAX_LOOT_ITEMS_PIXELS = 1_500_000;
export const DELTA_MAX_LOOT_CONTEXT_PIXELS = 128_000;
export const DELTA_MAX_LOOT_ROI_AREA = 0.5;
export const DELTA_LOOT_SAMPLE_INTERVAL_MS = 2000;
export const DELTA_MAX_LOOT_CANDIDATES = 4;
export const DELTA_MAX_LOOT_REFERENCES = 32;
export const DELTA_LOOT_RETAIN_MS = 60_000;
export const DELTA_KNOWLEDGE_MAX_BYTES = 65_536;
export const DELTA_KNOWLEDGE_MAX_CHARACTERS = 48_000;
export const DELTA_KNOWLEDGE_MAX_SECTIONS = 64;
export const DELTA_KNOWLEDGE_CONTEXT_MAX_CHARACTERS = 6000;
/** Consecutive transient OCR failures before a detector reports an error. */
export const DELTA_OCR_TRANSIENT_FAILURE_LIMIT = 3;
/** Delay before the next OCR attempt. `failures` is the consecutive count, starting at 1. */
export function deltaOcrBackoffMs(failures: number): number {
  return Math.min(4_000, 1_000 * 2 ** Math.max(0, failures - 1));
}
