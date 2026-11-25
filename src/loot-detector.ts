/** Calibrated item grids and UI text produce visual candidates; quality remains unconfirmed. */
import { createHash } from 'node:crypto';
import jpeg from 'jpeg-js';
import type { CapturedEvidence, CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { captureRectangle } from './roi.ts';
import { copyPixelRect } from './image.ts';
import { createOcr, ocrUnavailableOnPlatform, type DeltaOcrBox, type DeltaOcrLayout, type DeltaOcrPort } from './ocr.ts';
import { matchesCalibration } from './detector.ts';
import { lootCalibrationFitsBudget } from './budget.ts';
import { DELTA_LOOT_SAMPLE_INTERVAL_MS, DELTA_LOOT_RETAIN_MS, DELTA_MAX_LOOT_CANDIDATES, DELTA_MAX_LOOT_REFERENCES,
  DELTA_OCR_TRANSIENT_FAILURE_LIMIT, deltaOcrBackoffMs } from './limits.ts';
import { unionRect } from './rect.ts';
import { compact, stripWhitespace, upperNFKC } from './text.ts';
import type { DeltaDetectionConfig, DeltaLootCalibration, DeltaLootConfig, DeltaLootScene, DeltaLootSensitivity, DeltaLootState, DeltaRecognition, DeltaRoi } from './protocol.ts';

export interface LootItemCandidate { box: DeltaOcrBox; signature: Uint8Array }
export interface LootMatch extends LootItemCandidate { dedupKey: string; recognition: Extract<DeltaRecognition, { kind: 'loot-candidate' }> }
/** Keep the slot's top-left label at native resolution. Very large slots retain their title and upper artwork. */
export function lootDetailPixels(region: CapturedRegion, box: DeltaOcrBox): Pick<CapturedRegion, 'width' | 'height' | 'bgra'> {
  const margin = Math.max(2, Math.round(box.height * 0.08));
  const x = Math.max(0, box.x - margin), y = Math.max(0, box.y - margin);
  const width = Math.min(640, region.width - x, box.x + box.width + margin - x);
  const height = Math.min(400, region.height - y, box.y + box.height + margin - y);
  return { width, height, bgra: copyPixelRect(region.bgra, region.width, x, y, width, height) };
}
export function lootCaptureRoi(calibration: DeltaLootCalibration): DeltaRoi {
  return unionRect(calibration.itemsRoi, calibration.contextRoi);
}
export { lootCalibrationFitsBudget };
export function lootStatus(config: DeltaLootConfig, combat?: DeltaDetectionConfig): Omit<DeltaLootState, 'config'> {
  const reason = !config.language ? 'language-required' : !config.calibration ? 'calibration-required'
    : !lootCalibrationFitsBudget(config.calibration) ? 'roi-too-large'
    : combat?.enabled && combat.language && combat.language !== config.language ? 'language-conflict' : null;
  return { phase: !config.enabled ? 'disabled' : reason === 'language-conflict' ? 'unavailable' : reason ? 'uncalibrated' : 'starting',
    reason: config.enabled ? reason : null, engine: null, availableLanguages: [], scans: 0, candidates: 0, scene: null, lastError: null };
}
export function parseLootContext(layout: DeltaOcrLayout): DeltaLootScene | null {
  if (layout.truncated) return null;
  const text = upperNFKC(layout.lines.map((line) => line.text).join(' '));
  const folded = stripWhitespace(text), contains = (pattern: RegExp) => pattern.test(text) || pattern.test(folded);
  const classes = [/背包|\bBACKPACK\b/u, /胸挂|\bRIG\b/u, /保险箱|安全箱|\bSAFE\b|\bSECURE\b/u, /装备|\bEQUIPMENT\b/u].filter(contains).length;
  if (!classes) return null;
  if (contains(/容器|搜索物资|\bCONTAINER\b/u)) return 'container';
  if (contains(/战利品|搜索|搜刮|\bLOOT\b|\bSEARCH\b/u)) return 'loot';
  const capacityHeading = layout.lines.some((line) => {
    const match = /^(?:安全箱|保险箱):?(\d{1,3})\/(\d{1,3})(?![\d/])/u.exec(compact(line.text));
    return match && Number(match[2]) > 0 && Number(match[1]) <= Number(match[2]);
  });
  if (capacityHeading) return 'inventory';
  return classes >= 2 ? 'inventory' : null;
}

/** Signatures exclude grid coordinates; similar item art can share an identity. */
export function sameLootSignature(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== 768 || b.length !== 768) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference += Math.abs(a[i]! - b[i]!);
  return difference / a.length <= 12;
}
export function validLootSignature(value: unknown): value is Uint8Array { return value instanceof Uint8Array && value.length === 768; }

function itemCandidate(region: CapturedRegion, box: DeltaOcrBox): LootItemCandidate {
  const signature = new Uint8Array(768);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const sx = Math.min(region.width - 1, Math.floor(box.x + box.width * (0.1 + (x + 0.5) / 20)));
    const sy = Math.min(region.height - 1, Math.floor(box.y + box.height * (0.1 + (y + 0.5) / 20))), at = (sy * region.width + sx) * 4;
    for (let channel = 0; channel < 3; channel++) signature[(y * 16 + x) * 3 + channel] = Math.floor(region.bgra[at + channel]! / 16) * 16;
  }
  return { box, signature };
}

/** Native edge strips retain thin card borders lost by the color mask's downsampling. */
function hasCardBorder(region: CapturedRegion, box: DeltaOcrBox, scale: number): boolean {
  for (let side = 0; side < 4; side++) {
    let best = 0;
    const horizontal = side < 2, length = horizontal ? box.width : box.height;
    for (let offset = -Math.ceil(scale * 2); offset <= Math.ceil(scale * 2); offset++) {
      let count = 0, samples = 0;
      for (let along = 0; along <= length; along += Math.max(1, scale / 2)) {
        const x = Math.floor(box.x + (horizontal ? along : side === 2 ? offset : box.width + offset));
        const y = Math.floor(box.y + (horizontal ? side === 0 ? offset : box.height + offset : along));
        samples++;
        if (x < 0 || y < 0 || x >= region.width || y >= region.height) continue;
        const at = (y * region.width + x) * 4, b = region.bgra[at]!, g = region.bgra[at + 1]!, r = region.bgra[at + 2]!;
        const high = Math.max(r, g, b), low = Math.min(r, g, b);
        if (low >= 45 && high <= 200 && high - low <= 22) count++;
      }
      best = Math.max(best, count / samples);
      if (best >= 0.65) break;
    }
    if (best < 0.65) return false;
  }
  return true;
}

/** Dark merged item slots use a rectangular quality backing and four neutral borders. */
function mergedCardFallback(region: CapturedRegion, mask: Uint8Array, width: number, height: number, scale: number, minimum: number, result: LootItemCandidate[]): void {
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let size = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = start; visited[start] = 1;
    for (let index = 0; index < size; index++) {
      const at = queue[index]!, x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next] && !visited[next]) { visited[next] = 1; queue[size++] = next; }
      }
    }
    const w = right - left + 1, h = bottom - top + 1;
    if (w < 8 || h < 8 || w / h < 0.5 || w / h > 2 || size / (w * h) < Math.max(0.2, minimum)) continue;
    const edges = [0, 0, 0, 0];
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (mask[y * width + x]) {
      if (y < top + 2) edges[0]++; if (y > bottom - 2) edges[1]++;
      if (x < left + 2) edges[2]++; if (x > right - 2) edges[3]++;
    }
    if (edges.some((count, side) => count < (side < 2 ? w : h) * 2 * 0.55)) continue;
    const box = { x: Math.floor(left * scale), y: Math.floor(top * scale),
      width: Math.min(region.width, Math.ceil((right + 1) * scale)) - Math.floor(left * scale),
      height: Math.min(region.height, Math.ceil((bottom + 1) * scale)) - Math.floor(top * scale) };
    if (result.some(({ box: prior }) => {
      const overlap = Math.max(0, Math.min(box.x + box.width, prior.x + prior.width) - Math.max(box.x, prior.x))
        * Math.max(0, Math.min(box.y + box.height, prior.y + prior.height) - Math.max(box.y, prior.y));
      return overlap >= Math.min(box.width * box.height, prior.width * prior.height) * 0.8;
    }) || !hasCardBorder(region, box, scale)) continue;
    result.push(itemCandidate(region, box));
    if (result.length >= DELTA_MAX_LOOT_CANDIDATES) return;
  }
}

export function detectLootItems(region: CapturedRegion, sensitivity: DeltaLootSensitivity): LootItemCandidate[] {
  const scale = Math.max(1, region.width / 320, region.height / 240), width = Math.max(1, Math.floor(region.width / scale)), height = Math.max(1, Math.floor(region.height / scale));
  const columns = new Uint16Array(width), rows = new Uint16Array(height), red = new Uint8Array(width * height), backing = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (Math.min(region.height - 1, Math.floor(y * scale)) * region.width + Math.min(region.width - 1, Math.floor(x * scale))) * 4;
    const b = region.bgra[at]!, g = region.bgra[at + 1]!, r = region.bgra[at + 2]!, high = Math.max(r, g, b), low = Math.min(r, g, b);
    if (high - low <= 40 && low >= 65 && high <= 230) { columns[x]++; rows[y]++; }
    if (r >= 110 && g <= r * 0.55 && b <= r * 0.7 && r - Math.max(g, b) >= 50) red[y * width + x] = 1;
    if (r >= 45 && g <= r * 0.75 && b >= g * 0.8 && b <= r * 0.85 && r - g >= 14 && r - b >= 10) backing[y * width + x] = 1;
  }
  const lines = (counts: Uint16Array, threshold: number): number[] => {
    const result: number[] = [];
    let first = -1;
    for (let i = 0; i <= counts.length; i++) {
      if (i < counts.length && counts[i]! >= threshold) { if (first < 0) first = i; }
      else if (first >= 0) { result.push(Math.round((first + i - 1) / 2)); first = -1; }
    }
    return result;
  };
  const vertical = lines(columns, height * 0.4), horizontal = lines(rows, width * 0.4);
  const minimum = { conservative: 0.35, balanced: 0.22, sensitive: 0.12 }[sensitivity], result: LootItemCandidate[] = [];
  if (vertical.length >= 3 && horizontal.length >= 3) for (let row = 0; row < horizontal.length - 1; row++) for (let column = 0; column < vertical.length - 1; column++) {
    const left = vertical[column]! + 1, top = horizontal[row]! + 1, right = vertical[column + 1]!, bottom = horizontal[row + 1]!;
    const w = right - left, h = bottom - top;
    if (w < 8 || h < 8 || w / h < 0.5 || w / h > 2) continue;
    let count = 0;
    const edges = [0, 0, 0, 0];
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (red[y * width + x]) {
      count++;
      if (y < top + 3) edges[0]++; if (y >= bottom - 3) edges[1]++;
      if (x < left + 3) edges[2]++; if (x >= right - 3) edges[3]++;
    }
    const markedSides = edges.filter((n, i) => n >= (i < 2 ? w : h) * 1.5).length;
    if (count / (w * h) < minimum && !(count / (w * h) >= 0.06 && markedSides >= 3)) continue;
    const box = { x: Math.floor(left * scale), y: Math.floor(top * scale), width: Math.min(region.width, Math.ceil(right * scale)) - Math.floor(left * scale),
      height: Math.min(region.height, Math.ceil(bottom * scale)) - Math.floor(top * scale) };
    result.push(itemCandidate(region, box));
    if (result.length >= DELTA_MAX_LOOT_CANDIDATES) return result;
  }
  mergedCardFallback(region, backing, width, height, scale, minimum, result);
  return result;
}

interface LootReference { namespace: string; signature: Uint8Array; key: string; expiresAtMs: number }
export class LootItemTracker {
  private references: LootReference[] = [];
  clear(): void { this.references = []; }
  private find(namespace: string, signature: Uint8Array, now: number): LootReference | undefined {
    this.references = this.references.filter((reference) => reference.expiresAtMs > now);
    return this.references.find((reference) => reference.namespace === namespace && sameLootSignature(reference.signature, signature));
  }
  observe(namespace: string, signatures: readonly Uint8Array[], now: number): void {
    for (const signature of signatures) {
      const reference = this.find(namespace, signature, now);
      if (reference) reference.expiresAtMs = now + DELTA_LOOT_RETAIN_MS;
    }
    this.references = this.references.filter((reference) => reference.expiresAtMs > now);
  }
  has(namespace: string, signature: Uint8Array, now: number): boolean { return !!this.find(namespace, signature, now); }
  identify(namespace: string, signature: Uint8Array, now: number): string {
    return this.find(namespace, signature, now)?.key ?? createHash('sha256').update(`${namespace}:${now}:`).update(signature).digest('hex');
  }
  remember(namespace: string, signature: Uint8Array, key: string, now: number): void {
    const reference = this.find(namespace, signature, now);
    if (reference) { reference.expiresAtMs = now + DELTA_LOOT_RETAIN_MS; return; }
    this.references.push({ namespace, signature: new Uint8Array(signature), key, expiresAtMs: now + DELTA_LOOT_RETAIN_MS });
    while (this.references.length > DELTA_MAX_LOOT_REFERENCES) this.references.shift();
  }
}
export function lootNamespace(region: Pick<CapturedRegion, 'display' | 'topologyRevision'>, calibration: DeltaLootCalibration): string {
  return JSON.stringify([region.display, region.topologyRevision, calibration]);
}
function evidenceRegions(evidence: CapturedEvidence, calibration: DeltaLootCalibration): { items: CapturedEvidence; context: CapturedRegion } {
  const { width, height } = calibration.display.bounds, union = captureRectangle(lootCaptureRoi(calibration), width, height);
  const extract = (roi: DeltaRoi): CapturedRegion => {
    const box = captureRectangle(roi, width, height);
    if (evidence.region.width !== union.width || evidence.region.height !== union.height) throw new Error('Invalid native item evidence dimensions');
    const data = copyPixelRect(evidence.region.bgra, union.width, box.x - union.x, box.y - union.y, box.width, box.height);
    return { ...evidence.region, width: box.width, height: box.height, bgra: data };
  };
  const decoded = jpeg.decode(evidence.capture.jpeg, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
  const crop = captureRectangle(calibration.itemsRoi, decoded.width, decoded.height);
  const rgba = copyPixelRect(decoded.data, decoded.width, crop.x, crop.y, crop.width, crop.height);
  return { items: { capture: evidence.capture, region: extract(calibration.itemsRoi), crop,
    cropJpeg: jpeg.encode({ data: rgba, width: crop.width, height: crop.height }, 90).data }, context: extract(calibration.contextRoi) };
}

export class LootDetector {
  readonly status: Omit<DeltaLootState, 'config'>;
  visible: Uint8Array[] = [];
  private pending: CapturedRegion | null = null;
  private running: Promise<void> | null = null;
  private closed = false;
  private previous: LootItemCandidate[] = [];
  private tracker = new LootItemTracker();
  private ocr: DeltaOcrPort | null = null;
  private lastScanAtMs = 0;
  private failures = 0;
  private backoffCancel: (() => void) | null = null;
  constructor(private readonly config: DeltaLootConfig, private readonly evidence: () => Promise<CapturedEvidence>,
    private readonly candidate: (evidence: CapturedEvidence, match: LootMatch) => void, private readonly openOcr: typeof createOcr = createOcr,
    combat?: DeltaDetectionConfig, private readonly backoffMs: (failures: number) => number = deltaOcrBackoffMs,
    private readonly sampleIntervalMs = DELTA_LOOT_SAMPLE_INTERVAL_MS) { this.status = lootStatus(config, combat); }
  submit(region: CapturedRegion): void {
    if (this.closed || !this.config.enabled || !this.config.calibration || this.status.phase === 'unavailable' || this.status.phase === 'error' || this.status.reason) return;
    if (!matchesCalibration(region, { ...this.config.calibration, roi: this.config.calibration.itemsRoi })) {
      this.status.phase = 'uncalibrated'; this.status.reason = 'source-changed'; this.clearVisible(); this.backoffCancel?.(); void this.ocr?.close(); return;
    }
    this.pending = region;
    if (!this.running) this.running = this.drain().finally(() => { this.running = null; });
  }
  clearVisible(): void { this.visible = []; this.previous = []; this.pending = null; this.status.scene = null; }
  private async drain(): Promise<void> {
    while (!this.recognitionStopped() && this.status.phase !== 'error' && this.status.phase !== 'unavailable') {
      try {
        await this.scan();
        return;
      } catch (error) {
        if (this.recognitionStopped()) return;
        if (ocrUnavailableOnPlatform(error)) {
          this.status.phase = 'unavailable'; this.status.reason = 'ocr-unavailable'; this.status.lastError = String(error); this.clearVisible(); return;
        }
        if (!await this.noteTransient(error)) return;
      }
    }
  }
  private async scan(): Promise<void> {
    while (this.pending && !this.closed) {
      const wait = this.sampleIntervalMs - (Date.now() - this.lastScanAtMs);
      if (wait > 0) { await this.waitBackoff(wait); continue; }
      const region = this.pending; this.pending = null; this.lastScanAtMs = Date.now();
      try {
        const candidates = detectLootItems(region, this.config.sensitivity), now = Date.now(), calibration = this.config.calibration!;
        const namespace = lootNamespace(region, calibration);
        this.visible = candidates.map((item) => item.signature); this.tracker.observe(namespace, this.visible, now);
        this.status.scans++; this.status.phase = 'ready';
        const stable = candidates.filter((item) => this.previous.some((prior) => sameLootSignature(prior.signature, item.signature)) && !this.tracker.has(namespace, item.signature, now));
        this.previous = candidates;
        if (!candidates.length) this.status.scene = null;
        if (!stable.length) continue;
        const evidence = await this.evidence();
        if (this.recognitionStopped()) { await this.ocr?.close(); return; }
        if (!matchesCalibration(evidence.region, { ...calibration, roi: calibration.itemsRoi })) {
          this.status.phase = 'uncalibrated'; this.status.reason = 'source-changed'; this.clearVisible(); await this.ocr?.close(); return;
        }
        const parts = evidenceRegions(evidence, calibration), checked = detectLootItems(parts.items.region, this.config.sensitivity);
        const matches = checked.filter((item) => stable.some((prior) => sameLootSignature(prior.signature, item.signature)));
        if (!matches.length) continue;
        if (!this.ocr) this.ocr = await this.openOcr(this.config.language);
        if (this.recognitionStopped()) { await this.ocr.close(); return; }
        this.status.engine = 'windows-ocr'; this.status.availableLanguages = this.ocr.availableLanguages;
        if (!this.ocr.language) { this.status.phase = 'unavailable'; this.status.reason = 'ocr-language-unavailable'; await this.ocr.close(); return; }
        const layout = await this.ocr.recognizeLayout(parts.context);
        this.failures = 0; this.status.lastError = null;
        if (this.recognitionStopped()) { await this.ocr.close(); return; }
        const scene = parseLootContext(layout); this.status.scene = scene;
        if (!scene) continue;
        const text = layout.lines.map((line) => line.text).join(' ').slice(0, 512);
        for (const match of matches) {
          if (this.tracker.has(namespace, match.signature, Date.now())) continue;
          const dedupKey = this.tracker.identify(namespace, match.signature, Date.now());
          this.tracker.remember(namespace, match.signature, dedupKey, Date.now()); this.status.candidates++;
          this.candidate(parts.items, { dedupKey, box: match.box, signature: match.signature,
            recognition: { kind: 'loot-candidate', text, target: '', scene, basis: 'red-grid-ui', quality: 'unconfirmed', itemName: null } });
        }
      } catch (error) {
        if (!this.pending) this.pending = region;
        throw error;
      }
    }
  }
  private async noteTransient(error: unknown): Promise<boolean> {
    const port = this.ocr; this.ocr = null; this.failures++; this.status.lastError = String(error);
    const retry = this.failures < DELTA_OCR_TRANSIENT_FAILURE_LIMIT;
    if (retry) { this.status.phase = 'starting'; this.status.reason = null; }
    else { this.status.phase = 'error'; this.status.reason = null; this.clearVisible(); }
    await port?.close();
    if (this.recognitionStopped() || !retry) return false;
    await this.waitBackoff(this.backoffMs(this.failures));
    return !this.recognitionStopped();
  }
  private waitBackoff(ms: number): Promise<void> {
    if (this.closed || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.backoffCancel = null; resolve(); }, ms);
      this.backoffCancel = () => { clearTimeout(timer); this.backoffCancel = null; resolve(); };
    });
  }
  private recognitionStopped(): boolean { return this.closed || this.status.reason === 'source-changed'; }
  async close(): Promise<void> { this.closed = true; this.clearVisible(); this.backoffCancel?.(); await this.ocr?.close(); await this.running; }
}
