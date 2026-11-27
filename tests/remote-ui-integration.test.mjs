import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import jpeg from 'jpeg-js';
import { LANGUAGES } from 'cortico/core/language.ts';
import { createWebUi } from 'cortico/web/client/ui/index.ts';
import { WorldAssembly } from 'cortico/world.ts';
import { deltaDefinition, DELTA_DEFAULTS } from '../src/index.ts';
import { calibrationText } from '../src/console/strings-calibration.ts';
import { calibrationGuideText } from '../src/console/strings-calibration-guide.ts';

const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/console/observer.ts', import.meta.url))],
  bundle: true, format: 'iife', globalName: 'observerPanel', platform: 'browser', write: false, loader: { '.css': 'empty' } });
const display = { id: 'fixture', name: 'Fixture display', primary: true, systemNumber: 1,
  bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1, rotation: 0 };
const source = { display, topologyRevision: 'fixture' };

async function panel(t, language = 'zh') {
  const directory = await mkdtemp(join(tmpdir(), 'delta-remote-ui-'));
  const path = join(directory, 'config.json'), cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  cfg.detection = { ...cfg.detection, enabled: true, language: 'zh-CN' };
  cfg.loot = { ...cfg.loot, enabled: true, language: 'zh-CN' };
  const config = { worlds: { delta: cfg } };
  await writeFile(path, JSON.stringify(config));
  const binding = { version: 1, snapshot: () => ({ revision: 'fixture', displayId: display.id, viewEnabled: true,
    observationEnabled: true, viewPermitted: true, corePaused: false, outputAvailable: true }) };
  const frame = { ...source, frameId: 'sample', capturedAt: new Date().toISOString(), mime: 'image/jpeg', width: 64, height: 36,
    transform: { originX: 0, originY: 0, scaleX: 64 / display.bounds.width, scaleY: 36 / display.bounds.height } };
  const calibrationOperation = async ({ kind }) => kind === 'calibration-source' ? { status: 'source', source }
    : { status: 'ready', capture: { frame, jpeg: jpeg.encode({ width: frame.width, height: frame.height,
      data: Buffer.alloc(4 * frame.width * frame.height, 200) }).data } };
  const assembly = new WorldAssembly({ rootDir: directory, dataDir: directory, config },
    [deltaDefinition({ binding, calibrationOperation })], ['delta']);
  const world = assembly.slot('delta').instance;
  await world.start({ modelFacts: { accepts: () => true }, log: { warn() {}, child() { return this; } } });
  const dom = new JSDOM('<body></body>', { pretendToBeVisual: true, runScripts: 'outside-only' });
  dom.window.URL.createObjectURL = URL.createObjectURL;
  dom.window.URL.revokeObjectURL = URL.revokeObjectURL;
  const { observerView } = dom.window.eval(bundle.outputFiles[0].text + '\nobserverPanel');
  const { document, AbortController } = dom.window, abort = new AbortController();
  t.after(async () => { abort.abort(); dom.window.close(); await world.stop(); await rm(directory, { recursive: true, force: true }); });
  const ui = createWebUi({ doc: document, overlayHost: document.body, signal: abort.signal,
    memo: { get: (_key, fallback) => fallback, set() {} } });
  const rpc = world.webUi(language);
  const view = observerView({ language, ui, signal: abort.signal, interval() {}, availability: async () => ({ kind: 'active' }),
    invoke: (method, args) => rpc.invoke('observer', method, args), invokePreviewBinary: async frameId => {
      const result = await rpc.invoke('observer', 'detectionPreviewImage', [frameId]);
      return new Blob([Buffer.from(result.$binary.base64, 'base64')], { type: 'image/jpeg' });
    } });
  document.body.append(view);
  await new Promise(resolve => setImmediate(resolve));
  const el = selector => { const found = view.querySelector(selector); assert(found, selector); return found; };
  el('[data-observer-play]').click();
  return { el, dom, view, cfg: async () => JSON.parse(await readFile(path, 'utf8')).worlds.delta };
}

for (const language of LANGUAGES) {
  test('calibration guide renders local diagrams and labeled regions in ' + language, async t => {
    const p = await panel(t, language), T = calibrationGuideText(language);
    const guide = p.el('.delta-calibration-guide'); guide.open = true;
    assert.equal(guide.querySelector('summary').textContent, T.summary);
    assert(guide.textContent.includes(T.schematic));
    assert.equal(guide.querySelectorAll('[role="img"]').length, 2);
    assert.equal(guide.querySelectorAll('.delta-quick-region').length, 4);
    assert.equal(guide.querySelector('img, iframe, [src]'), null);
    assert.equal(p.el('[data-observer-play]').getAttribute('aria-label').length > 0, true);
    assert.equal(p.el('[data-quick-setup]').hidden, false);
    assert.equal(p.view.querySelector('[data-identity-action="suggest"]'), null);
  });
}

async function calibrate(p) {
  p.el('[data-calibration-action="suggest"]').click();
  const deadline = Date.now() + 6500;
  while (p.el('[data-calibration-status]').dataset.calibrationStatus !== 'saved' && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(p.el('[data-calibration-status]').dataset.calibrationStatus, 'saved');
}

test('closing a saved preview leaves persisted calibration intact and restores its guide', async t => {
  const p = await panel(t); await calibrate(p);
  const saved = await p.cfg(); assert(saved.detection.calibration && saved.loot.calibration);
  assert.equal(p.el('.delta-calibration-guide').hidden, true);
  const close = p.el('[data-calibration-action="cancel"]');
  assert.equal(close.hidden, false); assert.equal(close.textContent, calibrationText('zh').closePreview);
  close.click();
  assert.equal(p.el('.delta-quick-preview').hidden, true);
  assert.equal(p.el('.delta-calibration-guide').hidden, false);
  assert.deepEqual(await p.cfg(), saved);
  assert.equal(p.el('[data-observer-play]').dataset.mode, 'start');
});

test('a failed saved-preview image retains the successful calibration and allows manual adjustment', async t => {
  const p = await panel(t); await calibrate(p);
  const saved = await p.cfg();
  p.el('.delta-quick-preview img').dispatchEvent(new p.dom.window.Event('error'));
  assert.equal(p.el('[data-calibration-status]').dataset.calibrationStatus, 'saved');
  assert.equal(p.el('[data-calibration-status]').textContent, calibrationText('zh').previewFailed);
  const manual = p.el('[data-calibration-action="manual"]'); assert.equal(manual.hidden, false); manual.click();
  assert.equal(p.el('details[data-observer-section="calibration"]').open, true);
  assert.deepEqual(await p.cfg(), saved);
});
