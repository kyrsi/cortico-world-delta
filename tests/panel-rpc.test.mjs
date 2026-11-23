import assert from 'node:assert/strict';
import test from 'node:test';
import jpeg from 'jpeg-js';
import { DeltaWorld, DELTA_DEFAULTS } from '../src/index.ts';
import { deltaText } from '../src/i18n/index.ts';
import { displays } from './fixtures/dual-display-source.mjs';

const fixture = new URL('./fixtures/dual-display-source.mjs', import.meta.url).href;

function setup() {
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  const world = new DeltaWorld({ cfg, persist() {}, standalone: { frameSourceModule: fixture, async listDisplays() { return displays; } } });
  const call = (method, ...args) => world.webUi('en').invoke('observer', method, args);
  return { world, call };
}

test('unknown panel methods return the localized unknownMethod error', async () => {
  const { world } = setup();
  const en = deltaText('en').errors, zh = deltaText('zh').errors;
  for (const method of ['missing', 'toString', 'constructor']) {
    await assert.rejects(world.webUi('en').invoke('observer', method, []), { message: en.unknownMethod });
  }
  await assert.rejects(world.webUi('en').invoke('settings', 'state', []), { message: en.unknownMethod });
  await assert.rejects(world.webUi('zh').invoke('observer', 'missing', []), { message: zh.unknownMethod });
});

test('panel methods reject the wrong argument count with invalidRequest', async () => {
  const { call } = setup();
  const message = deltaText('en').errors.invalidRequest;
  const cases = [
    ['state', [true]], ['start', [1]], ['pause', ['x']], ['stop', [false]],
    ['identitySuggest', [1]], ['identityDebugReveal', [1]], ['identitySave', []],
    ['speechConfigure', []], ['knowledgeRead', ['x']], ['knowledgeImport', []], ['knowledgeReload', [1]], ['knowledgeRestore', [1]],
    ['listStandaloneDisplays', [1]], ['prepareCalibration', []], ['startStandalone', []], ['cancelCalibration', [1]],
    ['quickSetupConfigure', []], ['calibrationSuggest', [1]], ['calibrationAspectRatioConfigure', []], ['calibrationApply', []],
    ['calibrationDismiss', []], ['detectionPreview', [1]], ['detectionPreviewImage', []], ['detectionConfigure', []],
    ['detectionCalibrate', []], ['detectionCalibrate', ['frame', {}, {}, 'extra']],
    ['lootConfigure', []], ['lootCalibrate', []], ['lootCalibrate', ['frame', { x: 0, y: 0, width: .1, height: .1 }]],
    ['simulate', []], ['eventImage', ['id']], ['revealScreenshot', []],
  ];
  for (const [method, args] of cases) await assert.rejects(call(method, ...args), { message }, method);
});

const log = { warn() {}, child() { return this; } };
const host = { modelFacts: { accepts: (type) => type === 'image/jpeg' }, log };
const rectangle = { x: 0.1, y: 0.1, width: 0.2, height: 0.1 };

function merge(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) merge(target[key], value);
    else target[key] = value;
  }
}

function previewCapture(display) {
  const { width, height, x, y } = display.bounds;
  return { jpeg: jpeg.encode({ width, height, data: Buffer.alloc(width * height * 4, 210) }).data,
    frame: { frameId: 'cal-frame', capturedAt: '2026-01-01T00:00:00.000Z', display, width, height, topologyRevision: 'test', mime: 'image/jpeg',
      transform: { originX: x, originY: y, scaleX: 1, scaleY: 1 } } };
}

async function calibrationPreview(t) {
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  const patches = [];
  const display = displays.find((item) => item.id === 'secondary');
  const capture = previewCapture(display);
  let calls = 0;
  const world = new DeltaWorld({ cfg, persist(patch) { patches.push(structuredClone(patch)); merge(cfg, patch); },
    standalone: { frameSourceModule: fixture, async listDisplays() { return displays; } },
    calibrationOperation: async (request) => {
      calls += 1;
      if (request.kind === 'calibration-preview') return { status: 'manual-preview', capture };
      if (request.kind === 'calibration-source') return { status: 'source', source: { display, topologyRevision: capture.frame.topologyRevision } };
      return { status: 'capture-unavailable' };
    } });
  await world.start(host);
  t.after(() => world.stop());
  const call = (method, ...args) => world.webUi('en').invoke('observer', method, args);
  await call('prepareCalibration', display.id);
  const frame = await call('detectionPreview');
  return { call, patches, frame, calls: () => calls, reset() { calls = 0; } };
}

test('malformed calibration regions fail with invalidRequest and zero calibrationOperation calls', async (t) => {
  const { call, patches, frame, calls, reset } = await calibrationPreview(t);
  const message = deltaText('en').errors.invalidRequest;
  const good = { ...rectangle };
  reset();
  const saved = patches.length;
  const attempts = [
    () => call('lootCalibrate', frame.frameId, { ...good, width: 0 }, good),
    () => call('lootCalibrate', frame.frameId, good, { x: 0.8, y: 0, width: 0.3, height: 0.1 }),
    () => call('lootCalibrate', frame.frameId, 'region', good),
    () => call('lootCalibrate', frame.frameId, { ...good, x: Number.NaN }, good),
    () => call('lootCalibrate', frame.frameId, good),
    () => call('detectionCalibrate', frame.frameId, { ...good, x: -0.01 }),
    () => call('detectionCalibrate', frame.frameId, good, { x: 0, y: 0, width: 1.1, height: 0.1 }),
    () => call('detectionCalibrate', frame.frameId, good, 'personal'),
    () => call('detectionCalibrate', frame.frameId),
    () => call('detectionCalibrate', frame.frameId, good, good, 'extra'),
  ];
  for (const attempt of attempts) await assert.rejects(attempt(), { message });
  assert.equal(calls(), 0);
  assert.equal(patches.length, saved);
});

test('a valid calibration persists only x, y, width and height', async (t) => {
  const { call, patches, frame } = await calibrationPreview(t);
  const items = { ...rectangle, label: 'items', nested: { kept: false } };
  const context = { x: 0.1, y: 0.4, width: 0.25, height: 0.05, label: 'context' };
  const personal = { x: 0.2, y: 0.5, width: 0.15, height: 0.08, label: 'personal' };
  await call('lootCalibrate', frame.frameId, items, context);
  const loot = patches.at(-1).loot.calibration;
  assert.deepEqual(loot.itemsRoi, rectangle);
  assert.deepEqual(loot.contextRoi, { x: 0.1, y: 0.4, width: 0.25, height: 0.05 });
  const combat = await call('detectionPreview');
  await call('detectionCalibrate', combat.frameId, items, personal);
  const detection = patches.at(-1).detection.calibration;
  assert.deepEqual(detection.roi, rectangle);
  assert.deepEqual(detection.personalFeedbackRoi, { x: 0.2, y: 0.5, width: 0.15, height: 0.08 });
  const again = await call('detectionPreview');
  await call('detectionCalibrate', again.frameId, rectangle);
  assert.equal(patches.at(-1).detection.calibration.personalFeedbackRoi, null);
  const fresh = await call('detectionPreview');
  await call('detectionCalibrate', fresh.frameId, rectangle, null);
  assert.equal(patches.at(-1).detection.calibration.personalFeedbackRoi, null);
});
