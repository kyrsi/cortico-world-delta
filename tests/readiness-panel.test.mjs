import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import jpeg from 'jpeg-js';
import { LANGUAGES } from 'cortico/core/language.ts';
import { createWebUi } from 'cortico/web/client/ui/index.ts';
import { WorldAssembly } from 'cortico/world.ts';
import { deltaDefinition, DELTA_DEFAULTS } from '../src/index.ts';
import { captureText } from '../src/console/strings-capture.ts';
import { dashboardText } from '../src/console/strings-dashboard.ts';
import { detectionText } from '../src/console/strings-detection.ts';
import { lootText } from '../src/console/strings-loot.ts';
import { startupText } from '../src/console/strings-startup.ts';

const { JSDOM } = createRequire(import.meta.resolve('cortico/web/client/ui/index.ts'))('jsdom');
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/console/observer.ts', import.meta.url))],
  bundle: true, format: 'iife', globalName: 'observerPanel', platform: 'browser', write: false, loader: { '.css': 'empty' } });
const display = { id: 'offline', name: 'Test display', primary: true, systemNumber: 1,
  bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1, rotation: 0 };
const source = { display, topologyRevision: 'test' };
const roi = { x: .1, y: .1, width: .15, height: .06 };
const combatArea = { ...source, roi };
const lootAreas = { ...source, itemsRoi: roi, contextRoi: { ...roi, y: .05 } };
const D = detectionText('zh'), L = lootText('zh'), C = startupText('zh');

async function panel(t, { detection = {}, loot = {}, permitted = true, language = 'zh', standalone = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'delta-readiness-'));
  const path = join(directory, 'config.json'), cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  Object.assign(cfg.detection, { enabled: true }, detection);
  Object.assign(cfg.loot, { enabled: true }, loot);
  const config = { worlds: { delta: cfg } };
  await writeFile(path, JSON.stringify(config));
  const binding = { version: 1, snapshot: () => ({ revision: 'test', displayId: display.id, viewEnabled: true,
    observationEnabled: true, viewPermitted: permitted, corePaused: false, outputAvailable: true }) };
  const calibrationCalls = [];
  const frameSourceModule = new URL('./fixtures/dual-display-source.mjs', import.meta.url).href;
  const frame = { ...source, frameId: 'sample', capturedAt: new Date().toISOString(), mime: 'image/jpeg', width: 64, height: 36,
    transform: { originX: 0, originY: 0, scaleX: 64 / display.bounds.width, scaleY: 36 / display.bounds.height } };
  const calibrationOperation = async request => {
    calibrationCalls.push(request.kind);
    if (request.kind === 'calibration-source') return { status: 'source', source };
    if (request.kind === 'identity-suggest') return { status: 'identity', suggestion: { status: 'candidate', nickname: 'FixturePlayer' } };
    return { status: 'ready', capture: { frame, jpeg: jpeg.encode({ width: frame.width, height: frame.height,
      data: Buffer.alloc(4 * frame.width * frame.height, 200) }).data } };
  };
  const adapter = standalone ? { standalone: { frameSourceModule, listDisplays: async () => [display] } } : { binding };
  const assembly = new WorldAssembly({ rootDir: directory, dataDir: directory, config },
    [deltaDefinition({ ...adapter, frameSourceModule, calibrationOperation })], ['delta']);
  const world = assembly.slot('delta').instance;
  const dom = new JSDOM('<body></body>', { pretendToBeVisual: true, runScripts: 'outside-only' });
  dom.window.URL.createObjectURL = URL.createObjectURL;
  dom.window.URL.revokeObjectURL = URL.revokeObjectURL;
  const { observerView } = dom.window.eval(bundle.outputFiles[0].text + '\nobserverPanel');
  const { document, AbortController, Event } = dom.window, abort = new AbortController();
  t.after(async () => {
    abort.abort();
    dom.window.close();
    await world.stop();
    await rm(directory, { recursive: true, force: true });
  });
  const log = { warn() {}, child() { return this; } };
  await world.start({ modelFacts: { accepts: () => true }, log });
  const ui = createWebUi({ doc: document, overlayHost: document.body, signal: abort.signal,
    memo: { get: (_key, fallback) => fallback, set() {} } });
  const rpc = world.webUi(language);
  const requests = [];
  let poll;
  const view = observerView({ language, ui, signal: abort.signal, interval(fn) { poll = fn; }, availability: async () => ({ kind: 'active' }),
    invoke: (method, args) => {
      requests.push(method);
      return rpc.invoke('observer', method, args);
    }, invokePreviewBinary: async frameId => {
      const result = await rpc.invoke('observer', 'detectionPreviewImage', [frameId]);
      return new Blob([Buffer.from(result.$binary.base64, 'base64')], { type: 'image/jpeg' });
    } });
  document.body.append(view);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  const readiness = view.querySelector('[data-observer-section="readiness"]');
  assert.equal(readiness.hidden, false);
  function channel(key) {
    const card = readiness.querySelector('[data-startup-calibration="' + key + '"]');
    const settings = view.querySelector('details[data-observer-section="' + key + '"]');
    const target = card.querySelector('[data-observer-target="' + key + '"]');
    const status = card.querySelector('.delta-channel-status');
    const missing = () => [...status.querySelectorAll('[data-observer-missing]')].map(el => el.textContent);
    const control = label => settings.querySelector('[aria-label="' + label + '"]');
    return { target, settings, status, control, missing };
  }
  const el = selector => {
    const element = view.querySelector(selector);
    assert.ok(element, selector);
    return element;
  };
  async function click(selector) {
    const element = el(selector);
    assert.equal(element.closest('[hidden]'), null, selector + ' must be visible');
    assert.ok(!element.disabled, selector + ' must be enabled');
    element.click();
    await settle();
  }
  async function edit(selector, value) {
    const element = el(selector);
    element.value = value;
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    await settle();
  }
  const readCfg = async () => JSON.parse(await readFile(path, 'utf8')).worlds.delta;
  return { document, el, channel, click, edit, requests, calibrationCalls, readCfg,
    refresh: async () => { await poll(); await settle(); },
    permit: async value => { permitted = value; await poll(); await settle(); } };
}

const play = '[data-observer-play]';
const wizard = '[data-quick-setup]';
const overall = '[data-observer-overall]';
const action = key => '[data-setup-action="' + key + '"]';
const field = key => '[data-setup-field="' + key + '"]';
const jump = key => '[data-setup-jump="' + key + '"]';
const manual = key => '[data-setup-manual="' + key + '"]';

for (const language of LANGUAGES) {
  test('language shortcuts open quick setup and one save fills both enabled channels in ' + language, async t => {
    const p = await panel(t, { detection: { nickname: 'FixturePlayer', calibration: combatArea }, loot: { calibration: lootAreas }, language });
    const detection = detectionText(language), items = lootText(language), setup = dashboardText(language);
    assert.equal(p.el(wizard).hidden, true);
    assert.equal(p.el(overall).dataset.observerOverall, 'setup');
    for (const [key, label] of [['detection', detection.language], ['loot', items.language]]) {
      const c = p.channel(key);
      assert.deepEqual(c.missing(), [label]);
      assert.ok(c.status.textContent.includes(setup.incomplete));
      await p.click('[data-observer-target="' + key + '"]');
      assert.equal(p.el(wizard).hidden, false);
      assert.equal(c.settings.open, false);
      await p.click(jump('language'));
      assert.equal(p.document.activeElement, p.el(field('language')));
      await p.click(action('close'));
    }
    await p.click(play);
    await p.edit(field('language'), 'zh-CN');
    await p.click(action('save'));
    const cfg = await p.readCfg();
    assert.equal(cfg.detection.language, 'zh-CN');
    assert.equal(cfg.loot.language, 'zh-CN');
    assert.deepEqual(p.channel('detection').missing(), []);
    assert.deepEqual(p.channel('loot').missing(), []);
    assert.equal(p.requests.includes('start'), false);
    assert.deepEqual(p.calibrationCalls, []);
  });
}

test('first play with both channels off selects one channel without enabling the other', async t => {
  const p = await panel(t, { detection: { enabled: false }, loot: { enabled: false } });
  await p.click(play);
  assert.ok(!p.el(wizard).hidden);
  for (const key of ['detection', 'loot']) {
    const channel = p.channel(key);
    assert.equal(channel.settings.open, false);
    assert.equal(channel.status.textContent, D.phases.disabled);
    assert.deepEqual(channel.missing(), []);
  }
  assert.equal(p.el(action('save')).disabled, true);
  await p.click(jump('channels'));
  await p.click(field('loot'));
  assert.ok(p.el(jump('channels')).closest('[hidden]'));
  assert.equal(p.el(jump('language')).closest('[hidden]'), null);
  assert.equal(p.el(action('save')).disabled, true);
  await p.edit(field('language'), 'zh-CN');
  await p.click(action('save'));
  const cfg = await p.readCfg();
  assert.equal(cfg.detection.enabled, false);
  assert.equal(cfg.loot.enabled, true);
  assert.deepEqual(p.channel('detection').missing(), []);
  assert.deepEqual(p.channel('loot').missing(), [C.loot]);
  assert.equal(p.requests.includes('start'), false);
  assert.deepEqual(p.calibrationCalls, []);
});

test('only the explicit manual link opens detailed settings and Back returns to quick setup', async t => {
  const p = await panel(t);
  await p.click(play);
  assert.ok(!p.el(wizard).hidden);
  assert.deepEqual(p.channel('detection').missing(), [D.nickname, D.language, C.combat]);
  for (const key of ['detection', 'loot']) {
    assert.equal(p.channel(key).settings.open, false);
    const disclosure = p.el(manual(key)).closest('details');
    if (!disclosure.open) await p.click('.delta-setup-details > summary');
    await p.click(manual(key));
    assert.equal(p.channel(key).settings.open, true);
    await p.click('[data-setup-back]');
    assert.ok(!p.el(wizard).hidden);
  }
  assert.equal(p.requests.includes('start'), false);
  assert.deepEqual(p.calibrationCalls, []);
});

test('nickname entry and confirmed calibration clear the requirements without starting observation', async t => {
  const p = await panel(t, { detection: { language: 'zh-CN' }, loot: { language: 'zh-CN' } });
  await p.click(play);
  await p.click(jump('nickname'));
  await p.edit('.delta-identity-field input', 'FixturePlayer');
  await p.click('[data-identity-action="save"]');
  assert.deepEqual(p.channel('detection').missing(), [C.combat]);
  await p.click(jump('combatRegions'));
  assert.deepEqual(p.calibrationCalls, []);
  const capture = '[data-calibration-action="suggest"]', save = '[data-calibration-action="apply"]';
  await p.click(capture);
  await waitUntil(() => !p.el(save).disabled && !p.el(save).hidden, () => JSON.stringify({ status: p.el('[data-calibration-status]').dataset.calibrationStatus, requests: p.requests, worker: p.calibrationCalls }));
  await p.click(save);
  assert.deepEqual(p.channel('detection').missing(), []);
  assert.deepEqual(p.channel('loot').missing(), []);
  assert.deepEqual(p.calibrationCalls, ['calibration-suggest', 'calibration-source']);
  assert.equal(p.requests.includes('start'), false);
  const cfg = await p.readCfg();
  assert.equal(cfg.detection.nickname, 'FixturePlayer');
  assert.ok(cfg.detection.calibration?.roi && cfg.loot.calibration?.itemsRoi);
});

async function waitUntil(check, diagnostic = () => 'Expected UI state did not appear') {
  const until = Date.now() + 6500;
  while (Date.now() < until) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.ok(check(), diagnostic());
}

test('a prepared host starts directly and the same control pauses it', async t => {
  const p = await panel(t, { detection: { language: 'zh-CN', nickname: 'FixturePlayer', calibration: combatArea }, loot: { enabled: false } });
  assert.equal(p.el(play).dataset.mode, 'start');
  assert.equal(p.el(overall).dataset.observerOverall, 'ready');
  assert.ok(p.el('[data-observer-bar]').contains(p.el(overall)) && p.el('[data-observer-bar]').contains(p.el(play)));
  await p.click('[data-open-setup]');
  assert.equal(p.el(wizard).hidden, false);
  assert.equal(p.el(action('play')).disabled, false);
  await p.click(action('close'));
  await p.click(play);
  await waitUntil(() => p.el(play).dataset.mode === 'pause');
  assert.ok(p.document.querySelector('[data-capture-pause]').closest('[hidden]'));
  assert.equal(p.el(wizard).hidden, true);
  await p.click(play);
  await waitUntil(() => p.el(play).dataset.mode === 'start');
  assert.equal(p.el(overall).dataset.observerOverall, 'paused');
  assert.equal(p.requests.filter(op => op === 'start').length, 1);
  assert.equal(p.requests.filter(op => op === 'pause').length, 1);
});

test('revoking the host screen permission disables the one-shot calibration until access returns', async t => {
  const p = await panel(t, { detection: { language: 'zh-CN', nickname: 'FixturePlayer' }, loot: { enabled: false } });
  await p.click(play);
  await p.click(jump('combatRegions'));
  const capture = p.el('[data-calibration-action="suggest"]');
  assert.equal(capture.disabled, false);
  await p.permit(false);
  assert.equal(capture.disabled, true);
  await p.permit(true);
  assert.equal(capture.disabled, false);
  assert.deepEqual(p.calibrationCalls, []);
});

test('standalone setup grants one-shot calibration and closing setup revokes the grant', async t => {
  const p = await panel(t, { standalone: true, detection: { language: 'zh-CN' }, loot: { enabled: false } });
  const grant = '[data-source-grant]', capture = '[data-calibration-action="suggest"]';
  await p.click(play);
  await p.click(jump('combatRegions'));
  assert.equal(p.el(capture).disabled, true);
  await p.edit('.delta-screen-permission select', display.id);
  await p.click(grant);
  assert.equal(p.el(capture).disabled, false);
  assert.ok(p.requests.includes('prepareCalibration'));
  await p.click(action('close'));
  assert.ok(p.requests.includes('cancelCalibration'));
  assert.ok(!p.requests.includes('startStandalone'));
  await p.click(play);
  assert.equal(p.el(capture).disabled, true);
  assert.deepEqual(p.calibrationCalls, []);
});

test('standalone play with complete settings confirms the selected display before starting', async t => {
  const p = await panel(t, { standalone: true, detection: { enabled: false }, loot: { language: 'zh-CN', calibration: lootAreas } });
  await p.click(play);
  assert.equal(p.el(wizard).hidden, true);
  assert.equal(p.el('[data-source-grant]').closest('[hidden]'), null);
  const pauseNote = p.el('[data-capture-pause]');
  assert.equal(pauseNote.closest('[hidden]'), null);
  assert.equal(pauseNote.textContent, captureText('zh').pauseCapture);
  assert.equal(p.el(overall).dataset.observerOverall, 'permission');
  assert.equal(p.requests.includes('startStandalone'), false);
  await p.edit('.delta-screen-permission select', display.id);
  await p.click('[data-source-grant]');
  await waitUntil(() => p.el(play).dataset.mode === 'pause');
  assert.equal(p.el('[data-capture-pause]').closest('[hidden]'), null);
  assert.equal(p.el('[data-capture-pause]').textContent, captureText('zh').pauseCapture);
  assert.deepEqual(p.requests.filter(op => op === 'startStandalone'), ['startStandalone']);
  assert.equal(p.requests.includes('prepareCalibration'), false);
  await p.click(play);
  await waitUntil(() => p.el(play).dataset.mode === 'start');
  assert.equal(p.el(overall).dataset.observerOverall, 'paused');
});
test('changing resolution on the same standalone display returns to area calibration before observing', async t => {
  const oldDisplay = { ...display, bounds: { ...display.bounds, width: 1280, height: 720 } };
  const p = await panel(t, { standalone: true, detection: { enabled: false },
    loot: { language: 'zh-CN', calibration: { ...lootAreas, display: oldDisplay } } });
  await p.click(play);
  await p.edit('.delta-screen-permission select', display.id);
  await p.click('[data-source-grant]');
  assert.equal(p.el(wizard).hidden, false);
  assert.equal(p.el(jump('lootRegions')).closest('[hidden]'), null);
  assert.equal(p.requests.includes('startStandalone'), false);
  assert.equal(p.requests.includes('prepareCalibration'), false);
  assert.deepEqual(p.calibrationCalls, []);
});