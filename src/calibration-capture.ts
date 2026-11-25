import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { CALIBRATION_SOURCE_PROBE, sameCalibrationSource, supportsPreparation } from './calibration.ts';
import { detectCalibrationAnchors } from './calibration-anchors.ts';
import { recognizeProfile } from './profile-recognition.ts';
import type { CalibrationWorkerRequest, CalibrationWorkerResult, DeltaCapture, DeltaFrameSource, IdentityProgressSink } from './engine-ipc.ts';
import { encodeIdentityFrame } from './identity-debug-png.ts';
import { DELTA_MAX_JPEG_BYTES } from './limits.ts';
import { createOcr } from './ocr.ts';
import { uiGreen } from './pixels.ts';
import { DEFAULT_GAME_ASPECT_RATIO, type DeltaGameAspectRatio, type DeltaGameLanguage } from './protocol.ts';

// The resized preview still requires a native capture buffer.
const MAX_CAPTURE_PIXELS = 7680 * 4320;
const FULL_DISPLAY = { x: 0, y: 0, width: 1, height: 1 };

function hasMatchingBanner(region: CapturedRegion): boolean {
  const columns = 16;
  let green = 0;
  for (const y of [10, 20, 30]) for (let column = 0; column < columns; column++) {
    const x = Math.floor((column + 0.5) * region.width / columns), at = (y * region.width + x) * 4;
    const b = region.bgra[at]!, g = region.bgra[at + 1]!, r = region.bgra[at + 2]!;
    if (uiGreen(b, g, r)) green++;
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

function errorReason(error: unknown, operation: 'capture' | 'ocr') {
  const message = error instanceof Error ? error.message : '';
  if (/timed?\s*out/i.test(message)) return operation + '-timeout';
  if (message === 'OCR region exceeds pixel limit') return 'ocr-pixel-limit';
  if (message === 'displayChanged' || message === 'displayUnavailable') return message === 'displayChanged' ? 'source-changed' : 'display-unavailable';
  return operation + '-exception';
}

// Keep extension locations for debugging even when the exception message contains native or OCR input.
function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return {};
  const locations: string[] = [];
  for (const line of (error.stack ?? '').split('\n').slice(1)) {
    const location = /[\\/]((?:profile-[a-z-]+|calibration(?:-[a-z-]+)?|engine-child|standalone-capture|identity-debug-png|ocr)\.(?:js|ts):\d+:\d+)\)?$/.exec(line);
    if (location) locations.push(location[1]!);
    if (locations.length === 4) break;
  }
  const errorType = ['TypeError', 'RangeError', 'ReferenceError', 'SyntaxError'].includes(error.name) ? error.name : 'Error';
  return { errorType, locations };
}

async function readProfile(region: CapturedRegion, language: DeltaGameLanguage, aspectRatio: DeltaGameAspectRatio, deadline: number,
  progress?: IdentityProgressSink): Promise<Extract<CalibrationWorkerResult, { status: 'identity' }>> {
  let operation = 'open-ocr';
  try {
    const ocr = await createOcr(language || 'zh-CN');
    try {
      progress?.({ kind: 'trace', event: { stage: 'ocr-open', language: ocr.language, availableLanguages: ocr.availableLanguages } });
      if (!ocr.language) return { status: 'identity', suggestion: { status: 'ocr-unavailable' }, reason: 'ocr-language-unavailable' };
      operation = 'recognize-profile';
      const suggestion = await recognizeProfile(region, aspectRatio, ocr, deadline, progress ? event => progress({ kind: 'trace', event }) : undefined);
      return { status: 'identity', suggestion };
    } finally { await ocr.close(); }
  } catch (error) {
    const reason = errorReason(error, 'ocr');
    progress?.({ kind: 'trace', event: { stage: 'error', operation, reason, ...errorDetails(error) } });
    return { status: 'identity', suggestion: { status: 'ocr-unavailable' }, reason };
  }
}

export async function runCalibrationCapture(request: CalibrationWorkerRequest, sink?: IdentityProgressSink): Promise<CalibrationWorkerResult> {
  // The parent allows 25 seconds for capture, recognition, the final display probe and process exit.
  const identityDeadline = Date.now() + 20_000;
  let source: DeltaFrameSource | undefined;
  const identity = request.kind === 'identity-suggest';
  const progress: IdentityProgressSink | undefined = identity && sink ? event => {
    try { sink(event); } catch { /* A diagnostic transport failure must not interrupt recognition. */ }
  } : undefined;
  const failure = (reason: string) => ({ status: 'capture-unavailable' as const, ...(identity && { reason }) });
  let operation = 'open-source';
  try {
    const module = await import(request.frameSourceModule) as { createFrameSource(): DeltaFrameSource | Promise<DeltaFrameSource> };
    source = await module.createFrameSource();
    operation = 'probe-display';
    const probe = await source.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (request.displayId ? probe.display.id !== request.displayId : !probe.display.primary) return failure('display-mismatch');
    if (request.kind === 'calibration-source') return { status: 'source', source: { display: probe.display, topologyRevision: probe.topologyRevision } };
    const { width, height } = probe.display.bounds;
    progress?.({ kind: 'trace', event: { stage: 'display', width, height, displayId: probe.display.id,
      systemNumber: probe.display.systemNumber, scaleFactor: probe.display.scaleFactor } });
    if (width * height > MAX_CAPTURE_PIXELS) return { status: 'unsupported-layout' };
    if (request.kind === 'calibration-preview') {
      const capture = await source.capture(request.displayId);
      return sameCalibrationSource(probe, capture.frame) && capture.jpeg.byteLength <= DELTA_MAX_JPEG_BYTES
        ? { status: 'manual-preview', capture } : failure('source-changed');
    }
    if (identity) {
      operation = 'capture-frame';
      const region = await source.captureRoi(request.displayId, FULL_DISPLAY);
      if (!sameCalibrationSource(probe, region)) return failure('source-changed');
      if (region.width !== width || region.height !== height || region.bgra.byteLength !== width * height * 4) return failure('invalid-frame');
      if (progress) {
        try {
          progress({ kind: 'frame', width, height, displayId: region.display.id, systemNumber: region.display.systemNumber,
            capturedAt: region.capturedAt, png: encodeIdentityFrame(region) });
        } catch (error) {
          progress({ kind: 'trace', event: { stage: 'error', operation: 'encode-frame', reason: 'png-encoding-failed', ...errorDetails(error) } });
        }
      }
      const result = await readProfile(region, request.language || 'zh-CN', request.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO, identityDeadline, progress);
      operation = 'verify-display';
      const current = await source.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
      return sameCalibrationSource(current, probe) ? result : failure('source-changed');
    }
    const { capture, region } = await source.captureEvidence(request.displayId, FULL_DISPLAY);
    if (!sameCalibrationSource(probe, capture.frame) || !sameCalibrationSource(probe, region)
      || capture.frame.capturedAt !== region.capturedAt || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) return { status: 'capture-unavailable' };
    const result = region.width === width && region.height === height && region.bgra.byteLength === width * height * 4
      ? await analyzeCapture(request, region, capture) : { status: 'unsupported-layout' as const, capture };
    const current = await source.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (!sameCalibrationSource(current, capture.frame)) return { status: 'capture-unavailable' };
    return result;
  } catch (error) {
    const reason = errorReason(error, 'capture');
    progress?.({ kind: 'trace', event: { stage: 'error', operation, reason, ...errorDetails(error) } });
    return failure(reason);
  }
  finally { await source?.close?.().catch(() => {}); }
}
