/** Same-frame footer text is a fallback for classifying personal feedback shown while spectating. */
import jpeg from 'jpeg-js';
import type { CapturedEvidence, CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaOcrLayout } from './ocr.ts';
import { captureRectangle } from './roi.ts';
import { DELTA_MAX_ROI_PIXELS } from './limits.ts';

export const PERSONAL_ATTRIBUTION_ROI = { x: 0, y: 0.82, width: 1, height: 0.18 } as const;
export const PERSONAL_ATTRIBUTION_LIMITS = { scale: 2, maxPixels: DELTA_MAX_ROI_PIXELS, footerStart: 0.6 } as const;
export interface PersonalAttributionRegion extends CapturedRegion { spectatorFrame: boolean }

function hasSpectatorFrame(image: { width: number; height: number; data: ArrayLike<number> }): boolean {
  const luma = (x: number, y: number) => {
    const at = (Math.max(0, Math.min(image.height - 1, y)) * image.width + Math.max(0, Math.min(image.width - 1, x))) * 4;
    return Math.min(image.data[at]!, image.data[at + 1]!, image.data[at + 2]!);
  };
  const vertical = (x: number) => {
    let hit = 0, total = 0;
    for (let y = Math.round(image.height * 0.08); y < image.height * 0.89; y += 2) {
      total++;
      if (Math.max(luma(x - 1, y), luma(x, y), luma(x + 1, y)) - Math.min(luma(x - 5, y), luma(x + 5, y)) >= 40) hit++;
    }
    return hit / total;
  };
  let hit = 0, total = 0;
  const y = Math.round(image.height * 0.925);
  for (let x = Math.round(image.width * 0.02); x < image.width * 0.98; x += 2) {
    total++;
    if (Math.max(luma(x, y - 1), luma(x, y), luma(x, y + 1)) - Math.min(luma(x, y - 5), luma(x, y + 5)) >= 40) hit++;
  }
  return hit / total >= 0.85 && vertical(Math.round(image.width * 0.011)) >= 0.85 && vertical(Math.round(image.width * 0.989)) >= 0.85;
}

/** The JPEG and native personal ROI belong to the same evidence capture; no fresh frame is sampled. */
export function personalAttributionRegion(evidence: CapturedEvidence): PersonalAttributionRegion | null {
  const { frame } = evidence.capture, bounds = captureRectangle(PERSONAL_ATTRIBUTION_ROI, frame.width, frame.height);
  const width = bounds.width * PERSONAL_ATTRIBUTION_LIMITS.scale, height = bounds.height * PERSONAL_ATTRIBUTION_LIMITS.scale;
  if (width * height > PERSONAL_ATTRIBUTION_LIMITS.maxPixels) return null;
  const decoded = jpeg.decode(evidence.capture.jpeg, { useTArray: true });
  if (decoded.width !== frame.width || decoded.height !== frame.height) return null;
  const bgra = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = ((bounds.y + Math.floor(y / 2)) * decoded.width + bounds.x + Math.floor(x / 2)) * 4, at = (y * width + x) * 4;
    bgra[at] = decoded.data[source + 2]!; bgra[at + 1] = decoded.data[source + 1]!;
    bgra[at + 2] = decoded.data[source]!; bgra[at + 3] = 255;
  }
  return { display: evidence.region.display, topologyRevision: frame.topologyRevision, capturedAt: frame.capturedAt, width, height, bgra,
    spectatorFrame: hasSpectatorFrame(decoded) };
}

/** `own` means the footer contains no explicit spectator controls, not a nickname match. */
export function parsePersonalAttribution(layout: DeltaOcrLayout, nickname: string, spectatorFrame = false): 'own' | 'other' | 'unknown' {
  if (layout.truncated || !layout.lines.some((line) => line.text.trim())) return 'unknown';
  const compact = (text: string) => text.normalize('NFKC').replace(/\s+/gu, '').toLocaleUpperCase('en-US');
  const footer = layout.lines.filter((line) => line.box.y + line.box.height / 2 >= layout.height * PERSONAL_ATTRIBUTION_LIMITS.footerStart)
    .map((line) => compact(line.text)).join(' ');
  const controls = [/切换观战(?:对象)?|SWITCHSPECTAT/u, /观战名片|SPECTATORCARD/u, /退出观战|EXITSPECTAT/u];
  if (controls.filter((control) => control.test(footer)).length >= 2) return 'other';
  const controller = layout.lines.filter((line) => line.box.x >= layout.width * 0.38 && line.box.x + line.box.width <= layout.width * 0.62
    && line.box.y + line.box.height / 2 >= layout.height * 0.1 && line.box.y + line.box.height / 2 <= layout.height * 0.4)
    .sort((a, b) => a.box.x - b.box.x).map((line) => compact(line.text)).join('');
  const waiting = layout.lines.some((line) => line.box.x + line.box.width <= layout.width * 0.25
    && line.box.y + line.box.height / 2 >= layout.height * PERSONAL_ATTRIBUTION_LIMITS.footerStart && /等待救援/u.test(compact(line.text)));
  return spectatorFrame && waiting && /[\p{L}]/u.test(controller) && controller !== compact(nickname) ? 'other' : 'own';
}
