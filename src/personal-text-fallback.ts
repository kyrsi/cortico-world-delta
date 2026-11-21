/** Bounded color masks and enlargement are a fallback for Chinese personal HUD text. */
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaOcrBox, DeltaOcrLayout } from './ocr.ts';
import { DELTA_MAX_ROI_PIXELS } from './limits.ts';

export const PERSONAL_TEXT_FALLBACK_LIMITS = {
  maxVariants: 3, maxVariantPixels: DELTA_MAX_ROI_PIXELS,
  maxTotalPixels: DELTA_MAX_ROI_PIXELS * 3, maxScanPixels: DELTA_MAX_ROI_PIXELS * 4,
} as const;
export const PERSONAL_TEXT_FALLBACKS = ['high-210', 'white-gold-edge', 'high-220-narrow'] as const;
export type PersonalTextFallback = (typeof PERSONAL_TEXT_FALLBACKS)[number];
export interface PersonalTextRaster {
  kind: PersonalTextFallback;
  region: CapturedRegion;
  sourceWidth: number;
  sourceHeight: number;
  offsetY: number;
}
const PAD = 16;

export function personalTextRaster(source: CapturedRegion, kind: PersonalTextFallback): PersonalTextRaster | null {
  const sourceWidth = source.width, sourceHeight = source.height;
  const offsetY = kind === 'high-220-narrow' ? Math.round(sourceHeight * 15 / 81) : 0;
  const endY = kind === 'high-220-narrow' ? Math.round(sourceHeight * 57 / 81) : sourceHeight;
  const height = endY - offsetY, paddedWidth = sourceWidth + PAD * 2, paddedHeight = height + PAD * 2;
  const width = paddedWidth * 2, outputHeight = paddedHeight * 2;
  if (height < 1 || width * outputHeight > PERSONAL_TEXT_FALLBACK_LIMITS.maxVariantPixels) return null;
  const mask = new Uint8Array(paddedWidth * paddedHeight).fill(255);
  const gray = kind === 'white-gold-edge' ? new Uint8Array(sourceWidth * sourceHeight) : null;
  if (gray) for (let at = 0, pixel = 0; pixel < gray.length; pixel++, at += 4) {
    gray[pixel] = (source.bgra[at]! * 3735 + source.bgra[at + 1]! * 19235 + source.bgra[at + 2]! * 9798 + 16384) >> 15;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < sourceWidth; x++) {
    const at = ((y + offsetY) * sourceWidth + x) * 4;
    const b = source.bgra[at]!, g = source.bgra[at + 1]!, r = source.bgra[at + 2]!;
    const low = Math.min(b, g, r), high = Math.max(b, g, r);
    let ink: boolean;
    if (gray) {
      let minimum = 255;
      for (let row = Math.max(0, y + offsetY - 2); row <= Math.min(sourceHeight - 1, y + offsetY + 2); row++) {
        for (let column = Math.max(0, x - 2); column <= Math.min(sourceWidth - 1, x + 2); column++) minimum = Math.min(minimum, gray[row * sourceWidth + column]!);
      }
      ink = ((low >= 170 && high - low <= 55) || r - b >= 50) && gray[(y + offsetY) * sourceWidth + x]! - minimum >= 15;
    } else {
      ink = (low >= (kind === 'high-210' ? 210 : 220) && high - low <= 40)
        || (r > 160 && g > 95 && r - b > 60 && g > b * 1.3);
    }
    mask[(y + PAD) * paddedWidth + x + PAD] = ink ? 0 : 255;
  }
  return { kind, sourceWidth, sourceHeight, offsetY, region: { ...source, ...doubleOcrRaster(mask, paddedWidth, paddedHeight) } };
}

/** Twofold cubic interpolation uses exact fixed-point quarter-pixel coefficients. */
export function doubleOcrRaster(gray: Uint8Array, sourceWidth: number, sourceHeight: number) {
  const width = sourceWidth * 2, height = sourceHeight * 2;
  const weights = [[-72, 536, 1800, -216], [-216, 1800, 536, -72]] as const;
  const intermediate = new Int32Array(width * sourceHeight), bgra = new Uint8Array(width * height * 4);
  for (let y = 0; y < sourceHeight; y++) for (let x = 0; x < width; x++) {
    const origin = Math.floor((x + 0.5) / 2 - 0.5), coefficients = weights[x % 2]!;
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += gray[y * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, origin + k - 1))]! * coefficients[k]!;
    intermediate[y * width + x] = sum;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const origin = Math.floor((y + 0.5) / 2 - 0.5), coefficients = weights[y % 2]!;
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += intermediate[Math.max(0, Math.min(sourceHeight - 1, origin + k - 1)) * width + x]! * coefficients[k]!;
    const value = Math.max(0, Math.min(255, (sum + 2097152) >> 22)), at = (y * width + x) * 4;
    bgra[at] = value; bgra[at + 1] = value; bgra[at + 2] = value; bgra[at + 3] = 255;
  }
  return { width, height, bgra };
}

export function restorePersonalLayout(layout: DeltaOcrLayout, raster: PersonalTextRaster): DeltaOcrLayout {
  const box = (input: DeltaOcrBox): DeltaOcrBox => {
    const x = Math.max(0, Math.min(raster.sourceWidth, input.x / 2 - PAD));
    const y = Math.max(0, Math.min(raster.sourceHeight, input.y / 2 - PAD + raster.offsetY));
    return { x, y, width: Math.max(0, Math.min(raster.sourceWidth, (input.x + input.width) / 2 - PAD) - x),
      height: Math.max(0, Math.min(raster.sourceHeight, (input.y + input.height) / 2 - PAD + raster.offsetY) - y) };
  };
  let truncated = layout.truncated;
  const lines = layout.lines.map((line) => ({ ...line, box: box(line.box), words: line.words.map((word) => ({ ...word, box: box(word.box) })) }));
  if (lines.some((line) => line.words.some((word) => word.box.width <= 0 || word.box.height <= 0))) truncated = true;
  return { width: raster.sourceWidth, height: raster.sourceHeight, truncated, lines };
}
