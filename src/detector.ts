/** Local OCR text rules are a fallback for one calibrated notification; they infer no icon semantics. */
import { createHash } from 'node:crypto';
import { sameDeltaDisplay } from './protocol.ts';
import type { CapturedEvidence, CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { captureRectangle } from './roi.ts';
import { createOcr, ocrUnavailableOnPlatform, type DeltaOcrPort, type DeltaOcrLayout, type DeltaOcrBox } from './ocr.ts';
import { DELTA_MAX_ROI_AREA, DELTA_MAX_ROI_PIXELS, DELTA_OCR_TRANSIENT_FAILURE_LIMIT, deltaOcrBackoffMs } from './limits.ts';
import { PERSONAL_TEXT_FALLBACKS, PERSONAL_TEXT_FALLBACK_LIMITS, personalTextRaster, restorePersonalLayout } from './personal-text-fallback.ts';
import { createPersonalSignature, samePersonalSignature, type PersonalSignature } from './personal-notification.ts';
import { parsePersonalAttribution, personalAttributionRegion } from './personal-attribution.ts';
import type { DeltaAttribution, DeltaCalibration, DeltaDetectionConfig, DeltaDetectionState, DeltaGameLanguage, DeltaRecognition } from './protocol.ts';

export interface DetectionMatch {
  kind: 'kill' | 'knockdown'; text: string; dedupKey: string; recognition: DeltaRecognition;
  attribution: DeltaAttribution;
  personalAction?: DeltaOcrBox;
  personalTarget?: DeltaOcrBox;
  personalSignature?: PersonalSignature | null;
}
const compact = (text: string) => text.normalize('NFKC').replace(/\s+/gu, '').toLocaleUpperCase('en-US');
export function parseDetection(lines: readonly string[], nickname: string, language: DeltaGameLanguage): DetectionMatch | null {
  const name = compact(nickname);
  if (!name || !language) return null;
  const pattern = language === 'en-US' ? /^(.+?)(?:\s+|\s*[:：]\s*)(KNOCKED\s+DOWN|KILLED)\s+(.+)$/iu : /^(.+?)(?:\s+|\s*[:：]\s*)(击\s*倒|击\s*杀)\s+(.+)$/u;
  const matches = new Map<string, DetectionMatch>();
  for (const text of lines) {
    const normalized = text.normalize('NFKC').trim(), match = pattern.exec(normalized);
    if (!match || compact(match[1]!) !== name) continue;
    const target = compact(match[3]!);
    if (!target || /\b(?:KILLED|KNOCKED\s+DOWN)\b/iu.test(match[3]!) || /击倒|击杀/u.test(match[3]!)) continue;
    const verb = compact(match[2]!), kind = verb === 'KNOCKEDDOWN' || verb === '击倒' ? 'knockdown' : 'kill';
    const key = createHash('sha256').update(`${kind}:${name}:${target}`).digest('hex');
    matches.set(key, { kind, text, dedupKey: key, attribution: { relation: 'self', basis: 'actor-text', assisted: false, spectating: false }, recognition: { kind: 'actor-text', text,
      actor: match[1]!.normalize('NFKC').replace(/\s+/gu, ''), target: match[3]!.normalize('NFKC').replace(/\s+/gu, '') } });
  }
  return matches.size === 1 ? [...matches.values()][0]! : null;
}

function sameBaseline(a: DeltaOcrBox, b: DeltaOcrBox): boolean {
  const height = Math.max(a.height, b.height), overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return Math.min(a.height, b.height) >= height / 2 && overlap >= Math.min(a.height, b.height) * 0.6
    && Math.abs(a.y + a.height / 2 - b.y - b.height / 2) <= height * 0.35;
}

function joinedTextAt(words: readonly { text: string; box: DeltaOcrBox }[], boundary: number): boolean {
  let offset = 0;
  for (const [index, word] of words.entries()) {
    offset += compact(word.text).length;
    if (offset > boundary) return true;
    if (offset === boundary) {
      const next = words[index + 1]?.box;
      return !!next && next.x - (word.box.x + word.box.width) <= Math.min(word.box.height, next.height) * 0.25;
    }
  }
  return false;
}

function personalFeedbackRows(layout: DeltaOcrLayout) {
  const words = layout.lines.flatMap((line) => line.words);
  return words.filter((word) => compact(word.text).includes('击')).map((anchor) => {
    const row = words.filter((word) => sameBaseline(anchor.box, word.box)).sort((a, b) => a.box.x - b.box.x);
    const text = row.map((word) => word.text).join(' '), normalized = compact(text), actions = [...normalized.matchAll(/击倒|击败/gu)];
    const action = actions.length === 1 ? actions[0]! : null;
    const prefix = normalized.slice(0, action?.index ?? normalized.indexOf('击'));
    const end = action ? action.index! + action[0].length : 0;
    const settingsLabel = !!action && (/(?:[与和或及]|[杀倒败][、/]|启用|监测|配置|识别|回应|统计)$/u.test(prefix)
      || (!prefix && normalized.slice(end) === '识别' && joinedTextAt(row, end)));
    return { row, anchor, text, normalized, action, settingsLabel, assisted: /协|助/u.test(prefix) };
  });
}

export function assistedPersonalRows(layout: DeltaOcrLayout): DeltaOcrBox[] {
  return layout.truncated ? [] : personalFeedbackRows(layout).filter(row => row.assisted && !row.settingsLabel).map(row => row.anchor.box);
}

/** Same-frame OCR variants can retain an assist prefix even when its action glyph is unreadable. */
export function attributePersonalFeedback(matches: readonly DetectionMatch[], layouts: readonly DeltaOcrLayout[], view: 'own' | 'other' | 'unknown' = 'own'): DetectionMatch[] {
  const rows = layouts.filter(layout => !layout.truncated).flatMap(personalFeedbackRows);
  const assisted = rows.filter(row => row.assisted && !row.settingsLabel).map(row => row.anchor.box);
  // A more complete reading of the same caption overrides a clipped action from another OCR pass.
  const captions = rows.filter(row => row.settingsLabel);
  const candidates = matches.filter(match => !match.personalAction || !captions.some(row => sameBaseline(row.anchor.box, match.personalAction!)));
  return candidates.map((match) => {
    if (match.recognition.kind !== 'personal-feedback-text') return match;
    const uncertain = view === 'unknown' || layouts.some((layout) => layout.truncated) || match.attribution.relation === 'unknown';
    const assist = match.attribution.assisted || !!match.personalAction && assisted.some((box) => sameBaseline(box, match.personalAction!));
    const spectating = view === 'other';
    const attribution: DeltaAttribution = { relation: spectating || assist ? 'teammate' : uncertain ? 'unknown' : 'self',
      basis: spectating ? 'spectator-hud' : assist ? 'assist-text' : uncertain ? 'unknown' : 'personal-feedback', assisted: assist, spectating };
    return { ...match, attribution };
  });
}

export function parsePersonalFeedback(layout: DeltaOcrLayout, nickname: string): DetectionMatch[] {
  if (layout.truncated || !nickname.trim()) return [];
  const matches = new Map<string, DetectionMatch>();
  for (const { row, text, normalized, action, assisted, settingsLabel } of personalFeedbackRows(layout)) {
    if (!action || settingsLabel) continue;
    const kind = action[0] === '击倒' ? 'knockdown' : 'kill', target = normalized.slice(action.index! + action[0].length);
    let offset = 0;
    const boxes: DeltaOcrBox[] = [], targetBoxes: DeltaOcrBox[] = [];
    for (const word of row) {
      const length = compact(word.text).length, start = Math.max(offset, action.index!), end = Math.min(offset + length, action.index! + action[0].length);
      if (end > start) boxes.push({ ...word.box, x: word.box.x + word.box.width * (start - offset) / length, width: word.box.width * (end - start) / length });
      const targetStart = Math.max(offset, action.index! + action[0].length);
      if (offset + length > targetStart) targetBoxes.push({ ...word.box, x: word.box.x + word.box.width * (targetStart - offset) / length,
        width: word.box.width * (offset + length - targetStart) / length });
      offset += length;
    }
    const x = Math.min(...boxes.map((box) => box.x)), last = boxes[boxes.length - 1]!;
    // The final action glyph anchors the target baseline despite noisy modifier boxes.
    const personalAction = { x, y: last.y, width: Math.max(...boxes.map((box) => box.x + box.width)) - x, height: last.height };
    const targetX = Math.min(...targetBoxes.map((box) => box.x)), targetY = Math.min(...targetBoxes.map((box) => box.y));
    const personalTarget = targetBoxes.length ? { x: targetX, y: targetY,
      width: Math.max(...targetBoxes.map((box) => box.x + box.width)) - targetX,
      height: Math.max(...targetBoxes.map((box) => box.y + box.height)) - targetY } : undefined;
    const key = createHash('sha256').update(`${kind}:${compact(nickname)}:${assisted ? 'teammate' : 'self'}:${target}`).digest('hex');
    matches.set(key, { kind, text, dedupKey: key, personalAction, ...(personalTarget ? { personalTarget } : {}),
      attribution: { relation: assisted ? 'teammate' : 'self', basis: assisted ? 'assist-text' : 'personal-feedback', assisted, spectating: false },
      recognition: { kind: 'personal-feedback-text', text, target } });
    if (matches.size >= 8) break;
  }
  return [...matches.values()];
}

export function calibrationFitsBudget(calibration: DeltaCalibration): boolean {
  try {
    const regions = [calibration.roi, ...(calibration.personalFeedbackRoi ? [calibration.personalFeedbackRoi] : [])];
    const pixels = regions.map((roi) => captureRectangle(roi, calibration.display.bounds.width, calibration.display.bounds.height));
    return regions.reduce((area, roi) => area + roi.width * roi.height, 0) <= DELTA_MAX_ROI_AREA
      && pixels.reduce((count, box) => count + box.width * box.height, 0) <= DELTA_MAX_ROI_PIXELS;
  } catch { return false; }
}

export function matchesCalibration(region: Pick<CapturedRegion, 'display' | 'topologyRevision'>, calibration: DeltaCalibration): boolean {
  return region.topologyRevision === calibration.topologyRevision && sameDeltaDisplay(region.display, calibration.display);
}

export function detectionStatus(config: DeltaDetectionConfig): Omit<DeltaDetectionState, 'config'> {
  const calibration = config.calibration;
  const reason = !config.nickname.trim() ? 'nickname-required' : !config.language ? 'language-required' : !calibration ? 'calibration-required'
    : !calibrationFitsBudget(calibration) ? 'roi-too-large' : calibration.personalFeedbackRoi && config.language !== 'zh-CN' ? 'feedback-language-unsupported' : null;
  return { phase: !config.enabled ? 'disabled' : reason === 'feedback-language-unsupported' ? 'unavailable' : reason ? 'uncalibrated' : 'starting', reason: config.enabled ? reason : null,
    engine: null, availableLanguages: [], scans: 0, candidates: 0, confirmed: 0, lastError: null };
}

function fingerprint(region: CapturedRegion): Uint8Array {
  const width = 96, height = 32, result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (Math.min(region.height - 1, Math.floor(y * region.height / height)) * region.width + Math.min(region.width - 1, Math.floor(x * region.width / width))) * 4;
    result[y * width + x] = (region.bgra[at]! + region.bgra[at + 1]! * 2 + region.bgra[at + 2]!) / 4;
  }
  return result;
}

export class Detector {
  readonly status: Omit<DeltaDetectionState, 'config'>;
  private ocr: DeltaOcrPort | null = null;
  private pending: CapturedRegion | null = null;
  private running: Promise<void> | null = null;
  private closed = false;
  private previous: Uint8Array | null = null;
  private lastScanAtMs = 0;
  private failures = 0;
  private inflight: CapturedRegion | null = null;
  private backoffCancel: (() => void) | null = null;
  constructor(private readonly config: DeltaDetectionConfig, private readonly evidence: () => Promise<CapturedEvidence>,
    private readonly confirmed: (evidence: CapturedEvidence, match: DetectionMatch) => void,
    private readonly openOcr: typeof createOcr = createOcr, private readonly backoffMs: (failures: number) => number = deltaOcrBackoffMs) {
    this.status = detectionStatus(config);
  }
  submit(region: CapturedRegion): void {
    if (this.closed || !this.config.enabled || !this.config.nickname.trim() || !this.config.language || !this.config.calibration || this.status.reason === 'roi-too-large'
      || this.status.reason === 'feedback-language-unsupported') return;
    if (!matchesCalibration(region, this.config.calibration)) {
      this.status.phase = 'uncalibrated'; this.status.reason = 'source-changed'; this.pending = null; this.previous = null;
      this.backoffCancel?.(); void this.ocr?.close(); return;
    }
    if (this.status.reason === 'source-changed' || this.status.phase === 'error' || this.status.phase === 'unavailable') return;
    this.pending = region;
    if (!this.running) {
      this.running = this.drain().finally(() => { this.running = null; });
    }
  }
  private async drain(): Promise<void> {
    while (!this.closed && this.status.phase !== 'error' && this.status.phase !== 'unavailable' && this.status.reason !== 'source-changed') {
      try {
        await this.scan();
        return;
      } catch (error) {
        if (this.recognitionStopped()) return;
        if (ocrUnavailableOnPlatform(error)) {
          this.status.phase = 'unavailable'; this.status.reason = 'ocr-unavailable'; this.status.lastError = String(error);
          this.pending = null; this.inflight = null; return;
        }
        if (!await this.noteTransient(error)) return;
      }
    }
  }
  private async scan(): Promise<void> {
    try {
      if (!this.ocr) {
        this.ocr = await this.openOcr(this.config.language);
        if (this.closed || this.status.reason === 'source-changed') { await this.ocr.close(); return; }
        this.status.engine = 'windows-ocr'; this.status.availableLanguages = this.ocr.availableLanguages;
        if (!this.ocr.language) { this.status.phase = 'unavailable'; this.status.reason = 'ocr-language-unavailable'; this.pending = null; await this.ocr.close(); return; }
      }
      while (this.pending && !this.closed) {
        const region = this.pending; this.pending = null;
        if (Date.now() - this.lastScanAtMs < 500) { this.pending = region; await new Promise((done) => setTimeout(done, 50)); continue; }
        const next = fingerprint(region);
        let difference = this.previous ? 0 : Infinity;
        if (this.previous) for (let i = 0; i < next.length; i++) difference += Math.abs(next[i]! - this.previous[i]!);
        if (difference / next.length < 1.5) continue;
        this.previous = next; this.lastScanAtMs = Date.now(); this.inflight = region;
        const initial = await this.recognize(region);
        this.inflight = null;
        if (this.closed || this.status.reason === 'source-changed') return;
        this.status.scans++; this.status.phase = 'ready'; this.status.reason = null;
        if (!initial.length) continue;
        this.status.candidates += initial.length;
        const evidence = await this.evidence();
        if (this.closed || !matchesCalibration(evidence.region, this.config.calibration!)) {
          this.status.phase = 'uncalibrated'; this.status.reason = 'source-changed'; await this.ocr?.close(); return;
        }
        let checked = await this.recognize(evidence.region, true);
        if (this.closed || this.status.reason === 'source-changed') return;
        if (!checked.length) continue;
        if (checked.some((match) => match.recognition.kind === 'personal-feedback-text')) {
          const attribution = personalAttributionRegion(evidence);
          const view = attribution ? parsePersonalAttribution(await this.ocr.recognizeLayout(attribution), this.config.nickname, attribution.spectatorFrame) : 'unknown';
          if (this.recognitionStopped()) return;
          checked = attributePersonalFeedback(checked, [], view);
        }
        for (const match of checked) {
          const index = initial.findIndex((candidate) => candidate.kind === match.kind && (match.recognition.kind === 'personal-feedback-text'
            ? samePersonalSignature(candidate.personalSignature ?? null, match.personalSignature ?? null) : candidate.dedupKey === match.dedupKey));
          if (index < 0) continue;
          initial.splice(index, 1);
          this.status.confirmed++; this.confirmed(evidence, match);
        }
      }
    } catch (error) {
      if (this.inflight && !this.pending) this.pending = this.inflight;
      throw error;
    }
  }
  private async noteTransient(error: unknown): Promise<boolean> {
    const port = this.ocr; this.ocr = null; this.previous = null; this.inflight = null; this.failures++;
    this.status.lastError = String(error);
    const retry = this.failures < DELTA_OCR_TRANSIENT_FAILURE_LIMIT;
    if (retry) { this.status.phase = 'starting'; this.status.reason = null; }
    else { this.status.phase = 'error'; this.status.reason = null; this.pending = null; }
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
  private async recognize(region: CapturedRegion, verify = false): Promise<DetectionMatch[]> {
    if (this.recognitionStopped()) return [];
    const layout = await this.ocr!.recognizeLayout(region); this.failures = 0; this.status.lastError = null; const raw = this.matches(layout);
    const finish = (matches: DetectionMatch[]) => matches.map((match) => match.personalAction
      ? { ...match, personalSignature: createPersonalSignature(region, match.personalAction, match.personalTarget) } : match);
    if (!this.config.calibration?.personalFeedbackRoi || this.config.language !== 'zh-CN') return finish(raw);
    const layouts = [layout], matches = raw;
    const classified = () => attributePersonalFeedback(matches, layouts);
    if (!verify && raw.length) return finish(classified());
    let pixels = 0;
    for (const kind of PERSONAL_TEXT_FALLBACKS) {
      if (this.recognitionStopped()) return [];
      const raster = personalTextRaster(region, kind);
      if (!raster) continue;
      pixels += raster.region.width * raster.region.height;
      if (pixels > PERSONAL_TEXT_FALLBACK_LIMITS.maxTotalPixels || pixels + region.width * region.height > PERSONAL_TEXT_FALLBACK_LIMITS.maxScanPixels) break;
      const layout = await this.ocr!.recognizeLayout(raster.region);
      if (this.recognitionStopped()) return [];
      const restored = restorePersonalLayout(layout, raster);
      layouts.push(restored);
      for (const match of this.matches(restored)) if (match.recognition.kind === 'personal-feedback-text'
        && !matches.some((candidate) => candidate.personalAction && match.personalAction && sameBaseline(candidate.personalAction, match.personalAction))) {
        matches.push({ ...match, recognition: { ...match.recognition, preprocessing: kind } });
      }
      if (!verify && matches.length) return finish(classified());
    }
    return finish(classified());
  }
  private recognitionStopped(): boolean { return this.closed || this.status.reason === 'source-changed'; }
  private matches(layout: DeltaOcrLayout): DetectionMatch[] {
    if (layout.truncated) return [];
    if (this.config.calibration?.personalFeedbackRoi) return parsePersonalFeedback(layout, this.config.nickname);
    const result = new Map<string, DetectionMatch>();
    for (const line of layout.lines) {
      const match = parseDetection([line.text], this.config.nickname, this.config.language);
      if (match) result.set(match.dedupKey, match);
      if (result.size >= 8) break;
    }
    return [...result.values()];
  }
  async close(): Promise<void> { this.closed = true; this.pending = null; this.backoffCancel?.(); await this.ocr?.close(); await this.running; }
}
