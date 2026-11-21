/** Visual target glyphs identify repeated personal notifications independently of OCR spelling. */
import { createHash } from 'node:crypto';
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaOcrBox } from './ocr.ts';

export const PERSONAL_NOTIFICATION_LIMITS = { maxReferences: 8, retainMs: 60_000, maxWidth: 1024, height: 48, coverage: 0.90, minSpanRatio: 0.8, maxBaselineShift: 4 } as const;
export interface PersonalSignature { mode: 'gold' | 'light' | 'dark'; width: number; height: number; pixels: Uint8Array }
type PersonalKind = 'kill' | 'knockdown';

export function createPersonalSignature(region: CapturedRegion, action: DeltaOcrBox, target?: DeltaOcrBox): PersonalSignature | null {
  const width = Math.min(region.width, PERSONAL_NOTIFICATION_LIMITS.maxWidth), height = PERSONAL_NOTIFICATION_LIMITS.height;
  const top = Math.round(action.y + action.height / 2 - height / 2), pixels = new Uint8Array(width * height);
  const signature = (mode: PersonalSignature['mode'], mask: Uint8Array): PersonalSignature | null => {
    if (!target) return { mode, width, height, pixels: mask };
    const scale = width / region.width, left = Math.ceil((action.x + action.width) * scale), gap = Math.max(1, Math.ceil(action.height * scale * 0.6));
    let first = -1, last = -1, ink = 0;
    const keep = () => ink >= 16 && first - left <= action.height * scale * 1.5
      && last >= target.x * scale && first <= (target.x + target.width) * scale;
    // OCR may omit target glyphs; a blank column gap bounds the visible name instead.
    for (let x = left; x < width; x++) {
      let count = 0;
      for (let y = 0; y < height; y++) count += mask[y * width + x]!;
      if (count < 2) continue;
      if (last >= 0 && x - last > gap) {
        if (keep()) break;
        first = -1; ink = 0;
      }
      if (first < 0) first = x;
      last = x; ink += count;
    }
    if (!keep()) return null;
    for (let y = 0; y < height; y++) {
      mask.fill(0, y * width, y * width + first);
      mask.fill(0, y * width + last + 1, (y + 1) * width);
    }
    return { mode, width, height, pixels: mask };
  };
  let goldCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceX = Math.floor(x * region.width / width), sourceY = top + y;
    if (sourceX < (target ? action.x + action.width : 0) || sourceY < 0 || sourceY >= region.height) continue;
    const at = (sourceY * region.width + sourceX) * 4, b = region.bgra[at]!, g = region.bgra[at + 1]!, r = region.bgra[at + 2]!;
    if (r > 160 && g > 95 && r > g * 1.05 && g > b * 1.3 && r - b > 60) { pixels[y * width + x] = 1; goldCount++; }
  }
  if (goldCount >= 16) {
    const gold = signature('gold', pixels);
    if (gold) return gold;
  }
  pixels.fill(0);
  let lightCount = 0, darkCount = 0, available = 0;
  const dark = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceX = Math.floor(x * region.width / width), sourceY = top + y;
    if (sourceX < action.x + action.width || sourceY < 0 || sourceY >= region.height) continue;
    const at = (sourceY * region.width + sourceX) * 4;
    available++;
    if (Math.min(region.bgra[at]!, region.bgra[at + 1]!, region.bgra[at + 2]!) >= 200) { pixels[y * width + x] = 1; lightCount++; }
    if (Math.max(region.bgra[at]!, region.bgra[at + 1]!, region.bgra[at + 2]!) <= 80) { dark[y * width + x] = 1; darkCount++; }
  }
  if (lightCount > available * 0.6) return darkCount >= 16 ? signature('dark', dark) : null;
  return lightCount >= 16 ? signature('light', pixels) : null;
}

export function validPersonalSignature(value: PersonalSignature | null | undefined): boolean {
  return value === null || !!value && (value.mode === 'gold' || value.mode === 'light' || value.mode === 'dark') && Number.isInteger(value.width)
    && value.width > 0 && value.width <= PERSONAL_NOTIFICATION_LIMITS.maxWidth && value.height === PERSONAL_NOTIFICATION_LIMITS.height
    && value.pixels instanceof Uint8Array && value.pixels.length === value.width * value.height && value.pixels.every((pixel) => pixel === 0 || pixel === 1);
}

function covered(a: PersonalSignature, b: PersonalSignature, offsetY = 0): number {
  let count = 0, overlap = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (!a.pixels[y * a.width + x]) continue;
    count++;
    let found = false;
    for (let row = Math.max(0, y + offsetY - 1); row <= Math.min(b.height - 1, y + offsetY + 1) && !found; row++) {
      for (let column = Math.max(0, x - 1); column <= Math.min(b.width - 1, x + 1); column++) if (b.pixels[row * b.width + column]) { found = true; break; }
    }
    if (found) overlap++;
  }
  return count ? overlap / count : 0;
}
export function samePersonalSignature(a: PersonalSignature | null, b: PersonalSignature | null): boolean {
  if (!a || !b) return a === b;
  if (a.mode !== b.mode || a.width !== b.width || a.height !== b.height) return false;
  // Fading can remove strokes; a substantially longer glyph span is a different target.
  const span = (signature: PersonalSignature): number => {
    let first = signature.width, last = -1;
    for (let x = 0; x < signature.width; x++) {
      let count = 0;
      for (let y = 0; y < signature.height && count < 2; y++) count += signature.pixels[y * signature.width + x]!;
      if (count >= 2) { first = Math.min(first, x); last = x; }
    }
    return Math.max(0, last - first + 1);
  };
  const aSpan = span(a), bSpan = span(b);
  const similarSpan = aSpan > 0 && bSpan > 0 && Math.min(aSpan, bSpan) / Math.max(aSpan, bSpan) >= PERSONAL_NOTIFICATION_LIMITS.minSpanRatio;
  for (let shift = 0; shift <= PERSONAL_NOTIFICATION_LIMITS.maxBaselineShift; shift++) for (const offset of shift ? [-shift, shift] : [0]) {
    const forward = covered(a, b, offset), reverse = covered(b, a, -offset);
    if (Math.min(forward, reverse) >= PERSONAL_NOTIFICATION_LIMITS.coverage
      || Math.max(forward, reverse) >= PERSONAL_NOTIFICATION_LIMITS.coverage && similarSpan) return true;
  }
  return false;
}

interface Reference { namespace: string; kind: PersonalKind; key: string; signature: PersonalSignature | null; expiresAtMs: number }
export class PersonalNotificationTracker {
  private references: Reference[] = [];
  clear(): void { this.references = []; }
  identify(namespace: string, kind: PersonalKind, signature: PersonalSignature | null, now: number): string {
    this.references = this.references.filter((reference) => reference.expiresAtMs > now);
    const candidates = this.references.filter((reference) => reference.namespace === namespace && reference.kind === kind);
    if (!signature) {
      const latest = candidates.at(-1);
      if (latest) return latest.key;
    }
    const found = candidates.find((reference) => samePersonalSignature(reference.signature, signature));
    if (found) return found.key;
    return createHash('sha256').update(`${namespace}:${kind}:${signature?.mode ?? 'unknown'}:`).update(signature?.pixels ?? new Uint8Array()).digest('hex');
  }
  remember(namespace: string, kind: PersonalKind, signature: PersonalSignature | null, key: string, now: number): void {
    if (this.references.some((reference) => reference.key === key)) return;
    this.references.push({ namespace, kind, key, signature: signature ? { ...signature, pixels: new Uint8Array(signature.pixels) } : null,
      expiresAtMs: now + PERSONAL_NOTIFICATION_LIMITS.retainMs });
    while (this.references.length > PERSONAL_NOTIFICATION_LIMITS.maxReferences) this.references.shift();
  }
}
