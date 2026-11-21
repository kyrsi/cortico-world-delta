import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { CALIBRATION_SOURCE_PROBE, sameCalibrationSource, supportsPreparation } from './calibration.ts';
import { detectCalibrationAnchors } from './calibration-anchors.ts';
import type { CalibrationWorkerRequest, CalibrationWorkerResult, DeltaCapture, DeltaFrameSource } from './engine-ipc.ts';
import { DELTA_MAX_JPEG_BYTES } from './limits.ts';
import { createOcr } from './ocr.ts';
import { DEFAULT_GAME_ASPECT_RATIO } from './protocol.ts';

// The resized preview still requires a native capture buffer.
const MAX_CAPTURE_PIXELS = 7680 * 4320;
const FULL_DISPLAY = { x: 0, y: 0, width: 1, height: 1 };

function hasMatchingBanner(region: CapturedRegion): boolean {
  const columns = 16;
  let green = 0;
  for (const y of [10, 20, 30]) for (let column = 0; column < columns; column++) {
    const x = Math.floor((column + 0.5) * region.width / columns), at = (y * region.width + x) * 4;
    const b = region.bgra[at]!, g = region.bgra[at + 1]!, r = region.bgra[at + 2]!;
    if (g >= 105 && g - r >= 48 && g - b >= 24) green++;
  }
  return green >= 42;
}

async function analyzeCapture(request: CalibrationWorkerRequest, region: CapturedRegion, capture: DeltaCapture): Promise<CalibrationWorkerResult> {
  if (supportsPreparation(region) && hasMatchingBanner(region)) return { status: 'scene-unrecognized', capture };
  try {
    const language = request.language || 'zh-CN';
    const ocr = await createOcr(language);
    try {
      if (!ocr.language) return { status: 'ocr-unavailable', capture };
      const match = await detectCalibrationAnchors(region, request.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO, ocr);
      if (match?.scene === 'inventory') return { status: 'inventory-ready', capture, loot: match.loot };
      if (match?.scene === 'preparation') return { status: 'ready', capture, anchors: { start: match.start, actions: match.actions } };
      return { status: 'scene-unrecognized', capture };
    } finally { await ocr.close(); }
  } catch { return { status: 'ocr-unavailable', capture }; }
}

export async function runCalibrationCapture(request: CalibrationWorkerRequest): Promise<CalibrationWorkerResult> {
  let source: DeltaFrameSource | undefined;
  try {
    const module = await import(request.frameSourceModule) as { createFrameSource(): DeltaFrameSource | Promise<DeltaFrameSource> };
    source = await module.createFrameSource();
    const probe = await source.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (request.displayId ? probe.display.id !== request.displayId : !probe.display.primary) return { status: 'capture-unavailable' };
    if (request.kind === 'calibration-source') return { status: 'source', source: { display: probe.display, topologyRevision: probe.topologyRevision } };
    const { width, height } = probe.display.bounds;
    if (width * height > MAX_CAPTURE_PIXELS) return { status: 'unsupported-layout' };
    const { capture, region } = await source.captureEvidence(request.displayId, FULL_DISPLAY);
    if (!sameCalibrationSource(probe, capture.frame) || !sameCalibrationSource(probe, region)
      || capture.frame.capturedAt !== region.capturedAt || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) return { status: 'capture-unavailable' };
    const result = region.width === width && region.height === height && region.bgra.byteLength === width * height * 4
      ? await analyzeCapture(request, region, capture) : { status: 'unsupported-layout' as const, capture };
    const current = await source.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (!sameCalibrationSource(current, capture.frame)) return { status: 'capture-unavailable' };
    return result;
  } catch { return { status: 'capture-unavailable' }; }
  finally { await source?.close?.().catch(() => {}); }
}
