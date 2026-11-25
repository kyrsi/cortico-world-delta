import assert from 'node:assert/strict';
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { DeltaWorld, DELTA_DEFAULTS } from '../src/index.ts';
import { displays } from './fixtures/dual-display-source.mjs';

const fixture = new URL('./fixtures/dual-display-source.mjs', import.meta.url).href;
const log = { warn() {}, child() { return this; } };
const host = { modelFacts: { accepts: type => type === 'image/jpeg' }, log };

function setup(listDisplays = async () => displays, options = {}) {
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  cfg.captureIntervalMs = 30;
  const world = new DeltaWorld({ cfg, persist: patch => Object.assign(cfg, patch),
    standalone: { frameSourceModule: fixture, listDisplays }, ...options });
  const call = (method, ...args) => world.webUi('en').invoke('observer', method, args);
  return { cfg, world, call };
}

async function until(world, predicate) {
  const end = Date.now() + 10_000;
  let state;
  do {
    state = world.state();
    if (predicate(state)) return state;
    await delay(20);
  } while (Date.now() < end);
  assert.fail('Timed out waiting for observation: ' + JSON.stringify({ phase: state.phase, reason: state.reason }));
}

test('standalone reads only the selected screen and forgets consent across pauses and restarts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'delta-world-displays-'));
  const control = join(directory, 'connected.json');
  const previous = process.env.DELTA_TEST_DISPLAYS;
  process.env.DELTA_TEST_DISPLAYS = control;
  t.after(async () => {
    if (previous === undefined) delete process.env.DELTA_TEST_DISPLAYS;
    else process.env.DELTA_TEST_DISPLAYS = previous;
    await rm(directory, { recursive: true, force: true });
  });
  await writeFile(control, JSON.stringify(['primary', 'secondary']));
  let calibration;
  const { world, cfg, call } = setup(undefined, { calibrationOperation: (request, signal) => new Promise(resolve => {
    calibration = { request, signal, resolve };
  }) });
  t.after(() => world.stop());
  cfg.observer.enabled = true;
  cfg.standaloneDisplayId = 'secondary';
  await world.start(host);
  assert.equal(world.state().worker.pid, null);
  assert.deepEqual(await call('listStandaloneDisplays'), displays);
  assert.equal(world.state().worker.pid, null);
  assert.equal((await call('calibrationSuggest')).status, 'capture-unavailable');
  await assert.rejects(call('start'));
  await assert.rejects(call('startStandalone', ''));
  await assert.rejects(call('startStandalone', 'unknown'));
  assert.equal(world.state().standaloneGranted, false);
  await call('startStandalone', 'secondary');
  await until(world, state => state.phase === 'running' && state.source.id === 'secondary');
  const frame = await call('detectionPreview');
  assert.equal(frame.display.id, 'secondary');
  assert.ok((await call('detectionPreviewImage', frame.frameId)).$binary.base64);
  await writeFile(control, JSON.stringify(['primary']));
  const missing = await until(world, state => state.reason === 'source-unavailable');
  assert.equal(missing.source, null);
  assert.equal(missing.configuredDisplayId, 'secondary');
  await assert.rejects(call('detectionPreviewImage', frame.frameId));
  await writeFile(control, JSON.stringify(['primary', 'secondary']));
  const restored = await until(world, state => state.phase === 'running' && state.source?.id === 'secondary');
  assert.equal(restored.worker.pid, missing.worker.pid);
  assert.equal(restored.worker.restarts, 0);
  const pendingCalibration = call('calibrationSuggest');
  assert.equal(calibration.request.displayId, 'secondary');
  assert.equal(calibration.request.frameSourceModule, fixture);
  assert.equal((await call('pause')).standaloneGranted, false);
  assert.ok(calibration.signal.aborted);
  calibration.resolve({ status: 'scene-unrecognized' });
  assert.equal((await pendingCalibration).status, 'capture-unavailable');
  assert.equal(world.state().worker.pid, null);
  await writeFile(control, JSON.stringify(['primary', 'secondary']));
  await call('startStandalone', 'primary');
  await until(world, state => state.source?.id === 'primary');
  assert.equal(cfg.standaloneDisplayId, 'primary');
  cfg.standaloneDisplayId = 'secondary';
  const changedPreference = world.state();
  assert.equal(changedPreference.standaloneGranted, false);
  assert.equal(changedPreference.worker.pid, null);
  await call('startStandalone', 'primary');
  await world.stop();
  await world.start(host);
  const restarted = world.state();
  assert.equal(restarted.intent, 'stopped');
  assert.equal(restarted.standaloneGranted, false);
  assert.equal(restarted.configuredDisplayId, 'primary');
  assert.equal(restarted.worker.pid, null);
});

test('a broken capture pipe gets a new worker until the session restart budget is spent', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'delta-world-recovery-'));
  const control = join(directory, 'capture.json');
  const previous = process.env.DELTA_TEST_DISPLAYS;
  process.env.DELTA_TEST_DISPLAYS = control;
  const { world, cfg, call } = setup();
  t.after(async () => {
    await world.stop();
    if (previous === undefined) delete process.env.DELTA_TEST_DISPLAYS;
    else process.env.DELTA_TEST_DISPLAYS = previous;
    await rm(directory, { recursive: true, force: true });
  });
  async function signal(value) {
    await writeFile(control + '.new', JSON.stringify(value));
    await rename(control + '.new', control);
  }
  cfg.worker.maxRestarts = 2;
  cfg.worker.restartDelayMs = 250;
  await signal(['secondary']);
  await world.start(host);
  await call('startStandalone', 'secondary');
  const first = await until(world, state => state.phase === 'running');
  await signal('broken-pipe');
  await until(world, state => state.reason === 'worker-failed' && state.worker.restarts === 1);
  await signal(['secondary']);
  const recovered = await until(world, state => state.phase === 'running');
  assert.notEqual(recovered.worker.pid, first.worker.pid);
  assert.equal(recovered.source.id, 'secondary');
  await signal('broken-pipe');
  const exhausted = await until(world, state => state.phase === 'error');
  assert.equal(exhausted.reason, 'worker-failed');
  assert.equal(exhausted.worker.restarts, cfg.worker.maxRestarts);
  assert.equal(exhausted.worker.pid, null);
  await signal(['secondary']);
  await delay(cfg.worker.restartDelayMs + 200);
  assert.equal(world.state().phase, 'error');
  assert.equal(world.state().worker.pid, null);
  await call('startStandalone', 'secondary');
  const fresh = await until(world, state => state.phase === 'running');
  assert.equal(fresh.worker.restarts, 0);
});

test('stop cancels a pending display grant before enumeration can start a worker', async t => {
  let release;
  const { world, call } = setup(() => new Promise(resolve => { release = resolve; }));
  await world.start(host);
  t.after(() => world.stop());
  const request = call('startStandalone', 'secondary');
  assert.equal(world.state().actions.stop, true);
  await call('stop');
  release(displays);
  await assert.rejects(request);
  assert.equal(world.state().worker.pid, null);
  assert.equal(world.state().standaloneGranted, false);
});

test('explicit calibration reads one selected screen without starting observation or acquiring a hotkey', async t => {
  const path = await mkdtemp(join(tmpdir(), 'delta-setup-display-'));
  const previous = process.env.DELTA_TEST_DISPLAYS;
  const control = join(path, 'displays.json');
  process.env.DELTA_TEST_DISPLAYS = control;
  await writeFile(control, JSON.stringify(['primary', 'secondary']));
  let registrations = 0;
  const { world, call } = setup(undefined, { standalone: { frameSourceModule: fixture, listDisplays: async () => displays,
    calibrationHotkey: { register() { registrations++; return () => {}; } } } });
  t.after(async () => {
    await world.stop();
    if (previous === undefined) delete process.env.DELTA_TEST_DISPLAYS;
    else process.env.DELTA_TEST_DISPLAYS = previous;
    await rm(path, { recursive: true, force: true });
  });
  await world.start(host);
  await assert.rejects(call('detectionPreview'));
  const setupState = await call('prepareCalibration', 'secondary');
  assert.equal(setupState.calibrationDisplayId, 'secondary');
  assert.equal(setupState.standaloneGranted, false);
  assert.equal(setupState.intent, 'stopped');
  assert.equal(setupState.worker.pid, null);
  assert.equal(setupState.calibrationHotkey.status, 'blocked');
  const frame = await call('detectionPreview');
  assert.equal(frame.display.id, 'secondary');
  assert.ok((await call('detectionPreviewImage', frame.frameId)).$binary.base64);
  const roi = { x: .1, y: .1, width: .1, height: .1 };
  await writeFile(control, JSON.stringify(['primary']));
  await assert.rejects(call('detectionCalibrate', frame.frameId, roi));
  assert.equal(world.state().detection.config.calibration, null);
  await writeFile(control, JSON.stringify(['primary', 'secondary']));
  assert.equal((await call('cancelCalibration')).calibrationDisplayId, null);
  await assert.rejects(call('detectionPreviewImage', frame.frameId));
  assert.equal(world.state().worker.captures, 0);
  assert.equal(registrations, 0);
  for (const exit of ['pause', 'stop']) {
    await call('prepareCalibration', 'secondary');
    assert.equal((await call(exit)).calibrationDisplayId, null);
    await assert.rejects(call('detectionPreview'));
  }
  await call('prepareCalibration', 'secondary');
  await world.stop(); await world.start(host);
  assert.equal(world.state().calibrationDisplayId, null);
  await call('prepareCalibration', 'secondary');
  const running = await call('startStandalone', 'secondary');
  assert.equal(running.calibrationDisplayId, null);
  assert.equal(running.standaloneGranted, true);
  await call('cancelCalibration');
  await until(world, state => state.phase === 'running');
});

test('closing setup cancels in-flight enumeration and active single-frame requests', async t => {
  const pending = Promise.withResolvers();
  let list = () => pending.promise;
  const read = Promise.withResolvers();
  let signal;
  const { world, call } = setup(() => list(), { calibrationOperation: (_request, abort) => {
    signal = abort; return read.promise;
  } });
  await world.start(host);
  t.after(() => world.stop());
  const preparing = call('prepareCalibration', 'secondary');
  await call('cancelCalibration');
  pending.resolve(displays);
  await assert.rejects(preparing);
  assert.equal(world.state().calibrationDisplayId, null);
  list = async () => displays;
  await call('prepareCalibration', 'secondary');
  const capture = call('calibrationSuggest');
  await call('cancelCalibration');
  assert.ok(signal.aborted);
  read.resolve({ status: 'scene-unrecognized' });
  assert.equal((await capture).status, 'capture-unavailable');
});

test('an abandoned setup grant expires without reading a frame', async t => {
  const { world, call } = setup();
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  await world.start(host);
  t.after(() => world.stop());
  await call('prepareCalibration', 'secondary');
  now += 600_000;
  const state = world.state();
  assert.equal(state.calibrationDisplayId, null);
  assert.equal(state.standaloneGranted, false);
  assert.equal(state.worker.captures, 0);
  await assert.rejects(call('detectionPreview'));
});

test('a model without image input cannot grant continuous observation', async t => {
  const { world, call } = setup();
  await world.start({ ...host, modelFacts: { accepts: () => false } });
  t.after(() => world.stop());
  assert.equal(world.state().startBlockedReason, 'no-image-model');
  await assert.rejects(call('startStandalone', 'secondary'));
  assert.equal(world.state().worker.pid, null);
  assert.equal(world.state().standaloneGranted, false);
});

test('a host binding owns its viewing permission even when standalone capture is available', async t => {
  const { world, cfg, call } = setup();
  cfg.observer.enabled = true;
  const policy = { revision: '1', displayId: 'primary', viewEnabled: true, observationEnabled: true,
    viewPermitted: false, corePaused: false, outputAvailable: true };
  world.bindProduct({ version: 1, snapshot: () => policy });
  await world.start(host);
  t.after(() => world.stop());
  assert.equal(world.state().captureMode, 'host');
  assert.equal(world.state().reason, 'view-permission');
  await assert.rejects(call('listStandaloneDisplays'));
  await assert.rejects(call('startStandalone', 'secondary'));
  assert.equal((await call('calibrationSuggest')).status, 'capture-unavailable');
  policy.viewPermitted = true;
  policy.corePaused = true;
  assert.equal(world.state().reason, 'core-paused');
  world.bindProduct(undefined);
  assert.equal(world.state().captureMode, 'standalone');
  assert.equal(world.state().worker.pid, null);
  assert.equal(world.state().standaloneGranted, false);
});
