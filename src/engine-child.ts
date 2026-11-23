/** Samples one ROI without JPEG encoding; candidates request one complete evidence frame. */
import { randomUUID } from 'node:crypto';
import jpeg from 'jpeg-js';
import type { CuaFrame } from 'cortico-world-desktop-pet';
import { runCalibrationCapture } from './calibration-capture.ts';
import { Detector, detectionStatus, matchesCalibration } from './detector.ts';
import { DELTA_DEFAULTS } from './config.ts';
import { LootDetector, lootCaptureRoi, lootStatus } from './loot-detector.ts';
import { SharedOcr } from './shared-ocr.ts';
import { DELTA_LOOT_SAMPLE_INTERVAL_MS } from './limits.ts';
import { startupCheck } from './startup-check.ts';
import type { CalibrationWorkerRequest, ChildToMain, DeltaFrameSource, MainToChild } from './engine-ipc.ts';

let active = false;
let generation = 0;
let source: DeltaFrameSource | null = null;
let latest: CuaFrame | null = null;
let detector: Detector | null = null;
let lootDetector: LootDetector | null = null;
let ocr: SharedOcr | null = null;
let displayId = '';
let captures = 0;
let captureTimer: NodeJS.Timeout | null = null;
let heartbeat: NodeJS.Timeout | null = null;
let sampling: Promise<void> = Promise.resolve();
let stopped = false;
const send = (message: ChildToMain) => { if (process.connected) process.send?.(message); };

async function stop(): Promise<void> {
  stopped = true; active = false;
  if (captureTimer) clearTimeout(captureTimer);
  if (heartbeat) clearInterval(heartbeat);
  captureTimer = null; heartbeat = null;
  await Promise.all([detector?.close(), lootDetector?.close(), ocr?.close()]); detector = null; lootDetector = null; ocr = null;
  await sampling; latest = null;
  await source?.close?.(); source = null;
}

async function start(message: Extract<MainToChild, { kind: 'start' }>): Promise<void> {
  if (active || message.version !== 1) return;
  generation = message.generation;
  const { settings } = message; displayId = settings.displayId;
  const module = await import(settings.frameSourceModule) as { createFrameSource(): DeltaFrameSource | Promise<DeltaFrameSource> };
  source = await module.createFrameSource();
  if (stopped) { await source.close?.(); source = null; return; }
  const calibration = settings.detection.calibration;
  const loot = settings.loot ?? DELTA_DEFAULTS.loot;
  ocr = new SharedOcr();
  detector = new Detector(settings.detection, () => source!.captureEvidence(displayId, calibration!.personalFeedbackRoi ?? calibration!.roi), (evidence, match) => {
    if (active) send({ kind: 'event', generation, requestId: 0, id: randomUUID(), eventKind: match.kind, dedupKey: match.dedupKey, synthetic: false,
      capture: evidence.capture, crop: evidence.crop, cropJpeg: evidence.cropJpeg, recognition: match.recognition, attribution: match.attribution, personalSignature: match.personalSignature });
  }, (language) => ocr!.open(language));
  lootDetector = new LootDetector(loot, () => source!.captureEvidence(displayId, lootCaptureRoi(loot.calibration!)), (evidence, match) => {
    if (active) send({ kind: 'event', generation, requestId: 0, id: randomUUID(), eventKind: 'loot', dedupKey: match.dedupKey, synthetic: false,
      capture: evidence.capture, crop: evidence.crop, cropJpeg: evidence.cropJpeg, recognition: match.recognition, attribution: null, lootSignature: match.signature });
  }, (language) => ocr!.open(language), settings.detection);
  active = true; send({ kind: 'ready', generation });
  const publish = () => send({ kind: 'heartbeat', generation, capturedAt: latest?.capturedAt ?? null, frame: latest, captures,
    detection: detector?.status ?? detectionStatus(settings.detection), loot: lootDetector?.status ?? lootStatus(loot, settings.detection),
    lootVisible: latest ? lootDetector?.visible ?? [] : [] });
  heartbeat = setInterval(publish, settings.heartbeatMs);
  let lastLootAtMs = 0;
  const sample = () => {
    if (!active) return;
    sampling = (async () => {
      try {
        const calibration = settings.detection.calibration;
        // Read display geometry before applying any saved region to the selected source.
        const region = await source!.captureRoi(displayId, { x: 0, y: 0, width: 0.000001, height: 0.000001 });
        if (!active) return;
        const bounds = region.display.bounds, scale = Math.min(1, 1280 / bounds.width, 800 / bounds.height);
        const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
        latest = { frameId: randomUUID(), capturedAt: region.capturedAt, display: region.display, topologyRevision: region.topologyRevision,
          width, height, mime: 'image/jpeg', transform: { originX: bounds.x, originY: bounds.y, scaleX: width / bounds.width, scaleY: height / bounds.height } };
        captures++;
        let sampledSource = region;
        const checks = startupCheck(latest, settings.detection, loot);
        if (checks.detection.status === 'compatible' && !detector?.status.reason && calibration) {
          const feed = await source!.captureRoi(displayId, calibration.roi);
          if (!active) return;
          captures++; sampledSource = feed;
          if (calibration.personalFeedbackRoi && matchesCalibration(feed, calibration)) {
            const personal = await source!.captureRoi(displayId, calibration.personalFeedbackRoi);
            if (!active) return;
            captures++; sampledSource = personal; detector?.submit(personal);
          } else detector?.submit(feed);
        } else if (checks.detection.status === 'invalid') detector?.submit(region);
        const lootSourceMatches = !!loot.calibration && matchesCalibration(sampledSource, { ...loot.calibration, roi: loot.calibration.itemsRoi });
        if (checks.loot.status === 'invalid' || loot.enabled && !lootSourceMatches) lootDetector?.submit(sampledSource);
        if (checks.loot.status === 'compatible' && loot.calibration && lootSourceMatches && !lootDetector?.status.reason && Date.now() - lastLootAtMs >= DELTA_LOOT_SAMPLE_INTERVAL_MS) {
          lastLootAtMs = Date.now();
          const items = await source!.captureRoi(displayId, loot.calibration.itemsRoi);
          if (!active) return;
          captures++; lootDetector?.submit(items);
        }
        publish();
        captureTimer = setTimeout(sample, settings.captureIntervalMs);
      } catch (err) {
        if (!active) return;
        latest = null;
        lootDetector?.clearVisible();
        const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
        if (code === 'captureTransportFailed' || code === 'captureFailed') {
          active = false;
          if (heartbeat) clearInterval(heartbeat);
          send({ kind: 'error', generation, reason: 'worker-failed', message: String(err) });
        } else {
          send({ kind: 'error', generation, reason: 'source-unavailable', message: String(err) });
          captureTimer = setTimeout(sample, Math.max(1000, settings.captureIntervalMs));
        }
      }
    })();
  };
  sample();
}

function simulate(message: Extract<MainToChild, { kind: 'simulate' }>): void {
  if (!active || !latest) return;
  const width = 128, height = 80, rgba = Buffer.alloc(width * height * 4);
  const color = { kill: [180, 40, 20], knockdown: [20, 60, 180], loot: [180, 110, 20] }[message.eventKind];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    rgba[i] = color[0]! + x % 30; rgba[i + 1] = color[1]! + y % 30; rgba[i + 2] = color[2]!; rgba[i + 3] = 255;
  }
  const full = jpeg.encode({ data: rgba, width, height }, 90).data, decoded = jpeg.decode(full, { useTArray: true });
  const crop = { x: 64, y: 0, width: 64, height: 40 }, cropped = Buffer.alloc(crop.width * crop.height * 4);
  for (let y = 0; y < crop.height; y++) {
    const start = ((crop.y + y) * width + crop.x) * 4;
    cropped.set(decoded.data.subarray(start, start + crop.width * 4), y * crop.width * 4);
  }
  const display = latest.display;
  send({ kind: 'event', generation, requestId: message.requestId, id: message.eventId, eventKind: message.eventKind, dedupKey: message.dedupKey, synthetic: true, recognition: null,
    capture: { jpeg: full, frame: { ...latest, frameId: randomUUID(), capturedAt: new Date().toISOString(), width, height,
      transform: { originX: display.bounds.x, originY: display.bounds.y, scaleX: width / display.bounds.width, scaleY: height / display.bounds.height } } },
    crop, cropJpeg: jpeg.encode({ data: cropped, width: crop.width, height: crop.height }, 90).data });
}

process.on('message', (message: MainToChild | CalibrationWorkerRequest) => {
  if (message.kind === 'start') void start(message).catch((err) => send({ kind: 'error', generation, reason: 'worker-failed', message: String(err) }));
  else if (message.kind === 'stop') void stop().finally(() => process.exit(0));
  else if (message.kind === 'simulate') simulate(message);
  else if (message.kind === 'preview' && !active) send({ kind: 'preview', generation, requestId: message.requestId, capture: null });
  else if (message.kind === 'preview') {
    void source!.capture(displayId).then((capture) => { if (active) send({ kind: 'preview', generation, requestId: message.requestId, capture }); })
      .catch(() => { if (active) send({ kind: 'preview', generation, requestId: message.requestId, capture: null }); });
  }
  else if (message.kind === 'calibration-suggest' || message.kind === 'calibration-source' || message.kind === 'calibration-preview' || message.kind === 'identity-suggest') {
    const progress = message.kind === 'identity-suggest' && message.identityDebug;
    void runCalibrationCapture(message, progress ? event => { if (process.connected) process.send?.(event); } : undefined)
      .then((result) => { if (process.connected) process.send?.(result); });
  }
});
process.on('disconnect', () => { void stop().finally(() => process.exit(0)); });
