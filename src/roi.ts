import type { DeltaRoi } from './protocol.ts';

/** Normalized fraction of a frame. Extra fields on the input are dropped. */
export function captureRoi(value: unknown): DeltaRoi | null {
  if (!value || typeof value !== 'object') return null;
  const roi = value as DeltaRoi;
  if (![roi.x, roi.y, roi.width, roi.height].every(Number.isFinite) || roi.x < 0 || roi.y < 0 || roi.width <= 0 || roi.height <= 0
    || roi.x + roi.width > 1 || roi.y + roi.height > 1) return null;
  return { x: roi.x, y: roi.y, width: roi.width, height: roi.height };
}

/** Outward rounding is shared by calibration budgets and JPEG evidence coordinates. */
export function captureRectangle(roi: DeltaRoi, width: number, height: number) {
  if (!captureRoi(roi)) throw new Error('Invalid capture region');
  const x = Math.floor(roi.x * width), y = Math.floor(roi.y * height);
  return { x, y, width: Math.max(1, Math.min(width - x, Math.ceil((roi.x + roi.width) * width) - x)),
    height: Math.max(1, Math.min(height - y, Math.ceil((roi.y + roi.height) * height) - y)) };
}
